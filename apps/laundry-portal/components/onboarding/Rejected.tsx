'use client';
import './onboarding.css';
import { useConsole } from '../console/ConsoleContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { WIZARD_STEPS } from '../../lib/onboarding';
import { stepFromRejection } from '../../lib/wizard';

// REJECTED: the reason from our team, and one way forward.
export function Rejected({ onFix }: { onFix: (step: number) => void }) {
  const { shop } = useConsole();
  const step = stepFromRejection(shop?.rejectionReason);
  return (
    <div className="wiz" data-testid="rejected">
      <h1 className="disp">Your application needs changes</h1>
      <Card>
        <div className="lbl" style={{ marginBottom: 6 }}>
          From our team
        </div>
        <p>{shop?.rejectionReason || 'Our team asked for a few changes before we can verify your shop.'}</p>
      </Card>
      <p className="small muted">
        Your answers are saved. We&rsquo;ll open the form at {WIZARD_STEPS[step]}; check the rest on the review step, then
        submit again.
      </p>
      <Button full onClick={() => onFix(step)}>
        Fix and resubmit
      </Button>
    </div>
  );
}
