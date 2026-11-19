'use client';
import { useState } from 'react';
import { useConsole } from '../../../components/console/ConsoleContext';
import { VerifyEmailBanner } from '../../../components/console/VerifyEmailBanner';
import { Rejected } from '../../../components/onboarding/Rejected';
import { UnderReview } from '../../../components/onboarding/UnderReview';
import { SavedAgo, Wizard } from '../../../components/onboarding/Wizard';
import { ShopChip } from '../../../components/ui/Chip';
import { formatAgo } from '../../../lib/relative-time';
import { useNow } from '../../../lib/live';

// Onboarding without the console shell (the shop isn't live yet):
// DRAFT → the six-step wizard (resumes at the first incomplete step),
// SUBMITTED → "We're checking your shop", REJECTED → the reason + "Fix and
// resubmit", which reopens the wizard at the step the reason names.
export default function OnboardingPage() {
  const { shop, signOut } = useConsole();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [fixAt, setFixAt] = useState<number | null>(null);
  const now = useNow();
  const status = shop?.status ?? 'DRAFT';
  const submitted = status === 'SUBMITTED';

  return (
    <div className="shell-main">
      <header className="hd">
        <img className="hd-mark" src="/brand/logo-mark-96.webp" alt="" width={34} height={18} style={{ display: 'block' }} />
        <div className="hd-name wiz-head">
          <span>{submitted && shop?.name ? shop.name : 'Register your laundry'}</span>
          {submitted && shop?.submittedAt && now ? (
            <small>submitted {formatAgo(Date.parse(shop.submittedAt), now)}</small>
          ) : (
            <SavedAgo at={savedAt} />
          )}
        </div>
        {shop ? <ShopChip status={shop.status} /> : null}
      </header>
      <main className="page" style={{ maxWidth: 592 }} data-testid="onboarding">
        <VerifyEmailBanner placement="onboarding" />
        {submitted ? (
          <UnderReview />
        ) : status === 'REJECTED' && fixAt == null ? (
          <Rejected onFix={setFixAt} />
        ) : (
          <Wizard startAt={fixAt ?? undefined} onSaved={setSavedAt} />
        )}
        <button
          type="button"
          className="btn btn-text"
          style={{ marginTop: 16 }}
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </main>
    </div>
  );
}
