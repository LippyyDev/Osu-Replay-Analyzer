// lib/firebase/admin.ts
// Firebase Admin SDK — server-side only, used to verify Google ID tokens
import * as admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (app) return app;

  const credential = admin.credential.cert({
    projectId:    process.env.FIREBASE_PROJECT_ID!,
    clientEmail:  process.env.FIREBASE_CLIENT_EMAIL!,
    // env stores \n literally — replace back to real newlines
    privateKey:   process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  });

  app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({ credential });

  return app;
}

export async function verifyGoogleIdToken(idToken: string) {
  const firebaseApp = getFirebaseAdmin();
  const decoded = await admin.auth(firebaseApp).verifyIdToken(idToken);
  return decoded;
}
