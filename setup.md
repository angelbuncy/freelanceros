# FreelancerOS Setup (Firebase)

This guide helps you set up FreelancerOS locally using Firebase and Next.js.

## Prerequisites
- **Node.js 20+**
- **Firebase Project**: [Firebase Console](https://console.firebase.google.com)
- **Firebase CLI**: `npm install -g firebase-tools`

## Step 1 — Local Environment
Create `.env.local` in the project root with your Firebase project credentials.

```env
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"

# Firebase Admin (Secret)
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# API Secrets
RESEND_API_KEY="re_..."
CRON_SECRET="manual_secret_for_testing"

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
```

## Step 2 — Initialize Database
Deploy the security rules and indexes included in this repository:
```bash
firebase login
firebase use your-project-id
firebase deploy --only firestore
```

## Step 3 — Start Next.js
```bash
npm install
npm run dev
```
The app will be available at `http://localhost:3000`.

## Step 4 — Authentication Setup
1. In Firebase Console → **Authentication** → Settings → User Actions:
   - Ensure "Enable create (sign-up)" is ON.
2. In **Providers**:
   - Enable "Email/Password".
   - Enable "Google" (optional).
   
## Step 5 — Background Jobs (Cron)
Follow-up emails are managed by a Vercel Cron job at `/api/cron/send-followups`.
To test this locally:
- Call the endpoint with your `CRON_SECRET` in the `x-cron-secret` header:
```bash
curl -X POST http://localhost:3000/api/cron/send-followups -H "x-cron-secret: your-manual-secret"
```

## Step 6 — Common Errors
- **Private Key Format**: Ensure `FIREBASE_PRIVATE_KEY` has literal `\n` characters in `.env.local` (the code handles the conversion).
- **ID Token Error**: If you see "User ID mismatch", ensure you are logged in correctly. The app uses Firebase Auth tokens for server-side verification.
- **Port Busy**: If 3000 is occupied, Next.js will use 3001.

## Step 7 — Production Checklist
1. **Hosting**: Deploy to Vercel for native Cron support.
2. **Environment Variables**: Add all `.env.local` keys to Vercel's project settings.
3. **Firestore Rules**: Deploy rules using the Firebase CLI.
4. **Resend**: Verify your sender domain at [Resend.com](https://resend.com).
