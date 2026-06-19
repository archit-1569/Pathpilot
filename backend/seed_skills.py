import asyncio
from app.db.session import SessionLocal
from app.models.careers import Career
from app.models.skills import Skill, CareerSkill
from sqlalchemy import select

def seed_skills():
    db = SessionLocal()
    try:
        careers = db.scalars(select(Career)).all()
        
        print("Extracting skills from existing careers...")
        skill_names = set()
        for c in careers:
            if c.typical_skills:
                for s in c.typical_skills:
                    skill_names.add(s.strip())
        
        print(f"Found {len(skill_names)} unique skills. Creating them...")
        
        # Create skills
        skill_objs = {}
        for name in skill_names:
            # Check if exists
            stmt = select(Skill).where(Skill.name.ilike(name))
            existing = db.execute(stmt).scalar()
            if existing:
                skill_objs[name.lower()] = existing
            else:
                s = Skill(name=name, category="Extracted Skill", description=f"Skill extracted from career definitions.")
                db.add(s)
                db.commit()
                db.refresh(s)
                skill_objs[name.lower()] = s
                
        # Link careers
        print("Linking skills to careers...")
        for c in careers:
            if c.typical_skills:
                for s_name in c.typical_skills:
                    skill = skill_objs.get(s_name.strip().lower())
                    if skill:
                        # Check if mapping exists
                        stmt = select(CareerSkill).where(
                            CareerSkill.skill_id == skill.id, 
                            CareerSkill.career_id == c.id
                        )
                        if not db.execute(stmt).scalar():
                            mapping = CareerSkill(skill_id=skill.id, career_id=c.id, importance=1)
                            db.add(mapping)
        
        db.commit()
        print("Skill seeding complete!")
        
    finally:
        db.close()

if __name__ == "__main__":
    seed_skills()
