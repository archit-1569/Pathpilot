# PathPilot AI - Career Recommendation & Mentorship Portal

PathPilot AI is a comprehensive career guidance and mentorship portal designed to help students discover career matches, identify skill gaps, build personalized learning roadmaps, prepare for government exams, and interact with an AI Mentor.

## Features & Implemented Phases

1. **Authentication & Profile Management**
   - Secure registration and login using JWT-based token authentication.
   - OTP email verification for secure account creation and password resets.
   - Comprehensive student profile tracking skills, interests, CGPA, and professional certifications.

2. **ML Career Recommendation Engine**
   - Uses a TF-IDF vectorizer and cosine similarity on a 1,195-respondent survey dataset (`career_recommender.csv`) to map user profiles to 15 distinct career clusters.
   - Applies bonus modifiers for high CGPA and matching professional certifications.

3. **Personalized Roadmaps & Skill Gaps**
   - Detailed, stage-by-stage learning roadmaps for all 15 careers (from Beginner to Job Ready).
   - Case-insensitive, synonym-tolerant matching (e.g., `ReactJS` matches `React`, `tailwind` matches `Tailwind CSS`).
   - Dynamic progress tracking (e.g., "3 of 12 skills acquired").

4. **Exam Preparation Guide**
   - Curated database of prominent competitive government exams.
   - Direct matching between target careers and corresponding recommended exams.

5. **AI Resume Analyzer**
   - Upload or paste resume text to receive feedback, match scores, and gap identification against target career clusters.

6. **AI Mentor Chat**
   - Direct, context-aware chatbot interface powered by Gemini to answer career, learning, and skill-building queries.

7. **Admin Control Panel**
   - Independent Next.js / Tailwind dashboard for administrators to audit users, manage careers/exams, view telemetry analytics, and control system configuration settings.

---

## How to Run PathPilot AI

### Run Both Frontend & Backend (Recommended)
From the project root directory, run:
```bat
python run_pathpilot.py
```
This script automatically starts:
- **Student Frontend**: [http://localhost:8000](http://localhost:8000)
- **FastAPI Backend API**: [http://localhost:8001](http://localhost:8001)
- **API Documentation**: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## Technical Stack

- **Frontend**: Static HTML5, Vanilla CSS, and JavaScript.
- **Backend**: FastAPI, SQLAlchemy ORM, PostgreSQL database.
- **ML / AI**: Scikit-learn (TF-IDF, Cosine Similarity), Pandas, NumPy, and Google Gemini API.
- **Admin App**: Next.js, Tailwind CSS, TypeScript, and shadcn/ui.
