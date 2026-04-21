# FreelancerOS — Complete Backend Setup Guide (Firebase)

The FreelancerOS backend has been migrated from Supabase to Firebase for improved scalability and native Next.js integration.

## Key Architecture Changes

| Area | Before (Supabase) | Now (Firebase) |
|---|---|---|
| **Database** | PostgreSQL | Firestore (NoSQL) |
| **Authentication** | Supabase Auth (Magic Links) | Firebase Auth (Email/Password + Google) |
| **Server Logic** | Edge Functions (Deno) | Next.js API Routes (Node.js) |
| **Background Jobs** | `pg_cron` | Vercel Cron |
| **Session Mgmt** | Supabase Cookies | Firebase ID Token -> HTTP-only Session Cookie |

---

## Prerequisites

- **Node.js 20+** and **npm**
- **Firebase Project** → [Firebase Console](https://console.firebase.google.com)
- **Razorpay Account** (test or live) → [Razorpay](https://razorpay.com)
- **Resend Account** (for reminder emails) → [Resend](https://resend.com)
- **Vercel Account** (for hosting and Cron)

---

## Step 1 — Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com) → Add Project.
2. Disable Google Analytics (optional).
3. **Authentication**: Enable "Email/Password" and "Google" sign-in providers.
4. **Firestore Database**: 
   - Create Database in "Production Mode".
   - Choose a location (e.g., `asia-south1` for India).
5. **Project Settings**:
   - Add a Web App to get your Client SDK config (`apiKey`, `authDomain`, etc.).
   - Go to **Service Accounts** → "Generate new private key". Save this JSON file; you'll need the `client_email` and `private_key` for your `.env.local`.

---

## Step 2 — Deploy Security Rules & Indexes

Install the Firebase CLI if you haven't:
```bash
npm install -g firebase-tools
firebase login
```

Deploy the rules and indexes included in the repository:
```bash
firebase deploy --only firestore
```

---

## Step 3 — Configure Environment Variables

Create or update `.env.local` in the project root:

```env
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Firebase Admin (Secret)
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# API Secrets
RESEND_API_KEY="re_..."
CRON_SECRET="manual_secret_for_vercel_cron"

# Razorpay (Public/Secret)
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
```

---

## Step 4 — Set Up Vercel Cron

The automatic follow-up reminders are triggered by an API route at `/api/cron/send-followups`.

1. Deploy the project to Vercel.
2. Vercel will automatically detect the `vercel.json` configuration:
   ```json
   {
     "crons": [{ "path": "/api/cron/send-followups", "schedule": "0 9 * * *" }]
   }
   ```
3. Ensure the `CRON_SECRET` in your Vercel Environment Variables matches the one used in the URL if testing manually (though Vercel handles the production security via OIDC/internal headers).

---

## Step 5 — Run Locally

```bash
npm install
npm run dev
```

App available at `http://localhost:3000`.

---

## Feature Walkthrough

### Auth Flow
- `/auth`: Sign up with email/password (grants 3 free credits).
- Firebase ID tokens are exchanged for secure `session` cookies via `/api/auth`.

### Automatic Reminders
- Triggered daily via `/api/cron/send-followups`.
- Rules: 1 email per client every 2 days.
- Escalates tone based on attempt count.
- Stops automatically once the client is marked as `paid` in Firestore.

### Credits System
- **Consumption**: 1 credit is deducted when a new client is added.
- **Top-up**: Managed via `/api/create-razorpay-order` and `/api/verify-payment`.
