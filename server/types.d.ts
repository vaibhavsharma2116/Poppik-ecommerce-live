declare module 'cookie-parser' {
  import { RequestHandler } from 'express';
  function cookieParser(secret?: string | string[], options?: any): RequestHandler;
  export default cookieParser;
}

declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string;
    expirationTime: number | null;
    keys: {
      auth: string;
      p256dh: string;
    };
  }

  export interface SendNotificationOptions {
    vapidSubject?: string;
    vapidPublicKey?: string;
    vapidPrivateKey?: string;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function sendNotification(
    subscription: PushSubscription,
    payload?: string,
    options?: SendNotificationOptions
  ): Promise<any>;
}
