# API Architecture

The production API will use FastAPI, SQLAlchemy, PostgreSQL, and JWT authentication.

## Route structure

```text
/api/v1/auth
/api/v1/profiles
/api/v1/careers
/api/v1/recommendations
/api/v1/skill-gaps
/api/v1/roadmaps
/api/v1/exams
/api/v1/resumes
/api/v1/chat
/api/v1/assessments
/api/v1/admin
```

## Backend modules

```text
backend/app/
  api/v1/
  core/
  db/
  models/
  schemas/
  services/
  repositories/
  ml/
  tests/
```

API responses should use Pydantic schemas, centralized error handling, validation, pagination, and OpenAPI documentation. Business logic belongs in services, while repositories own database access.

## Implemented in Phase 2

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/profiles/me`
- `PATCH /api/v1/profiles/me`
- `DELETE /api/v1/profiles/me`

The forgot-password endpoint currently returns a development reset token. Production deployment must deliver the token through an email provider instead.

## Implemented in Phase 3

- `GET /api/v1/careers` — list all derived career clusters
- `GET /api/v1/careers/{career_name}` — detail for a specific career
- `POST /api/v1/recommendations` — run the ML engine for the current user and persist results
- `GET /api/v1/recommendations/me` — fetch the latest saved recommendation set
- `GET /api/v1/skill-gaps?career=<name>` — skill gap breakdown for a specific career vs. user profile

The recommendation engine uses TF-IDF cosine similarity over a 1,195-response survey dataset (`career_recommender.csv`), applying CGPA and certification bonus modifiers. Results are cached in the `recommendations_phase3` database table.
