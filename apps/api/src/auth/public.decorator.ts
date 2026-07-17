import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Opt a route out of the global auth guard (e.g. POST /auth/session, /health).
// Secure-by-default (debate D3): everything is guarded unless marked @Public.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
