  // Firebase has been removed from this application
  // All authentication is now handled through the regular email/password system
  export const auth = null;
  export const googleProvider = null;
  export const FirebaseSMSService = null;

  // These functions are no longer available
  export const setupRecaptcha = () => {
    throw new Error('Firebase has been removed. Use email/password authentication instead.');
  };

  export const sendOTPToPhone = () => {
    throw new Error('Firebase has been removed. Use email/password authentication instead.');
  };

  export const cleanupRecaptcha = () => {
    // No-op
  };

  export const signInWithGoogle = () => {
    throw new Error('Firebase has been removed. Use email/password authentication instead.');
  };

  export default null;