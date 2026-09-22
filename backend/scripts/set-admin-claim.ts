/**
 * One-time script to set platform_admin custom claim on an existing Firebase user.
 * Usage: npx tsx backend/scripts/set-admin-claim.ts <UID>
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createRequire } from 'module';
// Load backend/.env so GOOGLE_APPLICATION_CREDENTIALS is set
config({ path: resolve(process.cwd(), 'backend/.env') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const uid = process.argv[2];
if (!uid) {
  console.error('❌ Usage: npx tsx backend/scripts/set-admin-claim.ts <UID>');
  process.exit(1);
}

if (!getApps().length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    console.error('❌ GOOGLE_APPLICATION_CREDENTIALS is not set');
    process.exit(1);
  }
  const require = createRequire(import.meta.url);
  const serviceAccount = require(resolve(process.cwd(), credPath));
  initializeApp({ credential: cert(serviceAccount) });
}

const adminAuth = getAuth();
const db = getFirestore();

async function run() {
  const user = await adminAuth.getUser(uid);
  await adminAuth.setCustomUserClaims(uid, { role: 'platform_admin' });
  await db.doc(`platformAdmins/${uid}`).set({ email: user.email, createdAt: new Date().toISOString() });
  await db.doc(`users/${uid}`).set({
    uid,
    email: user.email,
    name: user.displayName || 'Platform Admin',
    role: 'platform_admin',
    createdAt: new Date().toISOString(),
  }, { merge: true });

  console.log(`✅ platform_admin claim set on ${user.email} (uid: ${uid})`);
  console.log('   The user must log out and log back in for the claim to take effect.');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
