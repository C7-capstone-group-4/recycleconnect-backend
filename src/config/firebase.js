import admin from 'firebase-admin';

// Expects FIREBASE_SERVICE_ACCOUNT_KEY to be a JSON string of the service
// account credentials (e.g. stored as a single-line env var, or loaded from
// a mounted secret file in production).
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;

  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
  });
}

export default admin;
