# FreelancerOS Project Guide

This document explains what each major file/folder does and how to safely edit it.  
Use this to brief another AI model for maintenance, setup, and deployment.

## High‑Level Architecture
- **Next.js App Router** for frontend and API routes.
- **Firebase** for Authentication and Firestore (NoSQL) Database.
- **Razorpay** for credit top‑ups (Next.js API Integration).
- **Resend** for follow‑up emails.
- **Vercel Cron** for daily background tasks (follow-up reminders).

## Folder Map
- `app/` — Next.js routes/pages (App Router).
- `components/` — UI components.
- `lib/` — helpers (Firebase clients, Razorpay loader, etc).
- `emails/` — Email templates and logic.
- `public/` — static assets.
- `setup.md` — local + deployment setup.

## Key Files and What They Do

### Auth & Session
- `app/auth/page.tsx`
  - Signup: email + password (initializes profile with 3 credits).
  - Login: email + password or Google OAuth.
- `app/api/auth/route.ts`
  - Exchanges Firebase ID tokens for secure HTTP-only session cookies.
- `lib/firebase/admin.ts`
  - Server-side Firebase Admin SDK initialization and `getServerUser` session helper.

### Database & Clients
- `app/(dashboard)/dashboard/page.tsx`
  - Shows activity stats, credits, and recent follow‑ups from Firestore.
- `app/(dashboard)/clients/page.tsx`
  - Lists clients from Firestore + mark paid logic.
- `app/(dashboard)/clients/new/page.tsx`
  - Adds a client via `/api/clients`. **1 Credit is consumed on creation.**

### Billing / Credits
- `app/(dashboard)/billing/BillingClient.tsx`
  - Managed Razorpay checkout flow.
  - Calls `/api/create-razorpay-order` and `/api/verify-payment`.

### Notifications
- `components/notifications/NotificationBell.tsx`
  - Pulls from `email_logs` collection in Firestore.

### Background Reminders (Cron)
- `app/api/cron/send-followups/route.ts`
  - Daily job called by Vercel Cron.
  - Sends follow‑up emails via Resend.
  - Rules:
    - 1 email / client / 2 days.
    - Escalates tone (polite -> firm -> final) based on attempt count.
    - Consumes 1 credit per client (handled at creation).

## Editing Safely

### Add or change fields
1. Update `firestore.rules` if security logic changes.
2. Update local state in `app/*` components.
3. Update `firestore.indexes.json` if adding new compound queries.

### Change follow‑up logic
Edit:
- `app/api/cron/send-followups/route.ts`

### Deployment Summary
See `setup.md` for full deployment checklist.
