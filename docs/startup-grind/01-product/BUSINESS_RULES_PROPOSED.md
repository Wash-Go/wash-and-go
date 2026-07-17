# Wash & Go business rules in plain language

- Status: **Proposed**
- Audience: founders, operations, partner shops, riders, and non-technical
  reviewers

This file explains how the business is expected to work without describing
code or databases. These rules are proposals from the current plan and must be
confirmed by the team before launch.

## What Wash & Go does

Wash & Go coordinates laundry pickup, delivery, payment, and tracking. Partner
laundry shops perform the washing. Wash & Go connects customers, riders, and
shops and keeps a record of what should happen next.

## Who does what

- **Customer:** chooses a service and pickup schedule, pays, and receives the
  finished laundry.
- **Rider:** follows an assigned run and confirms each handoff.
- **Partner shop:** weighs and processes the laundry, updates its status, and
  receives its agreed share.
- **Wash & Go operations:** manages service areas, exceptions, riders, partner
  shops, disputes, and reconciliation.

No role should be able to perform another role's protected action merely by
opening a different screen.

## Where customers use the service

- The public website explains the service, checks coverage, collects onboarding
  information, and sends the person to the correct mobile app.
- Customers book, pay, and track orders in the customer mobile app.
- Riders manage runs and handoffs in the rider mobile app.
- Shop and administrator work is private and is never exposed on the public
  website.

## Service area

An address must be inside an active Wash & Go service zone before a normal
pickup is confirmed. Finding an address on a map does not automatically mean
the address is serviceable.

If an address is outside coverage, the person may join a waitlist instead of
creating an order.

## Two delivery choices

### Scheduled service

- The normal and lower-cost option.
- Orders in the same area are grouped into a vehicle run.
- Pickup capacity is limited by the vehicle, schedule, and service zone.
- The current planning assumption is about ten bags per run; operations must
  validate this in the pilot.

### Express service

- Intended for urgent, same-day, or lighter loads.
- Uses an available partner motorcycle rather than the normal batch run.
- Costs more because it is handled separately.
- The exact weight limit, availability promise, and fee remain proposed.

## Order journey

A normal order is expected to move through these stages:

1. booked by the customer;
2. assigned to a run;
3. picked up from the customer;
4. received by the partner shop;
5. being processed;
6. ready for return;
7. out for return;
8. delivered to the customer.

An order may also be cancelled or disputed under approved conditions. Every
handoff and status change should be recorded. A later step must not be accepted
when an earlier required handoff is missing.

## Price and payment

The customer price may include:

- the partner shop's laundry charge;
- a delivery fee;
- a Wash & Go service fee;
- discounts, credits, or a valid voucher.

The partner shop receives the laundry value minus the agreed Wash & Go
commission. Wash & Go keeps the commission and applicable platform fees.

Current amounts—including the 12% commission, ₱40 scheduled delivery, express
range, and ₱7 service fee—are planning assumptions, not final launch promises.
The team must approve the final rate card and partner agreement.

Money calculations must be repeatable and recorded. Retrying a payment or
handoff must not charge a customer or create a financial entry twice.

## Weight and final amount

The customer may provide an estimated weight while booking. The partner shop's
measured weight determines the final laundry charge when the service is priced
by weight. The customer must be shown the final amount before the agreed
payment deadline and escalation process applies.

## Recurring pickups

A customer may request a repeating schedule. Before launch, the team must agree
on:

- supported weekly, biweekly, or monthly choices;
- cutoff times;
- pause, skip, edit, and cancellation behavior;
- holidays and unavailable days;
- what happens when a zone or time slot is full.

## Credits and vouchers

Laundry Credits are proposed prepaid value. A voucher may remove an eligible
scheduled-delivery fee. The team must approve expiry, refund, transfer, dispute,
and accounting treatment before this feature accepts real money.

Credits and vouchers must never create a negative balance or be redeemed twice.

## Handoffs and proof

QR confirmation is proposed for important handoffs. The system should verify
that the correct order, person, stage, and time are involved. An offline scan is
not final until the server validates it.

## Rider location and customer privacy

Rider location should be collected only as often as operations and customer
safety require. Access, retention, customer visibility, and deletion rules must
be approved before the pilot. Raw location data must not appear in ordinary
application logs.

## When something goes wrong

- Failed payments may be retried safely without duplicate charges.
- Missed or invalid handoffs become an operations exception.
- A disputed order stops normal automatic settlement until reviewed.
- A customer, rider, or shop cannot change a completed financial record without
  an auditable correction.

## Rules that still need business approval

1. Final rate card, commission, delivery fee, and service fee.
2. Express weight limit and delivery promise.
3. Recurring schedule and cancellation rules.
4. Payment timing and unpaid-order escalation.
5. Cash acceptance and reconciliation ownership.
6. Voucher expiry, refunds, and stored-value compliance review.
7. Shop selection when multiple shops serve one zone.
8. Rider-to-vehicle assignment rules.
9. Location retention and customer tracking visibility.
10. Capacity threshold that causes a zone to pause orders or split.

## Approval rule

A proposed rule becomes a product commitment only after the responsible founder
or operations owner approves it and the decision is recorded in the product
specification or an accepted decision record.
