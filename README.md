# HRMind MailOps AI

A human-reviewed recruiter operations workspace for organizing recruiter messages, candidate reviews, interview preparation, and reply drafts.

🔗 **Live Demo:** https://hrmind-mailops-ai.vercel.app  
🔗 **Portfolio:** https://shaheer-portfolio-three.vercel.app

---

## Problem

Recruiting workflows often become scattered across inboxes, candidate notes, interview preparation documents, and reply drafts.

This creates unnecessary manual work, inconsistent review processes, and difficulty keeping track of what requires recruiter attention.

HRMind brings these workflows into one structured workspace while keeping the recruiter in control of every important decision.

## What It Does

- Organizes recruiter messages in an Inbox Triage workspace
- Displays structured message context and workflow status
- Provides a Candidate Review workspace with scores, recommendations, and next steps
- Creates structured Interview Kits for recruiter preparation
- Provides multiple recruiter-facing Reply Draft options
- Supports Demo and authenticated Private workspaces
- Stores private workspace settings through the backend
- Enforces human-review and draft-only guardrails

## Current Product Status

The current version is a deployed portfolio proof-of-work system.

### Live

- Demo workspace
- Private signup and login
- JWT-based authentication
- PostgreSQL-backed private workspace settings
- Inbox Triage interface
- Candidate Review interface
- Interview Kits
- Reply Draft workflows
- Human-review guardrails
- Local RAG metadata staging
- Vercel frontend deployment
- Render backend deployment

### Not Connected Yet

- Gmail OAuth or live inbox import
- Live AI message classification
- Gemini-based candidate analysis
- RAG file uploading, indexing, or retrieval
- Automatic email sending
- Mailbox deletion, relabeling, or mutation

The system intentionally remains human-reviewed and draft-only.

## Tech Stack

**Frontend:**  
Next.js, React, TypeScript, custom responsive CSS

**Backend:**  
Python, FastAPI

**Database:**  
PostgreSQL through Neon

**Authentication:**  
JWT-based private workspace authentication

**Deployment:**  
Vercel for the frontend and Render for the backend

## How It Works

1. A user enters the Demo workspace or creates a Private workspace.
2. The Demo workspace loads structured recruiter workflow data for product exploration.
3. Private users authenticate through the FastAPI backend.
4. The recruiter moves between Inbox, Candidates, Interview Kits, and Reply Drafts.
5. Settings preserve human-review and draft-only guardrails.
6. Gmail, live AI processing, RAG indexing, and automatic sending remain disconnected in the current version.

## Main Workspaces

### Dashboard

Provides a compact operational overview of recruiter activity and workflow status.

### Inbox Triage

Organizes recruiter messages and displays message context, classification sections, and review actions.

### Candidate Review

Shows candidate information, workflow status, recommendation labels, match context, and recruiter next steps.

### Interview Kits

Provides structured technical, behavioral, role-fit, and recruiter listening questions.

### Reply Drafts

Provides multiple draft styles while requiring human review before any future sending action.

### Settings

Controls workspace identity, privacy guardrails, Gmail connection status, environment information, and local RAG metadata staging.

## Safety and Product Principles

- Human review remains required
- Reply content remains draft-only
- No automatic emails are sent
- Gmail is not connected
- Demo and Private workspace data remain separated
- RAG files are not uploaded or indexed
- The interface clearly communicates what is live and what is planned

## Screenshots

Add screenshots from:

```text
artifacts/hrmind-launch-media/
