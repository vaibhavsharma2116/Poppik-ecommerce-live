
declare global {
  interface Window {
    Cashfree: (config: { mode: 'sandbox' | 'production' }) => {
      checkout: (options: {
        paymentSessionId: string;
        returnUrl: string;
      }) => void;
    };
  }
}

export {};
