/**
 * Firebase uygulama giriş noktası — tek kaynak: ../lib/firebase.js
 * getAuth / getFirestore burada başlatılır; db ve auth bu modülden re-export edilir.
 */
export { app, auth, db, analytics, isFirebaseConfigured } from '../lib/firebase'
