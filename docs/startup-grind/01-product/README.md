# Product overview

Wash & Go is a scheduling-first, dual-sided laundry marketplace for Zamboanga
City. It coordinates pickup, partner-shop processing, rider dispatch, payment,
tracking, and doorstep return. It does not operate the washing process itself.

## Participants

- **Customer:** schedules recurring or one-time pickups and tracks orders.
- **Rider:** receives routes, navigates stops, and confirms handoffs.
- **Partner shop:** accepts laundry work and updates processing status.
- **Administrator:** manages zones, capacity, fleet, pricing configuration, and
  exceptions.

## MVP outcome

A customer can book a pickup, the backend can assign it to a zone and run, a
rider and shop can progress it through controlled statuses, and the customer
can receive the completed order with an auditable price and payment record.

## Product channels

- The public website onboards customers, partner shops, and rider applicants,
  checks service coverage, captures consent, and sends users to the correct app.
- The React Native customer app owns booking, payment, and order tracking.
- The React Native rider app owns runs, navigation, QR handoffs, and earnings.
- Shop and admin operations are not exposed on the public website. A minimal
  private operations tool is a separate deployable when operational demand
  justifies it.

## Product authority

- Detailed requirements: [`../../spec.md`](../../spec.md)
- Locked implementation direction: [`../../../PLAN.md`](../../../PLAN.md)
- Plain-language proposed rules:
  [`BUSINESS_RULES_PROPOSED.md`](./BUSINESS_RULES_PROPOSED.md)

Open business rules in `PLAN.md` must be resolved before they are encoded as
hard-to-change database constraints.
