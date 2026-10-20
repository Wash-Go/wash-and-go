'use client';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { InstallCard } from '../InstallCard';
import { ThemeSwitch } from '../ui/ThemeSwitch';
import { useConsole } from '../console/ConsoleContext';
import { Chip, OrderChip } from '../ui/Chip';
import { appVersionLine, emailStatusLine, ORDER_STEPS, PAYOUT_RULES, WEIGH_RULES } from '../../lib/help';
import { OPS_CONTACT } from '../../lib/ops-contact';
import { useAuth } from '../../lib/useAuth';

// Help (plan A4): how an order moves, the weigh-in rules, how payouts work,
// how to reach ops, the app version, install and the email status.
export function HelpView() {
  const { me, email } = useConsole();
  const { user, devBypass } = useAuth();
  const emailLine = emailStatusLine({
    devBypass,
    email,
    emailVerified: me.emailVerified ?? user?.emailVerified,
  });

  return (
    <div className="stack help" data-testid="help">
      <h1 className="disp">Help</h1>
      <InstallCard />

      <section className="card card-pad" aria-labelledby="help-order">
        <h2 id="help-order">How an order moves</h2>
        <ol className="help-steps">
          {ORDER_STEPS.map((s) => (
            <li key={s.status}>
              <OrderChip status={s.status} />
              <span>
                {s.shopActs ? <b className="help-yours">Your step. </b> : null}
                {s.text}
              </span>
            </li>
          ))}
        </ol>
        <p className="small muted">
          In the queue, your steps show as &ldquo;Needs you&rdquo; until you act on them.
        </p>
      </section>

      <section className="card card-pad" aria-labelledby="help-weigh">
        <h2 id="help-weigh">Weigh-in rules</h2>
        <ul className="help-list">
          {WEIGH_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="card card-pad" aria-labelledby="help-pay">
        <h2 id="help-pay">How payouts work</h2>
        <ul className="help-list">
          {PAYOUT_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="card card-pad" aria-labelledby="help-contact" data-testid="help-contact">
        <div className="help-head">
          <h2 id="help-contact">Contact ops</h2>
          {OPS_CONTACT.placeholder ? <Chip spec={{ label: 'Placeholder', tone: 'warn', icon: 'alert' }} /> : null}
        </div>
        {OPS_CONTACT.placeholder ? (
          <p className="small muted">These are placeholders until the Wash &amp; Go team confirms its numbers.</p>
        ) : null}
        <ul className="help-contact">
          <li>
            <Phone aria-hidden="true" />
            <a href={OPS_CONTACT.phoneHref} className="mono">
              {OPS_CONTACT.phone}
            </a>
          </li>
          <li>
            <MessageCircle aria-hidden="true" />
            <a href={OPS_CONTACT.messengerHref} target="_blank" rel="noreferrer">
              Messenger · {OPS_CONTACT.messenger}
            </a>
          </li>
        </ul>
        <p className="small muted">{OPS_CONTACT.hours}</p>
      </section>

      <section className="card card-pad" aria-labelledby="help-account">
        <h2 id="help-account">Your account</h2>
        <p className="help-line">
          <Mail aria-hidden="true" />
          <span data-testid="help-email">{emailLine}</span>
        </p>
        <ThemeSwitch className="help-switch" />
        <p className="small muted mono" data-testid="help-version">
          {appVersionLine(process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0', process.env.NEXT_PUBLIC_BUILD_ID ?? '')}
        </p>
      </section>
    </div>
  );
}
