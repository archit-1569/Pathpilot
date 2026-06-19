import sys
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path("backend").resolve()))

from app.db.session import SessionLocal
from app.models.auth import User, Profile
from app.core.security import hash_password

def setup():
    from sqlalchemy import text
    from app.db.session import engine
    from app.db.base import Base
    import app.models  # ensure models are registered
    import app.models.skills
    
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;"))
            conn.commit()
        except Exception as e:
            print("Column might already exist or error:", e)
            conn.rollback()

        try:
            conn.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;"))
            conn.commit()
        except Exception as e:
            print("Error dropping constraint:", e)
            conn.rollback()

    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if admin exists
    admin = db.query(User).filter(User.email == "nagar.archit69@gmail.com").first()
    if not admin:
        admin = User(
            email="nagar.archit69@gmail.com",
            password_hash=hash_password("Archit@BU2457"),
            role="superadmin",
            is_active=True,
            is_verified=True
        )
        admin.profile = Profile(name="Archit Nagar", skills=[], interests=[], certifications=[])
        db.add(admin)
    
    # Check if a test student exists
    student = db.query(User).filter(User.email == "teststudent@example.com").first()
    if not student:
        student = User(
            email="teststudent@example.com",
            password_hash=hash_password("student123"),
            role="student",
            is_active=True,
            is_verified=True
        )
        student.profile = Profile(name="Test Student", skills=[], interests=[], certifications=[])
        db.add(student)
        
    db.commit()
    print("Seed complete.")
    db.close()

if __name__ == "__main__":
    setup()
