// The API's answer (HTTP 400) when a pickup is outside the service zones. Quote
// and both creates send exactly this message (U0 T6), and the customer app
// matches on it to show plain-words copy before any price. The API hand-mirrors
// it (apps/api/src/orders/orders.service.ts); its parity.spec.ts pins the two.
export const OUTSIDE_COVERAGE_MESSAGE = 'Pickup location is outside coverage';
