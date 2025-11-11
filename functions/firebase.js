import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore }        from 'firebase-admin/firestore';
import { getAuth }             from 'firebase-admin/auth';
const databaseUrl = `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`;

// Only initialize once
if (!getApps().length) {
    initializeApp({
        databaseURL: databaseUrl
    });
}

// Export the already-initialized instances
export const db   = getFirestore();
export const auth = getAuth();
