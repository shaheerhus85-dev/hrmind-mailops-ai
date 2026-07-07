# HRMind MailOps AI — Recruiter Operations Workspace

## Overview

HRMind MailOps AI is a portfolio proof-of-work by Shaheer Hussain Jafri for recruiter operations tooling.

The project explores how a focused recruiter workspace could bring together inbox triage, candidate context, interview preparation, reply drafting, and safety guardrails. It is presented as a product prototype and engineering case study, not as a launched SaaS product.

## The problem

Recruiters often work with scattered information and sensitive communication workflows:

- candidate emails arrive in busy inboxes;
- resumes, role requirements, policy details, and follow-up context live across separate tools;
- reply drafts are recreated manually;
- interview preparation is often disconnected from candidate review;
- hiring communication requires careful judgment and human oversight.

This creates friction. Recruiters have to reconstruct context, prioritize urgent work, and avoid risky communication mistakes while moving quickly.

## Product direction

The product direction is a recruiter operations workspace centered on the daily hiring workflow.

HRMind MailOps AI is organized around:

- inbox triage;
- candidate review;
- interview kits;
- reply drafts;
- workspace settings and safety guardrails.

The intent is not to replace recruiter judgment. The intent is to make recruiter operations clearer, safer, and easier to review.

## What I built

This proof-of-work includes:

- polished Next.js frontend demo;
- dashboard overview;
- inbox triage;
- candidate review;
- interview kits;
- reply drafts;
- Settings and guardrails;
- local RAG metadata staging;
- FastAPI backend foundation;
- PostgreSQL schema, migrations, seed data, and verified API routes.

The frontend currently runs as a safe local demo workspace. The backend foundation is implemented and locally verified, with the frontend adapter prepared for future API integration.

## Key screens

### Dashboard overview

![Dashboard overview](screenshots/dashboard.png)

### Inbox Triage

![Inbox Triage](screenshots/inbox-triage.png)

### Candidate Review

![Candidate Review](screenshots/candidate-review.png)

### Interview Kits

![Interview Kits](screenshots/interview-kits.png)

### Reply Drafts

![Reply Drafts](screenshots/reply-drafts.png)

### Workspace Settings

![Workspace Settings](screenshots/settings.png)

### Backend health/API

![Backend health API](screenshots/backend-health.png)

## Safety and guardrails

HRMind MailOps AI is designed around recruiter control and conservative automation boundaries.

- No automatic email sending.
- No automatic hiring decisions.
- No Gmail mailbox mutation.
- Human review required.
- Draft-only workflow.
- Local demo data only.

The current demo does not connect to a real Gmail inbox, does not mutate mailbox data, does not send email, and does not make final candidate decisions.

## Technical architecture

### Frontend

The frontend is built with:

- Next.js;
- React;
- TypeScript;
- local demo adapter;
- localStorage persistence.

The local demo adapter keeps the workspace usable when the backend is offline. It stores demo workspace state, Settings preferences, draft edits, and local RAG metadata in the browser.

### Backend

The backend foundation is built with:

- FastAPI;
- PostgreSQL;
- SQLAlchemy;
- Alembic;
- Pydantic;
- seeded demo data;
- verified API routes.

The backend includes models, schemas, migrations, seed data, and routes for workspaces, settings, email threads, candidates, drafts, interview kits, RAG source metadata, and audit logs.

## Current status

Current state:

- frontend demo is polished and working;
- backend foundation is implemented and locally verified;
- PostgreSQL schema, migrations, seed data, and API routes are in place;
- frontend is not fully connected to the FastAPI backend yet;
- Gmail, AI classification, real RAG indexing, file storage, and email sending are not live yet.

This is a portfolio proof-of-work with clear next phases, not a launched recruiting platform.

## Next roadmap

Planned next phases:

- connect frontend adapter to FastAPI;
- add private workspace auth;
- add readonly Gmail import;
- add Gemini/Groq AI classification and draft generation;
- add RAG indexing;
- expand audit logs;
- strengthen deployment, observability, and security hardening.

## What this project demonstrates

HRMind MailOps AI demonstrates:

- product thinking;
- UI/UX execution;
- workflow automation thinking;
- backend architecture foundation;
- safety-first AI system design.

The project is intentionally honest about what works today and what remains planned for later phases.
