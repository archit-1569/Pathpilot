"""
PathPilot AI – Career Recommendation Engine (Phase 3)

Algorithm:
  1. Load career_recommender.csv (1,195 survey responses).
  2. Map each row's job title to one of ~15 clean career clusters.
  3. Aggregate all skills + interests per cluster to build a career knowledge base.
  4. At query time, vectorise the user's profile and every career cluster using
     TF-IDF, compute cosine similarity, then apply bonus modifiers.
  5. Return ranked results with match_pct, matched_skills, and skill_gaps.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# --------------------------------------------------------------------------- #
# Paths                                                                        #
# --------------------------------------------------------------------------- #
_FILE_DIR = Path(__file__).resolve()
# Try 4 levels up (project root when running normally: backend/app/ml/recommender.py)
# then 3 levels up (project root when pytest cwd is backend/)
_CSV_CANDIDATES = [
    _FILE_DIR.parents[3] / "career_recommender.csv",  # normal runtime
    _FILE_DIR.parents[2] / "career_recommender.csv",  # pytest from backend/
    _FILE_DIR.parents[4] / "career_recommender.csv",  # fallback
]
_CSV_PATH = next((p for p in _CSV_CANDIDATES if p.exists()), _CSV_CANDIDATES[0])

# --------------------------------------------------------------------------- #
# Career cluster mapping                                                        #
# --------------------------------------------------------------------------- #
# Each entry: (regex pattern, canonical career name, short description)
_CLUSTER_RULES: list[tuple[str, str, str]] = [
    (r"web.?dev|ui.?dev|ux.?dev|front.?end",
     "Web / UI Developer",
     "Create responsive, accessible interfaces for web and mobile browsers."),
    (r"software|developer|programmer|coder|backend|frontend|full.?stack",
     "Software Developer",
     "Design, build, and maintain software applications and systems."),
    (r"data.?sci|machine.?learn|ml.?engin|ai.?engin|deep.?learn",
     "Data Scientist / ML Engineer",
     "Build predictive models and derive insights from large datasets."),
    (r"data.?analyt|business.?analyt|data.?analyst",
     "Data Analyst",
     "Analyse data to support business decision-making using SQL and BI tools."),
    (r"data.?engin",
     "Data Engineer",
     "Design and maintain data pipelines, warehouses, and ETL workflows."),
    (r"network|sysadmin|system.?admin|infra|devops|cloud.?engin|site.?reliab",
     "DevOps / Cloud Engineer",
     "Automate infrastructure, CI/CD pipelines, and cloud deployments."),
    (r"teach|professor|educat|instruct|academic",
     "Education & Teaching",
     "Educate students at school, college, or training-centre level."),
    (r"finance|account|invest|bank|wealth|audit|chartered",
     "Finance & Accounting",
     "Manage financial planning, auditing, banking, or investment portfolios."),
    (r"market|sales|business.?dev|brand|advertis|digital.?market",
     "Sales & Marketing",
     "Drive revenue through sales strategy, brand development, and campaigns."),
    (r"mechanic|civil|product|manufactur|plant|embed|vlsi|hardware|electronic",
     "Core Engineering",
     "Apply domain engineering knowledge in mechanical, civil, or electronics fields."),
    (r"manag|operation|product.?manag|project.?manag|scrum|agile",
     "Management & Operations",
     "Lead teams, projects, and business units towards strategic goals."),
    (r"research|scientist|r&d|bioinform|biotechn|pharma|lab",
     "Research & Science",
     "Conduct experiments, publish findings, and advance knowledge in a domain."),
    (r"human.?resource|hr|recruit|talent|people.?manag",
     "Human Resources",
     "Attract, retain, and develop talent within organisations."),
    (r"content|writ|journal|media|communicat|public.?relat",
     "Content & Communication",
     "Create written, visual, or verbal content for audiences or organisations."),
    (r"govern|civil.?serv|upsc|ias|ips|psc|defence|army|police|bank.?po",
     "Government / Civil Services",
     "Serve in public administration, defence, or regulated banking sectors."),
]

_DEFAULT_CLUSTER = "General Professional"
_DEFAULT_DESC = "A broad professional role combining multiple domain skills."


def _infer_cluster(title: str) -> tuple[str, str]:
    """Return (canonical_name, description) for a raw job-title string."""
    t = str(title).lower().strip()
    if not t or t in {"na", "nan", "none", "student (unemployed)", "housewife", "no"}:
        return (_DEFAULT_CLUSTER, _DEFAULT_DESC)
    for pattern, name, desc in _CLUSTER_RULES:
        if re.search(pattern, t, re.IGNORECASE):
            return (name, desc)
    return (_DEFAULT_CLUSTER, _DEFAULT_DESC)


_BLACKLIST = {
    "analytical skills", "analytical thinking", "communication skills", "communication",
    "problem solving", "logical reasoning", "active listening", "corporate communication",
    "amcat corporate communications", "analytical thinking skills", "basic computer skills",
    "attention to detail", "analytical", "quantitative aptitude", "written communication",
    "team work", "teamwork", "flexibility", "hard working", "time management",
    "leadership", "critical thinking", "creativity", "interpersonal skills",
    "decision making", "work under pressure", "adaptability", "organization",
    "collaboration", "presentation skills", "public speaking", "analytic thinking",
    "amcat", "amcat certified", "amcat certified scientist", "business knowledge",
    "business skills", "general knowledge", "verbal ability", "english", "soft skills",
    "good communication", "appliedai", "applied ai", "accounting skills", "litigation",
    "2d/3d animation", "3d animation", "2d platform game", "3d battle tank game",
    "battle tank game", "platform game", "nan", "none", "n/a", "etc", "skills", "knowledge",
    "basic", "computer", "aptitude", "certified", "level", "learning", "skills to build",
    "you have", "you need", "mastered", "roadmap"
}

_SYNONYMS = {
    "powerbi": "power bi",
    "power-bi": "power bi",
    "ms power bi": "power bi",
    "exel": "excel",
    "ms excel": "excel",
    "microsoft excel": "excel",
    "postgres": "postgresql",
    "cpp": "c++",
    "c plus plus": "c++",
    "ml": "machine learning",
    "machinelearning": "machine learning",
    "ai": "artificial intelligence",
    "artificialintelligence": "artificial intelligence",
    "javascript": "javascript",
    "js": "javascript",
    "typescript": "typescript",
    "ts": "typescript",
    "reactjs": "react",
    "react.js": "react",
    "nodejs": "node.js",
    "node": "node.js",
    "mongodb": "mongodb",
    "mongo": "mongodb",
    "html5": "html",
    "css3": "css",
    "dev ops": "devops",
    "dev-ops": "devops",
    "tailwindcss": "tailwind css",
    "tailwind-css": "tailwind css",
    "tailwind": "tailwind css",
    "vuejs": "vue.js",
    "vue": "vue.js"
}


def _is_noise(token: str) -> bool:
    t = token.lower().strip()
    if t in _BLACKLIST:
        return True
    if len(t) <= 2 or t.isdigit():
        return True
    for word in ["amcat", "analytical", "communication", "listening", "thinking", "aptitude", "soft skill", "interpersonal", "written", "verbal"]:
        if word in t:
            return True
    return False


def _normalize_token(token: str) -> str:
    t = token.lower().strip()
    return _SYNONYMS.get(t, t)


def _tokenise(text: str) -> list[str]:
    """Split a semicolon / comma / newline separated skills string into tokens."""
    if not text or str(text).lower() in {"nan", "no", "none", "na"}:
        return []
    tokens = re.split(r"[;,\n]+", str(text))
    result = []
    for t in tokens:
        cleaned = t.strip().lower()
        if not _is_noise(cleaned):
            result.append(_normalize_token(cleaned))
    return result


# --------------------------------------------------------------------------- #
# Knowledge base                                                                #
# --------------------------------------------------------------------------- #
class CareerKnowledgeBase:
    """Holds the per-cluster aggregated skill/interest vocabulary."""

    def __init__(self, records: list[dict[str, Any]]) -> None:
        # records: [{name, description, skills: set[str], interests: set[str], count}]
        self.records = records
        self._names = [r["name"] for r in records]
        # Build TF-IDF corpus: one document per career (skills + interests joined)
        corpus = [" ".join(r["skills"] | r["interests"]) for r in records]
        self._vectorizer = TfidfVectorizer(analyzer="word", token_pattern=r"[^\s]+", ngram_range=(1, 2))
        self._career_matrix = self._vectorizer.fit_transform(corpus)

    # ------------------------------------------------------------------ #
    def recommend(
        self,
        *,
        skills: list[str],
        interests: list[str],
        cgpa: float | None = None,
        certifications: list[str] | None = None,
        top_n: int = 5,
    ) -> list[dict[str, Any]]:
        """Score the user profile against every career cluster and return top-N."""
        user_tokens = [t.lower().strip() for t in (skills + interests) if t.strip()]
        user_tokens = [_normalize_token(t) for t in user_tokens if not _is_noise(t)]
        
        if not user_tokens:
            # Fall back to generic ordering by cluster size (survey popularity)
            sorted_recs = sorted(self.records, key=lambda r: r["count"], reverse=True)
            return [self._build_result(r, 50.0, [], skills, interests) for r in sorted_recs[:top_n]]

        user_doc = " ".join(user_tokens)
        user_vec = self._vectorizer.transform([user_doc])
        sims = cosine_similarity(user_vec, self._career_matrix)[0]  # shape (n_careers,)

        user_set = set(user_tokens)

        # ---- bonus modifiers ----------------------------------------- #
        results: list[dict[str, Any]] = []
        for idx, sim in enumerate(sims):
            record = self.records[idx]
            career_skills = record["skills"]
            career_interests = record["interests"]
            career_total_set = career_skills | career_interests
            
            # Intersection ratio (how many of user's skills are relevant)
            matches_count = len(user_set & career_total_set)
            intersection_ratio = matches_count / len(user_set) if user_set else 0.0
            
            # Weighted match percentage (80% intersection ratio + 20% cosine similarity)
            combined_score = 0.2 * float(sim) + 0.8 * intersection_ratio
            pct = combined_score * 100
            
            # Lift score for high match densities to be more user-friendly
            if intersection_ratio >= 0.4:
                pct = max(pct, 65.0 + (intersection_ratio - 0.4) * 50.0)

            # CGPA bonus: every point above 6.0 gives +1 pp (capped at +10)
            if cgpa and cgpa > 6.0:
                pct += min((cgpa - 6.0) * 1.0, 10.0)

            # Certification matching boost
            if certifications:
                cert_boost = 0.0
                for cert in certifications:
                    c_clean = cert.lower().strip()
                    if c_clean and not _is_noise(c_clean):
                        # Match certification keywords to the career name (e.g. "analyst" in "data analyst")
                        career_words = {w for w in record["name"].lower().split() if len(w) > 3}
                        if any(word in c_clean for word in career_words):
                            cert_boost += 15.0
                        else:
                            # general certification bonus
                            cert_boost += 2.0
                pct += min(cert_boost, 25.0)

            pct = min(round(pct, 1), 99.0)  # cap at 99 to feel realistic
            results.append(
                self._build_result(record, pct, user_tokens, skills, interests)
            )

        results.sort(key=lambda r: r["match_pct"], reverse=True)
        return results[:top_n]

    # ------------------------------------------------------------------ #
    def _build_result(
        self,
        record: dict[str, Any],
        pct: float,
        user_tokens: list[str],
        raw_skills: list[str],
        raw_interests: list[str],
    ) -> dict[str, Any]:
        career_skills = record["skills"]
        user_set = {t.lower().strip() for t in user_tokens}
        user_skill_set = {_normalize_token(s) for s in raw_skills if s.strip()}
        user_interest_set = {_normalize_token(i) for i in raw_interests if i.strip()}

        matched = sorted(career_skills & (user_skill_set | user_interest_set))
        gaps = sorted(career_skills - user_set)[:8]  # top 8 gaps

        return {
            "career_name": record["name"],
            "description": record["description"],
            "match_pct": pct,
            "matched_skills": matched[:10],
            "skill_gaps": gaps,
            "survey_count": record["count"],
        }

    # ------------------------------------------------------------------ #
    def get_skill_gaps(
        self,
        career_name: str,
        skills: list[str],
        interests: list[str],
    ) -> dict[str, Any]:
        """Return detailed skill gap analysis for a specific career."""
        record = next((r for r in self.records if r["name"].lower() == career_name.lower()), None)
        if record is None:
            return {"error": f"Career '{career_name}' not found"}
            
        user_set = {_normalize_token(t) for t in (skills + interests) if t.strip()}
        career_skills = record["skills"]
        missing = sorted(career_skills - user_set)[:12]  # top 12 missing
        
        # Phase 4: Skill Importance & Sequence
        # Mock logic: determine importance by length or predefined keywords
        high_imp = {"python", "sql", "java", "c++", "machine learning", "data analysis", "react", "aws", "docker"}
        importance = {}
        for s in missing:
            if s.lower() in high_imp:
                importance[s] = "High"
            elif len(s) > 10:
                importance[s] = "Medium"
            else:
                importance[s] = "Low"
                
        # Sequence: High -> Medium -> Low
        sequence = sorted(missing, key=lambda x: (
            0 if importance[x] == "High" else 1 if importance[x] == "Medium" else 2,
            x
        ))

        return {
            "career_name": record["name"],
            "description": record["description"],
            "you_have": sorted(career_skills & user_set),
            "you_need": missing,
            "total_required_skills": len(career_skills),
            "skill_importance": importance,
            "learning_sequence": sequence
        }

    # ------------------------------------------------------------------ #
    def all_careers(self) -> list[dict[str, Any]]:
        return [
            {
                "career_name": r["name"],
                "description": r["description"],
                "typical_skills": sorted(r["skills"])[:15],
                "survey_count": r["count"],
                "overview": r.get("overview"),
                "eligibility": r.get("eligibility"),
                "salary_range": r.get("salary_range"),
                "responsibilities": r.get("responsibilities", []),
                "career_growth": r.get("career_growth"),
                "industries": r.get("industries", []),
                "learning_roadmap": r.get("learning_roadmap", []),
            }
            for r in self.records
        ]


# --------------------------------------------------------------------------- #
# CSV loader & factory                                                          #
# --------------------------------------------------------------------------- #
from collections import Counter

def _load_knowledge_base(csv_path: Path = _CSV_PATH) -> CareerKnowledgeBase:
    df = pd.read_csv(csv_path, encoding="utf-8", on_bad_lines="skip")

    job_col = [c for c in df.columns if "first Job title" in c or "job title" in c.lower()][0]
    skills_col = [c for c in df.columns if "skills" in c.lower()][0]
    interests_col = [c for c in df.columns if "interests" in c.lower()][0]
    cert_col = [c for c in df.columns if "certificate" in c.lower()][0]

    clusters: dict[str, dict[str, Any]] = {}
    for _, row in df.iterrows():
        name, desc = _infer_cluster(str(row.get(job_col, "")))
        if name not in clusters:
            clusters[name] = {"name": name, "description": desc, "skills_counter": Counter(), "interests_counter": Counter(), "count": 0}
        clusters[name]["skills_counter"].update(_tokenise(str(row.get(skills_col, ""))))
        clusters[name]["interests_counter"].update(_tokenise(str(row.get(interests_col, ""))))
        # Also absorb certification tokens as implicit skills
        clusters[name]["skills_counter"].update(_tokenise(str(row.get(cert_col, ""))))
        clusters[name]["count"] += 1

    # Extract top skills and remove noise
    for c in clusters.values():
        top_skills = [s for s, count in c["skills_counter"].most_common(40) if len(s) > 2]
        top_interests = [i for i, count in c["interests_counter"].most_common(20) if len(i) > 2]
        
        c["skills"] = set(top_skills)
        c["top_skills"] = top_skills # ordered list
        c["interests"] = set(top_interests)
        c["top_interests"] = top_interests # ordered list
        
        del c["skills_counter"]
        del c["interests_counter"]

    # Load Phase 4 seed data for deep details
    seed_path = _FILE_DIR.parents[2] / "data" / "career_details_seed.json"
    if seed_path.exists():
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_data = json.load(f)
            for c_name, c_data in clusters.items():
                if c_name in seed_data:
                    c_data.update(seed_data[c_name])

    records = sorted(clusters.values(), key=lambda r: r["count"], reverse=True)
    return CareerKnowledgeBase(records)


@lru_cache(maxsize=1)
def get_knowledge_base() -> CareerKnowledgeBase:
    """Singleton – loaded once at first call, cached forever."""
    return _load_knowledge_base()
