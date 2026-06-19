import re
from typing import Any
from app.ml.recommender import get_knowledge_base

class ResumeAnalyzer:
    def __init__(self):
        self.kb = get_knowledge_base()
        self.career_records = self.kb.records

    def analyze(self, resume_text: str, target_career: str) -> dict[str, Any]:
        resume_lower = resume_text.lower()
        
        # 1. Find the target career (fuzzy match)
        record = next((r for r in self.career_records if target_career.lower() in r["name"].lower()), None)
        # If still not found, try word-level intersection
        if not record:
            target_words = set(target_career.lower().split())
            record = next((r for r in self.career_records if target_words & set(r["name"].lower().split())), None)
        if not record:
            return {
                "score": 0,
                "matching_skills": [],
                "missing_skills": [],
                "formatting_feedback": [f"Could not find career '{target_career}' in our database."]
            }
            
        career_skills = record.get("top_skills", list(record["skills"]))
        
        # 2. Extract matching skills
        matching_skills = []
        resume_words = set(re.findall(r'\w+', resume_lower))
        resume_stems = {w[:5] for w in resume_words if len(w) > 3}
        
        for skill in career_skills:
            # Clean skill: remove parentheticals, the word "skills", and extra spaces
            clean_skill = re.sub(r'\(.*?\)', '', skill)
            clean_skill = re.sub(r'\bskills?\b', '', clean_skill, flags=re.IGNORECASE)
            clean_skill = re.sub(r'[^\w\s]', ' ', clean_skill).strip().lower()
            clean_skill = re.sub(r'\s+', ' ', clean_skill)
            
            if not clean_skill:
                continue

            # 1. Exact Substring Match (handles simple cases and C++)
            if clean_skill in resume_lower or skill.lower() in resume_lower:
                matching_skills.append(skill)
                continue
                
            # 2. Stem-based Word Intersection (handles "analytic" vs "analytical")
            skill_words = set(clean_skill.split())
            skill_stems = {w[:5] for w in skill_words if len(w) > 3}
            
            # If the skill has significant words and ALL of them are in the resume
            if skill_stems and skill_stems.issubset(resume_stems):
                matching_skills.append(skill)
                
        # 3. Calculate Missing Skills
        matching_set = set(matching_skills)
        missing_skills = [s for s in career_skills if s not in matching_set]
        
        # We only care about the top 20 skills for scoring so it's achievable
        total_relevant = min(len(career_skills), 20)
        found_relevant = len([s for s in matching_skills if s in career_skills[:total_relevant]])
        
        score = int((found_relevant / total_relevant) * 100) if total_relevant > 0 else 0
        
        # 4. Formatting Feedback
        feedback = []
        if len(resume_text.split()) < 100:
            feedback.append("Your resume seems very short. Add more details about your projects and experiences.")
        if "achiev" not in resume_lower and "award" not in resume_lower:
            feedback.append("Consider adding an 'Achievements' or 'Awards' section to stand out.")
        if "://" not in resume_lower and "github" not in resume_lower and "linkedin" not in resume_lower:
            feedback.append("We didn't detect any links to your portfolio, GitHub, or LinkedIn. These are highly recommended.")
            
        if score < 50:
            feedback.append("Your ATS score is low for this role. Make sure you use the exact keywords listed in the 'Missing Skills' section.")
        elif score >= 80:
            feedback.append("Great job! Your resume is highly optimized for this role.")
            
        return {
            "score": min(score, 100),
            "matching_skills": matching_skills[:15],
            "missing_skills": missing_skills[:15], # Return top 15 missing in frequency order
            "formatting_feedback": feedback
        }

resume_analyzer = ResumeAnalyzer()
