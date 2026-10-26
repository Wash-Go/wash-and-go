# Maya Business developer docs: research report (2026-10-25)

Scope: developers.maya.ph, maya.ph/business, mayabank.ph, dev-forum.maya.ph. Every claim carries its URL. "Quote" = exact page text. Pages that would not load are listed in "Gaps". No code was changed.

## 0. Headline answers

- GCash payout: YES via Unified Transfer. The institution table lists "G-Xchange, Incorporated (GXI) / GCash", code `GXCHPHM2XXX`, InstaPay yes, PESONet yes (https://developers.maya.ph/reference/financial-institution-codes-and-standard-field-values-in-unified-transfer). GrabPay (`GHPESGSGXXX`), ShopeePay (`SHPHPHM2XXX`, InstaPay only), PayMongo (`PAEYPHM2XXX`) are also listed. GCash is NOT named on any other payout page.
- Unified Transfer is gated: "in active development", pioneer merchants only, onboarding via Relationship Manager; "you must be onboarded as a partner and receive your OAuth 2.0 credentials before you can access the Sandbox environment" (https://developers.maya.ph/reference/getting-started-with-unified-transfer).
- Business Deposit (the non-API payout path) is "Currently only available to select Maya Business Manager merchants" (https://www.mayabank.ph/business-deposit); supports maker/checker/approver and CSV bulk transfers to Maya Wallet, Maya Bank, Negosyo, InstaPay/PESONet banks (GCash reachable as an InstaPay participant but not named).
- Collection sandbox is open: public shared keys + test cards + test wallets published (https://developers.maya.ph/reference/sandbox-credentials-and-cards); GCash/QRPh/ShopeePay/WeChat are production-only test.
- Settlement timing is NOT published anywhere: "Settlements schedule and reports vary for each partner" (https://developers.maya.ph/docs/receive-settlements-into-your-business-deposit). Only Terminals state "next banking day".
- Published MDR (starting rates): QRPh/Maya QR 1.0%, GCash 2%, cards 3.50% + P10 online (https://www.maya.ph/business/pricing).
- Multi-user roles for Business Manager: no written doc found; only a video "How to manage User Access Management" (https://youtu.be/dqpsgzDKucw) and the Business Deposit maker/checker/approver statement.

## 1. Payouts / disbursement

### 1a. Unified Transfer (API, the only documented API path to GCash and banks)
- About: https://developers.maya.ph/reference/about-unified-transfer. Quote: "Send funds to Maya and 100+ Philippine financial institutions through a single secure API." Channels: Maya (internal), InstaPay (real-time), PESONet (batch). Notice: "Unified Transfer is in active development"; "As a pioneer merchant, you will be informed of the updates through your Maya Relationship Manager."
- Integration guide: https://developers.maya.ph/reference/implementing-peer-to-peer-transfers-using-unified-transfer
  - Endpoints: `POST /v1/transfers/p2p` (initiate), `PUT /v1/transfers/p2p/{id}/confirmation` (confirm), `GET /v1/transfers/p2p/{id}`, `GET /v1/transfers/p2p?x-originator-transaction-id=...`. Optional header `x-auto-confirm: true` collapses to one call (returns 202, no body; failures arrive as DECLINED callback).
  - Base URLs: sandbox `https://sandbox.api.maya.ph/v1`, token `https://connect-sb-issuing.paymaya.com/token`; prod `https://api.maya.ph/v1`, token `https://connect-issuing.paymaya.com/token` (about page).
  - Auth: OAuth 2.0 client credentials (scope `transfer`), Bearer token "typically 1 hour", plus `x-jws-signature` detached JWS (RS256 sample) signed with YOUR private key; you must host a JWKS endpoint and a callback endpoint (https://developers.maya.ph/reference/how-api-authentication-works-in-unified-transfer).
  - Headers: `x-idempotency-key` (UUID, required), `x-originator-transaction-id` (required), `x-fapi-interaction-id` (optional).
  - Body: `debit_account{financial_institution_code, account_number}`, `credit_account{financial_institution_code, account_number, account_name}`, `amount{currency: PHP, value}`; optional `ach_channel` (`instapay`|`pesonet`), sender/receiver KYC blocks, `transaction_purpose` (predefined list includes "Employee Payroll/Employee Expense", "Goods & Services payment", "Commissions/Professional/Management Fees").
  - Destination identification: 11-char SWIFT/BIC-style code; "Can be a traditional account number or mobile number for e-wallets" (https://developers.maya.ph/reference/definition-of-terms-in-unified-transfer). Maya codes: `PAPHPHM1XXX` (Maya Philippines wallet), `MYYAPHM2XXX` (Maya Bank), `MYDBPHM2XXX` (Maya Bank, InstaPay sending only).
  - Statuses: INITIATED -> PROCESSING -> APPROVED | DECLINED; LAPSED if not confirmed within 1 hour. "transfers cannot be cancelled once confirmed".
  - Limits: InstaPay P50,000/txn, PESONet P300,000/txn, Maya-to-Maya per account limits. Speed: InstaPay real-time; PESONet "typically processed same-day or next business day".
  - Fees: not stated. The sample initiate response shows `transfer_details.fee: 7.00` on a 1,000.00 principal (sample data, not a tariff).
  - Callbacks: https://developers.maya.ph/reference/implementing-callback-for-unified-transfer. POST to RM-registered URL; up to 5 attempts (immediate, +1s, +5m, +15m, +45m); payload `id, status, created_timestamp, updated_timestamp, initiation, transfer_details{gross_amount, principal_amount, fee, balances}, decline_reason{code, description}`. Quote: "While Maya doesn't currently provide signature verification" (recommend IP allowlist + shared secret query param).
  - Bulk/batch: "Bulk and scheduled transfer capabilities are planned for future releases." Maker/checker: not mentioned (API-level only).
  - Onboarding (https://developers.maya.ph/reference/getting-started-with-unified-transfer): email RM with subject "Unified Transfer - Partner Onboarding Request" including company details, use case/volumes, channels, JWKS URL, callback URL, GPG public key, key-recipient email. Maya asks for "business registration details, licenses (if applicable), compliance certifications, and security and data protection policies." Sandbox client id/secret sent GPG-encrypted; "Production credentials will be provided after Maya's acceptance testing approval." Quote: onboarding "is still a work in progress." Contacts: partnercashsolutions@maya.ph (partnership/test results), partner.support@maya.ph (production).

### 1b. Business Deposit (Maya Bank account inside Business Manager; manual/bulk, no API)
- https://developers.maya.ph/docs/business-deposit: "Assign maker, checker, and approver roles to manage your Business Deposit Account." "Users with limited access must wait for approval before transfers will be processed." Activation "3 business days" after requirements. Converting moves the Maya Enterprise Wallet balance into the deposit account.
- https://developers.maya.ph/docs/transfer-funds-from-your-business-deposit-via-maya-business-manager: destinations "Maya Wallet, Maya Bank Account, Maya Business App (Negosyo), or to banks participating in Instapay/Pesonet." Multiple recipients: "The CSV template for bulk upload is available inside Maya Business Manager." "Depending on the actor's role within your organization, transfers may need approval from an administrator." "Fees are subject to change without prior notice." No limits, cutoffs, CSV columns, or recipient caps stated.
- https://www.mayabank.ph/business-deposit: "Currently only available to select Maya Business Manager merchants"; "Send money to your partners and suppliers for FREE via PesoNet and InstaPay"; 2.5% p.a. interest to P750M; PDIC-insured; fees page https://support.mayabank.ph/s/article/What-are-the-fees-charged-to-my-Maya-Business-Deposit-account (could not fetch, Salesforce JS shell).
- https://www.maya.ph/business/bulk-fund-transfers: "Whether it's 10 payments or 10,000"; "Feature initially available on Maya Business Manager." Scheduling for a later date (https://www.maya.ph/business/banking-and-transfers). No fees/limits/destinations stated.

### 1c. Disbursement API (payout v1) - appears withdrawn
- Search index still lists https://developers.maya.ph/docs/disbursement-api-v1, /docs/payoutv1-technical-details, /docs/payout-faq, /reference/quickstart-on-payout-v1-api; all return HTTP 404 (also under /v5.18/). Search snippets (unverified) said: Basic auth with `x-api-key`, 10-minute session via email/password, "disbursement file" upload, "beneficiary must have an Upgraded Maya Account", Maya numbers only. Forum thread https://dev-forum.maya.ph/t/disbursement-api-account-application/277 (403 on fetch) snippet: apply via RM or business.signup@maya.ph. Treat as legacy; Unified Transfer is the successor.

### 1d. Maya Remittance API / Unified Remittance API (not for us)
- https://developers.maya.ph/docs/remittance-to-maya-wallet-technical-guide: "designed to empower remittance service providers"; Maya-wallet-only; `POST/PUT/GET https://pg-sandbox.paymaya.com/remittances/v2...`; Basic auth API key; "retired and no longer supported starting October 2026" in favour of URAPI.
- URAPI https://developers.maya.ph/reference/send-remittance-to-an-account-owned-by-the-receiving-party: `POST /v1/remittances/send`, `PUT .../{id}/confirmation`, `GET .../{id}`; Bearer via Maya Connect; source `PAPHPHM1` (Operating Wallet) or `MYYAPHM2` (Business Deposit); receiver must be "a valid SWIFT code of a bank in the Philippines" (test data shows Maya and Metrobank). Onboarding needs VAPT report + Vendor Security Questionnaire (https://developers.maya.ph/reference/quick-start-on-remittance). GCash not named.

### 1e. Cash-in via Maya Login (listed under "Disbursements")
- https://developers.maya.ph/reference/cash-in-via-maya-login: user-authorised OAuth flow that credits the user's own Maya wallet; token 3600s, refresh 604800s. Requires onboarding. Not a merchant-initiated payout; irrelevant for rider payouts.

## 2. Collection

- Product/method matrix (https://developers.maya.ph/docs/payment-methods): Checkout = cards, Apple Pay, Google Pay, QR Ph, Maya Wallet, GCash, ShopeePay, WeChat Pay. Pay with Maya = Maya Wallet + QR Ph only. Vault = cards only. GCash page (https://developers.maya.ph/docs/gcash): collection only, needs "GCash acceptance" enabled by Maya rep.
- Base URLs (https://developers.maya.ph/reference/api-environments): API sandbox `https://pg-sandbox.paymaya.com`, prod `https://pg.maya.ph` (old `pg.paymaya.com` still referenced in OpenAPI pages); hosted page sandbox `https://payments-web-sandbox.paymaya.com`, prod `https://payments.maya.ph`. Prod API egress IPs listed (https://developers.maya.ph/reference/checkout).
- Auth (https://developers.maya.ph/reference/api-authentication-methods): Basic auth, username = public key (create checkout/payment, status) or secret key (retrieve, cancel, webhooks). Keys are per-solution.
- Checkout: `POST /checkout/v1/checkouts` (public key); required `totalAmount{value,currency}`, `requestReferenceNumber`; `redirectUrl{success,failure,cancel}`; response `checkoutId`, `redirectUrl`; "Payments expire 1 hour from Creation and 15 mins from Authentication start." Idempotency: "It is strongly advised that the merchant provide unique value for this property" (no dedupe guarantee documented) (https://developers.maya.ph/reference/createv1checkout).
- Pay with Maya: `POST /payby/v2/paymaya/payments` (public); `GET /payments/v1/payments/{paymentId}` (secret); `GET /payments/v1/payment-rrns/{rrn}` (secret); `GET /payments/v1/payments/{paymentId}/status` (public); `POST /payments/v1/payments/{paymentId}/cancel` (secret) (https://developers.maya.ph/reference/one-time-payment-using-maya-wallet).
- Dynamic QR Ph: `POST /payments/v1/qr/payments` (public) returns `paymentId`, `redirectUrl`, `qrCodeBody`; "one-time use and remain valid for 1 hour"; payable by "a Maya wallet or another wallet of the QRPh-participating financial institution" (https://developers.maya.ph/reference/generate-a-maya-qrph). Statuses incl. 15-minute P2M expiry (https://developers.maya.ph/page/payment-statuses).
- Vault: tokenised cards; "you'll need to develop your own scheduler" for recurring (https://developers.maya.ph/docs/maya-vault).
- Payment Links: no-code `https://mymaya.me/{merchantAlias}?amt=`; auto-generated once Checkout + Invoicing activated; no webhooks (https://developers.maya.ph/docs/payment-links).
- Webhooks (https://developers.maya.ph/docs/receive-real-time-payment-information-using-webhooks): `POST /payments/v1/webhooks` with secret key, body `{name, callbackUrl}` (https://developers.maya.ph/reference/createv1webhook-1); events PAYMENT_SUCCESS/FAILED/EXPIRED/CANCELLED, AUTHORIZED, 3DS_*, RECURRING_*; legacy CHECKOUT_* to be discontinued. Retries: immediate, +5m, +15m, +45m (4 total). No signature; IP allowlist sandbox 13.229.160.234, 3.1.199.75; prod 18.138.50.235, 3.1.207.200. Duplicates possible, log-and-skip advised. Webhooks are per environment and must be re-registered in production.
- Sandbox (https://developers.maya.ph/reference/sandbox-credentials-and-cards): 5 shared Checkout/Vault/Invoice key pairs (e.g. `pk-Z0OSzLvIcOI2UIvDhdTGVVfRSSeiGStnceqwUE7n0Ah` / `sk-X8qolYjy62kIzEbr0QRK1h4b4KDVHaNcwMYk39jInSl`), 2 Pay with Maya pairs; test wallets `+639900100900` (success) and `+639900100916` (insufficient), password `Password@1`, OTP `123456`; test cards (e.g. Visa 4123450131001381, 3DS pw `mctest1`). "Maya is the only e-wallet available for testing in Sandbox"; GCash/QRPh/ShopeePay/WeChat production-only (https://developers.maya.ph/docs/pay-with-maya).
- Void/refund (https://developers.maya.ph/reference/voids-and-refunds): void same day before 00:00 GMT+8; refund next day up to 180 days (manual to 1 year); Maya Wallet refund instant; cards 7-14 working days; "GCash, Maya Credit, and QR PH: Require manual refund processing through business.support@maya.ph." Must be enabled by RM.
- Settlement: Checkout/Pay with Maya pages: settlement "varies for each partner"; Business Deposit page: no T+N stated; Terminals only: "Proceeds are credited to the merchant's bank account the next banking day in LUMPSUM" and "There are no settlements on weekends and holidays" (https://developers.maya.ph/docs/terminal-settlement-concerns). Settlement Report lives in Maya Manager 1.0; Statement of Account in Business Manager (https://developers.maya.ph/docs/receive-settlements-into-your-business-deposit).
- Fees (https://www.maya.ph/business/pricing, "Rate starts at"): Checkout/Invoice/Links cards 3.50% MDR + P10; Maya QR 1.0%; QRPh 1.0%; GCash 2%; WeChat 1.75%; ShopeePay 1.85%. "We can create custom pricing packages for businesses with high payment volume." 123Grow bundle: extra 1% QRPh discount month if Business Deposit is the settlement account (https://www.maya.ph/business/123grow).

## 3. Onboarding
- Account: register at Maya Business Manager https://pbm.paymaya.com/ ("Maya Business 2.0"); KYC "valid IDs, business permits, and SEC/DTI registration" (https://developers.maya.ph/reference/getting-started-in-maya-checkout-maya-business-manager). Contact business.signup@maya.ph.
- Partner journey timelines (https://developers.maya.ph/docs/maya-partner-journey): account creation + sandbox onboarding 1 week; build 2-4 weeks; test 2-3 business days; transition to production 1-2 weeks; go-live 2-3 business days. UAT: "Submit your sandbox testing result along with your signoff, to your Maya Relationship Manager."
- Keys (https://developers.maya.ph/docs/online-payments-quick-start-guide-maya-business-manager): Business Manager "supports Production API key generation for Maya Checkout and Maya Plugin" only; keys shown "once"; per-solution. Sandbox keys: shared defaults, or temporary keys via Applications tool ("meant for functional unit testing only", https://developers.maya.ph/docs/applications-management-tool-in-maya-business-manager); formal UAT sandbox needs Maya Manager 1.0 via RM. Payments Platform, Mini App, Bills, Cash-in, Remittance keys: RM only.
- Go-live request (https://developers.maya.ph/reference/testing-and-validating-your-maya-checkout-integration): email business.support@maya.ph + RM with Merchant Name/MID, 200 OK webhook screenshot, one successful txn per scheme.
- Service desk ASKMAYADEV https://mayaph.atlassian.net/servicedesk/customer/portal/35 (https://developers.maya.ph/docs/maya-developer-hub-service-desk-guide): sandbox only; access only after RM registers your email; hours 09:00-18:00 GMT+8 weekdays; no SLA stated. Production: business.support@maya.ph, hotline (+63)2 8845 7700.

## 4. Business Manager users and roles
- Developer-hub docs contain no written user-management guide. Only https://developers.maya.ph/docs/maya-manager-quick-links video "How to manage User Access Management" (https://youtu.be/dqpsgzDKucw; description not retrievable) and "How to view and download audit logs".
- Business Deposit: "Assign maker, checker, and approver roles" (https://developers.maya.ph/docs/business-deposit; https://www.mayabank.ph/business-deposit "limited to select Maya Business Manager merchants").
- Forum thread "Maya Manager: How to give access to other developers?" https://dev-forum.maya.ph/t/maya-manager-how-to-give-access-to-other-developers/454 (403 on fetch; search snippet: access requested through RM by the nominated representative).
- business-help.maya.net is NOT Maya Philippines: its "User Types" article is about eSIMs (Maya Mobile) (https://business-help.maya.net/hc/en-us/articles/37636549796251, 403 on direct fetch; content from search snippet). Ignore for this decision.

## 5. Settlement, fees, gates
- Published: MDR starting rates (sec. 2), Business Deposit free InstaPay/PESONet (select merchants), 2.5% p.a. interest, consumer InstaPay fee cut to P10 (news, https://tribune.net.ph/2026/07/04/maya-cuts-instapay-fee-to-p10; not a business tariff).
- Not published: settlement T+N for online products, payout fees (Unified Transfer or Business Deposit), transfer limits for Business Deposit, minimum volumes, SLA.
- RM/contact-sales gates (each cited above): card/GCash/QRPh acceptance enablement; void/refund enablement; formal UAT sandbox (Manager 1.0); Pay with Maya inside Checkout; Unified Transfer (pioneer); Business Deposit (select merchants); service-desk access; custom pricing; settlement schedule; non-Checkout sandbox keys.

## 6. Developer experience
- SDKs (https://developers.maya.ph/docs/development-kits): PHP, JS v2, Node, Ruby, Android v2, iOS v2 at github.com/PayMaya; no update dates on the page.
- API reference is ReadMe/OpenAPI-driven (operationIds like `createV1Webhook`); no downloadable spec link found. Plugins: Shopify, WooCommerce, Magento 2 (https://developers.maya.ph/docs/maya-plugins).
- Rate limit: "200 API request per second" for Checkout/Vault/Pay with Maya (https://developers.maya.ph/reference/limits-on-api-requests); 429 back-off advised in forum.
- Error format: JSON `{code, message}` plus `parameters[{field, description}]` on `2553`; e.g. `PY0009 "Payment does not exist."` (https://developers.maya.ph/reference/understanding-errors-in-maya-checkout; https://developers.maya.ph/docs/errors).
- Status: sandbox-only health page https://developers.maya.ph/page/sandbox-health; no production status page found.
- Changelog https://developers.maya.ph/changelog: 10 undated entries; newest references an April/May 2023 deadline, next a July 2022 hostname migration. Doc versions v5.17/v5.18/v6.00 exist in URLs; footer "(c) Copyright Maya 2025". Unified Transfer pages are clearly recent but undated. Verdict: core payments docs maintained but slowly; changelog stale since 2023.

## Gaps / could not verify
- Disbursement API v1 pages: 404 (all four URLs, incl. /v5.18/).
- dev-forum.maya.ph (root and all threads): 403.
- business-help.maya.net: 403; identified as Maya Mobile eSIM, not Maya PH.
- businesssupport.maya.ph and support.mayabank.ph (incl. Business Deposit fees article): Salesforce JS shell, no content.
- YouTube video description for User Access Management: not retrievable.
- Changelog entry dates: not shown on any page.
- Unified Transfer fees, settlement T+N, Business Deposit limits and CSV spec: absent from docs.
- Whether Unified Transfer to GCash uses mobile number as `account_number`: implied by definitions page, not shown in an example.

## Questions still worth emailing Maya (business.signup@maya.ph / partnercashsolutions@maya.ph)
1. Is Unified Transfer open to a new SME merchant now, or pioneer/enterprise only? Minimum volume?
2. Per-transfer fee for Unified Transfer to GCash (InstaPay) vs Maya-to-Maya vs PESONet, and who bears it?
3. Can a Business Deposit account be the Unified Transfer debit account (`MYYAPHM2XXX`), so collections settle and pay out from one balance?
4. Settlement schedule for Checkout/Pay with Maya/QRPh into Business Deposit (T+0/T+1, cutoffs, weekends)?
5. Business Deposit eligibility for a new merchant today; transfer limits; CSV template columns; recipient cap per batch.
6. Business Manager roles list: can we have separate admin, finance (maker/approver), and developer (API keys only) users? Audit log scope?
7. Does the Business Manager Applications tool or Checkout production-key flow require the account owner, or can a delegated user generate keys?
8. Is the Disbursement API v1 still offered, or fully replaced by Unified Transfer?
9. Refund path and timing for QRPh and GCash collections (docs say manual via email); any API refund planned?
10. Expected lead time from signup to production keys for Checkout + Pay with Maya for a Zamboanga-registered sole prop/corp, and whether an RM is assigned at our volume.
