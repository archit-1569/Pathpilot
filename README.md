# PathPilot AI - Phase 2

Phase 2 adds JWT authentication and student profile management to the Phase 1 foundation.

## Run the frontend

From the project root, run:

```bat
.\start.cmd
```

This launches both services in the same terminal:

- Frontend: `http://localhost:8000`
- Backend API: `http://localhost:8001`
- API documentation: `http://localhost:8001/docs`

You can also open `index.html` directly. Do not try to run `styles.css`; CSS files are loaded by the HTML page and cannot run by themselves.

`start.cmd` works even when PowerShell script execution is disabled. Keep its terminal open while using the website. Press `Ctrl+C` once to stop both services.

## Current scope

- Responsive landing page and dashboard preview
- Separate HTML, CSS, and JavaScript files
- Dark mode, mobile navigation, global search, and reveal animations
- PostgreSQL schema and FastAPI backend
- JWT registration, login, and current-user authentication
- Development password-reset flow
- Student profile viewing, editing, and account deletion
- Connected registration, login, password reset, and profile pages

Later phases will implement recommendation APIs, career explorer, skill gap analysis, roadmaps, exams, AI mentor, resume analyzer, and admin tools.

## Run only the backend

Ensure PostgreSQL is running and `backend/.env` contains a valid `DATABASE_URL`, then run:

```bat
.\backend\start.cmd
```

API documentation is available at `http://localhost:8001/docs`. Database status is available at `http://localhost:8001/api/v1/health`.
