'use client';
import { ClipboardList, Clock } from 'lucide-react';
import { useConsole } from '../../../components/console/ConsoleContext';
import { ShopChip } from '../../../components/ui/Chip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Stepper } from '../../../components/ui/Stepper';
import { WIZARD_STEPS } from '../../../lib/onboarding';

// Placeholder until the B3 wizard: shows where the shop stands (draft, under
// review, needs changes) without a shell, since the shop isn't live yet.
export default function OnboardingPage() {
  const { shop, signOut } = useConsole();
  const status = shop?.status ?? 'DRAFT';

  return (
    <div className="shell-main">
      <header className="hd">
        <img className="hd-mark" src="/brand/logo-mark.webp" alt="" width={34} height={18} style={{ display: 'block' }} />
        <div className="hd-name">
          <span>{shop?.name || 'Register your laundry'}</span>
        </div>
        {shop ? <ShopChip status={shop.status} /> : null}
      </header>
      <main className="page stack" style={{ maxWidth: 560 }} data-testid="onboarding">
        {status === 'SUBMITTED' ? (
          <>
            <h1 className="disp">We&rsquo;re checking your shop</h1>
            <p>Thanks. Your details are with the Wash &amp; Go team.</p>
            <EmptyState
              icon={Clock}
              title="What happens next"
              body="We visit or call within a few working days to verify your laundry. When you're verified, signing in here opens your Orders."
            />
          </>
        ) : status === 'REJECTED' ? (
          <>
            <h1 className="disp">Your application needs changes</h1>
            {shop?.rejectionReason ? (
              <div className="notice notice-warn" role="note">
                <b>From our team:</b> {shop.rejectionReason}
              </div>
            ) : null}
            <EmptyState
              icon={ClipboardList}
              title="Fix and resubmit is coming in B3."
              body="The registration form reopens at the step that needs changes."
            />
          </>
        ) : (
          <>
            <h1 className="disp">Register your laundry</h1>
            <Stepper steps={WIZARD_STEPS} current={0} />
            <EmptyState
              icon={ClipboardList}
              title="Wizard coming in B3."
              body="Six short steps: details, location, services and rates, hours, documents, review. Your account is saved, so you'll pick up right here."
            />
          </>
        )}
        <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => void signOut()}>
          Sign out
        </button>
      </main>
    </div>
  );
}
