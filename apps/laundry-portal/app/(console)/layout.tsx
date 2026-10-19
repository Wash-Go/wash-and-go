import type { ReactNode } from 'react';
import { ConsoleGate } from '../../components/console/ConsoleGate';
import { LiveBanner } from '../../components/console/LiveBanner';
import { VerifyEmailBanner } from '../../components/console/VerifyEmailBanner';

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <ConsoleGate>
      <VerifyEmailBanner />
      <LiveBanner />
      {children}
    </ConsoleGate>
  );
}
