import asyncio
from app.db.session import SessionLocal
from app.models.careers import Career
from app.models.skills import CareerSkill
from app.ml.recommender import get_knowledge_base

def seed_careers():
    db = SessionLocal()
    try:
        kb = get_knowledge_base()
        careers = kb.all_careers()
        
        # Check and seed each career individually if missing
        added_count = 0
        for c_data in careers:
            c_name = c_data["career_name"]
            existing = db.query(Career).filter(Career.name == c_name).first()
            if not existing:
                print(f"Seeding missing career: {c_name}...")
                c = Career(
                    name=c_name,
                    description=c_data.get("description", ""),
                    typical_skills=c_data.get("typical_skills", []),
                    survey_count=c_data.get("survey_count", 0),
                    category="Technology",  # Defaulting since it doesn't exist in ML base
                    future_demand_score=85,
                    overview=c_data.get("overview", ""),
                    eligibility=c_data.get("eligibility", ""),
                    education_required="",
                    salary_range=c_data.get("salary_range", ""),
                    responsibilities=c_data.get("responsibilities", []),
                    career_growth=c_data.get("career_growth", ""),
                    industries=c_data.get("industries", []),
                    certifications=[],
                    learning_roadmap=c_data.get("learning_roadmap", [])
                )
                db.add(c)
                added_count += 1
        
        if added_count > 0:
            db.commit()
            print(f"Successfully seeded {added_count} missing careers!")
        else:
            print("All careers are already up-to-date in the database.")
            
    finally:
        db.close()

if __name__ == "__main__":
    seed_careers()
