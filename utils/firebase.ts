/**
 * Firebase Auth — Re-export layer
 * 
 * Maintains backward compatibility for all existing imports
 * while delegating to the new centralised firebaseConfig.
 */
export { app, auth, signInWithGoogleIdToken } from './firebaseConfig';
export { default } from './firebaseConfig';
