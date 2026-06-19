# Frontend Architecture

## Phase 1 implementation

The current frontend is a dependency-free prototype split into:

- `frontend/index.html`: semantic page structure
- `frontend/css/styles.css`: design system, responsive layouts, and themes
- `frontend/js/main.js`: navigation, search, dark mode, and animations

## Production migration

The production frontend described in the plan should use Next.js 15, React, TypeScript, Tailwind CSS, and ShadCN UI.

Suggested route groups:

```text
app/
  (public)/page.tsx
  (auth)/login/page.tsx
  (auth)/register/page.tsx
  dashboard/page.tsx
  careers/[id]/page.tsx
  skill-gap/page.tsx
  roadmaps/[id]/page.tsx
  exams/[id]/page.tsx
  mentor/page.tsx
  resume/page.tsx
  admin/page.tsx
```

Suggested shared modules:

```text
components/
  ui/
  layout/
  dashboard/
  careers/
  exams/
lib/
  api/
  auth/
  validation/
types/
```

Keep API access behind typed service modules, use server components by default, and use client components only for interactive UI.
