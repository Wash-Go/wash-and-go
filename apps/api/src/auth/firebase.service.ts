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

    // Initialize the Admin SDK whenever credentials are available — a real
    // Firebase token is verified even under dev bypass (bearer wins; x-dev-uid
    // is only the fallback for clients that don't mint tokens yet). Only pure
    // stub mode (bypass ON + no credentials) skips init. Two credential sources:
    //   FIREBASE_SERVICE_ACCOUNT_JSON — the raw JSON as an env var (Railway/prod)
    //   GOOGLE_APPLICATION_CREDENTIALS — a file path (local dev)
    const inlineJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    const credFile = this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    if (!inlineJson && !credFile) {
      if (this.devBypass) {
        this.logger.warn(
          'No Firebase credentials + AUTH_DEV_BYPASS on — token verification unavailable, x-dev-uid only. DEV ONLY.',
        );
        return;
      }
      throw new Error(
        'No Firebase credentials (set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS) and AUTH_DEV_BYPASS off',
      );
    }

    try {
      const credential = inlineJson
        ? admin.credential.cert(JSON.parse(inlineJson) as admin.ServiceAccount)
        : admin.credential.applicationDefault();
      this.app = admin.apps.length
        ? admin.app()
        : admin.initializeApp({ credential });
      if (this.devBypass) {
        this.logger.warn(
          'AUTH_DEV_BYPASS is ON — real Firebase tokens are still verified; x-dev-uid is the fallback. DEV ONLY.',
        );
      }
    } catch (e) {
      if (this.devBypass) {
        this.logger.warn(
          `Firebase Admin init failed (${(e as Error).message}); x-dev-uid only. DEV ONLY.`,
        );
        return;
      }
      throw e;
    }
  }

  async verifyIdToken(idToken: string): Promise<VerifiedIdentity> {
    if (!this.app) {
      throw new Error('Firebase not initialized (set credentials or dev bypass)');
    }
    const decoded = await this.app.auth().verifyIdToken(idToken);
    return { firebaseUid: decoded.uid, phone: decoded.phone_number };
  }
}
