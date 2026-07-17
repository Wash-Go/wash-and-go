import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { assertAuthConfigSafe } from './auth-config';

export type VerifiedIdentity = {
  firebaseUid: string;
  phone?: string;
};

/*
 * Wraps the Firebase Admin SDK. v1 auth path (debate D11) = Firebase everything.
 *
 * Until a Firebase project exists, AUTH_DEV_BYPASS=1 lets the guard trust a
 * dev header instead of verifying a real ID token — DEV ONLY, removed once the
 * service account JSON is wired via GOOGLE_APPLICATION_CREDENTIALS.
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService) {}

  get devBypass(): boolean {
    return this.config.get('AUTH_DEV_BYPASS') === '1';
  }

  onModuleInit(): void {
    // A1: refuse to boot if the dev bypass is somehow enabled in production.
    assertAuthConfigSafe({
      nodeEnv: this.config.get('NODE_ENV'),
      devBypass: this.devBypass,
    });
    if (this.devBypass) {
      this.logger.warn(
        'AUTH_DEV_BYPASS is ON — Firebase token verification is skipped. DEV ONLY.',
      );
      return;
    }
    // Uses GOOGLE_APPLICATION_CREDENTIALS from the environment.
    this.app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }

  async verifyIdToken(idToken: string): Promise<VerifiedIdentity> {
    if (!this.app) {
      throw new Error('Firebase not initialized (set credentials or dev bypass)');
    }
    const decoded = await this.app.auth().verifyIdToken(idToken);
    return { firebaseUid: decoded.uid, phone: decoded.phone_number };
  }
}
