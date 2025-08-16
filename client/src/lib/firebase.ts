import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup } from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Store reCAPTCHA verifier globally to prevent re-rendering
let globalRecaptchaVerifier: RecaptchaVerifier | null = null;

// Phone Auth functions
export const setupRecaptcha = (containerId: string) => {
  // Clear existing verifier if it exists
  if (globalRecaptchaVerifier) {
    globalRecaptchaVerifier.clear();
    globalRecaptchaVerifier = null;
  }

  // Clear the container element
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  globalRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('Recaptcha verified');
    },
    'expired-callback': () => {
      console.log('Recaptcha expired');
    }
  });

  return globalRecaptchaVerifier;
};

export const sendOTPToPhone = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return confirmationResult;
  } catch (error) {
    console.error('Error sending OTP:', error);
    // Clear verifier on error
    if (globalRecaptchaVerifier) {
      globalRecaptchaVerifier.clear();
      globalRecaptchaVerifier = null;
    }
    throw error;
  }
};

// Function to cleanup reCAPTCHA
export const cleanupRecaptcha = () => {
  if (globalRecaptchaVerifier) {
    globalRecaptchaVerifier.clear();
    globalRecaptchaVerifier = null;
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Get user token
    const token = await user.getIdToken();

    // Save user to database first
    try {
      const response = await fetch("/api/auth/firebase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
          photoURL: user.photoURL,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Google user saved to database:", data);

        // Store our app's token and user data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        return { user: data.user, result };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save user to database");
      }
    } catch (error) {
      console.error("Error saving Google user to database:", error);
      throw error;
    }
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

// Firebase SMS Service Implementation
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

const firebaseConfig2 = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app2 = initializeApp(firebaseConfig2);
const auth2 = getAuth(app2);

class FirebaseSMSServiceClass {
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private confirmationResult: ConfirmationResult | null = null;

  private initRecaptcha() {
    if (!this.recaptchaVerifier) {
      this.recaptchaVerifier = new RecaptchaVerifier(auth2, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });
    }
  }

  async sendSMSOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      this.initRecaptcha();

      // Format phone number with country code
      const formattedPhone = `+91${phoneNumber}`;

      if (!this.recaptchaVerifier) {
        throw new Error('reCAPTCHA not initialized');
      }

      this.confirmationResult = await signInWithPhoneNumber(auth2, formattedPhone, this.recaptchaVerifier);

      return {
        success: true,
        message: 'OTP sent successfully'
      };
    } catch (error: any) {
      console.error('Firebase SMS Error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send OTP'
      };
    }
  }

  async verifySMSOTP(otp: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.confirmationResult) {
        return {
          success: false,
          message: 'No OTP request found. Please request OTP first.'
        };
      }

      await this.confirmationResult.confirm(otp);

      return {
        success: true,
        message: 'Mobile number verified successfully'
      };
    } catch (error: any) {
      console.error('Firebase OTP Verification Error:', error);
      return {
        success: false,
        message: error.message || 'Invalid OTP'
      };
    }
  }

  cleanup() {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
    this.confirmationResult = null;
  }
}

export const FirebaseSMSService = new FirebaseSMSServiceClass();

export default app;