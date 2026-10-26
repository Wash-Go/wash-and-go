// The six onboarding wizard steps (plan A4).
export const WIZARD_STEPS = ['Details', 'Location', 'Services', 'Hours', 'Documents', 'Review'] as const;

// FOUNDERS: placeholder copy for the "Under review" screen until ops confirms
// the review time and the partner-ops phone / Messenger (plan "Founder inputs
// still owed"). Change here only; nothing else hardcodes these.
export const REVIEW_COPY = {
  callWithin: 'within 2 working days',
  opsContact: 'Wash & Go partner ops · phone and Messenger details coming soon.',
} as const;
