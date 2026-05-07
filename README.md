# Interview Evaluation System

Production-grade interview evaluation platform that orchestrates candidate onboarding, exams, scheduling, and auditability across HR and admin workflows.

## Problem statement
Hiring pipelines often fragment across spreadsheets, email threads, and point tools. This project centralizes candidate intake, exam delivery, scheduling, and reporting with strict access control and traceability, so HR teams can run multi-round drives reliably and defensibly.

## Key features
- Authentication with access governance: JWT auth with refresh tokens, RBAC, and location-gated candidate access
- User and role management: dynamic role assignment, activation controls, and modular permission configuration
- Drive and exam orchestration: drive rounds, exam centers, activation toggles, and section-based exam builder
- Candidate exam flow: timed quiz experience, auto-submission, and basic anti-cheat safeguards
- Scheduling and workflow automation: interviewer timelines, availability tracking, auto-scheduling, and status monitoring
- Analytics and reporting: dashboards with performance insights and exportable Excel reports
- Audit logging: centralized admin/system action tracking with search and filters
- Candidate management: registration with multi-document upload and password reset

## Architecture overview
The system is split into a React client and a Node/Express API server backed by MongoDB.

Frontend to backend flow:
1. React (Vite + Tailwind) handles HR/admin and candidate workflows.
2. API calls go through a modular REST layer in Express with auth middleware.
3. JWT access tokens authorize requests; refresh tokens extend sessions securely.
4. Mongoose models encapsulate domain entities (users, roles, drives, exams, schedules, audit logs).
5. Responses hydrate dashboards, reports, and operational views in the client.

## Tech stack
- Backend: Node.js, Express, MongoDB (Mongoose)
- Frontend: React, Vite, Tailwind CSS
- Deployment: Vercel (frontend), Render (backend)

## Core engineering highlights
### RBAC design
Roles and permissions are modeled as first-class entities. Authorization is enforced via middleware that maps routes to required permissions, enabling dynamic updates to role capabilities without code changes.

### Analytics system
Operational data from drives, exams, and scheduling is aggregated for dashboards and exported reports. The system focuses on accuracy and traceability, ensuring that reporting reflects the same source-of-truth data used by operational flows.

### Audit logging system
Admin and system actions are recorded centrally with consistent metadata. Logs are queryable and filterable to support investigations, compliance needs, and debugging of operational workflows.

## API design approach
The backend is a RESTful API organized by resource domains (auth, users/roles, drives, exams, schedules, analytics). Each domain is encapsulated via controllers, routes, and middleware to keep access checks and validation consistent and testable.

## Deployment details
- Frontend is deployed to Vercel from the `frontend` app build output.
- Backend is deployed to Render as a Node service with environment variables for MongoDB, auth, and integrations.

## Setup instructions
Prerequisites:
- Node.js 18+
- MongoDB (local or hosted)

Backend:
```
cd backend
npm install
npm run dev
```

Frontend:
```
cd frontend
npm install
npm run dev
```

Environment:
Create `.env` files in `backend/` and `frontend/` using your local values.

## Future improvements
- Add fine-grained audit log retention policies and export pipelines
- Introduce structured exam proctoring signals for stronger integrity checks
- Expand analytics with cohort-level comparisons and longitudinal trends
- Harden rate limiting and anomaly detection for auth and exam endpoints
- Add API contract tests to prevent backward incompatible changes

## Screenshots
- Dashboard overview
- <img width="1579" height="897" alt="image" src="https://github.com/user-attachments/assets/0823b2d1-ff65-4320-af6d-2d84da1f0ab0" />

- Drive management (placeholder)
- <img width="1597" height="894" alt="image" src="https://github.com/user-attachments/assets/26a286fe-f1d1-479a-950a-e3515b6bc0e2" />

- Exam builder (placeholder)
- <img width="1577" height="899" alt="image" src="https://github.com/user-attachments/assets/ba534517-7486-4b46-b6f1-7a43cb4abdae" />
