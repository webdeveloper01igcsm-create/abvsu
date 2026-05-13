# CCAvenue Payment Flow — Developer Documentation

This document explains the end-to-end CCAvenue payment integration in this project. It is written to help a developer adapting the system for a different payment gateway (e.g., Razorpay) understand every moving part and where changes are needed.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Environment Variables](#2-environment-variables)
3. [Encryption Utility](#3-encryption-utility)
4. [Payment Database Model](#4-payment-database-model)
5. [Two Distinct Payment Flows](#5-two-distinct-payment-flows)
   - [Flow A — Subscription / License Renewal](#flow-a--subscription--license-renewal)
   - [Flow B — Document Services (Certificates, Records)](#flow-b--document-services-certificates-records)
6. [Backend Routes](#6-backend-routes)
7. [Mobile App Integration (React Native)](#7-mobile-app-integration-react-native)
8. [Student Web Portal Integration (React)](#8-student-web-portal-integration-react)
9. [Admin Dashboard — Payment Management](#9-admin-dashboard--payment-management)
10. [Fee Schedule](#10-fee-schedule)
11. [Razorpay Migration Guide](#11-razorpay-migration-guide)

---
  
## 1. Architecture Overview

```
Student (Mobile App / Web Portal)
        │
        │  POST /api/<service>/apply   (sends form fields + files)
        ▼
Backend (Node.js / Express)
  ├── Creates a Payment record  { order_status: "Pending" }
  ├── Creates a service record  { paymentStatus: "Pending" }
  ├── Encrypts payment params using AES-128/256-CBC (CCAvenue spec)
  └── Returns an HTML form that auto-submits to CCAvenue
        │
        ▼
CCAvenue Payment Gateway  (https://secure.ccavenue.com)
  └── Student completes payment (card / UPI / net banking / wallet)
        │
        │  POST /api/<service>/ccavenue-response   (encrypted response)
        ▼
Backend — handleCCAvenueResponse()
  ├── Decrypts the response using the same key/IV
  ├── Updates Payment record with full transaction details
  ├── Updates service record  { paymentStatus: "Paid" | "Failed" }
  ├── Generates a PDF payment slip (on success)
  └── Redirects student → status page  (web URL or mobile deep link)
```

---

## 2. Environment Variables

All three CCAvenue credentials come from process.env:

| Variable | Purpose |
|---|---|
| `WORKING_KEY` | Secret key used to derive the AES encryption key (MD5-hashed) |
| `ACCESS_CODE` | CCAvenue merchant access code, sent in plain text with the form |
| `MERCHANT_ID` | CCAvenue merchant ID, included in the encrypted payment params |
| `BACKEND_URL` / `BASE_URL` | Used to build `redirect_url` and `cancel_url` sent to CCAvenue |
| `STUDENT_PORTAL_URL` | Base URL of the student web portal for post-payment redirects |
| `MOBILE_APP_SCHEME` | Custom URI scheme for deep-linking back into the mobile app |

> **Razorpay equivalent**: Replace `WORKING_KEY`, `ACCESS_CODE`, `MERCHANT_ID` with `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.

---

## 3. Encryption Utility

**File**: [`sgtumobileapplicationdashboard-Backend/utils/ccavutil.js`](sgtumobileapplicationdashboard-Backend/utils/ccavutil.js)

CCAvenue requires payment parameters to be AES-encrypted before submission and sends its response the same way.

```
Key derivation:
  workingKey  →  MD5 hash  →  Base64  →  AES key (16 or 32 bytes)

IV:
  Fixed 16-byte array [0x00..0x0f] → Base64

Encryption (request):
  plainText = querystring of payment params
  encRequest = AES-CBC encrypt(plainText, keyBase64, ivBase64)  → hex string

Decryption (response):
  encResp = hex string received from CCAvenue in POST body
  decrypted = AES-CBC decrypt(encResp, keyBase64, ivBase64)     → querystring
  params = querystring.parse(decrypted)
```

The same `encrypt` / `decrypt` functions are reused identically in every service controller. The key and IV derivation is always:

```js
const md5 = crypto.createHash("md5").update(workingKey).digest();
const keybase64 = Buffer.from(md5).toString("base64");
const ivBase64 = Buffer.from([
  0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07,
  0x08,0x09,0x0a,0x0b,0x0c,0x0d,0x0e,0x0f,
]).toString("base64");
```

> **Razorpay**: This entire file and all encrypt/decrypt calls can be deleted. Razorpay uses HMAC-SHA256 signature verification instead — much simpler.

---

## 4. Payment Database Model

**File**: [`sgtumobileapplicationdashboard-Backend/models/Payment.js`](sgtumobileapplicationdashboard-Backend/models/Payment.js)

```
Payment {
  student_id   : ObjectId → Student
  order_id     : String   (unique, format varies by flow — see below)
  tracking_id  : String   (from CCAvenue after payment)
  bank_ref_no  : String
  order_status : String   ("Pending" | "Success" | "Failed" | "Aborted" | "Cancelled")
  failure_message : String
  payment_mode : String   (e.g. "Credit Card", "UPI")
  card_name    : String
  status_code  : String
  status_message : String
  currency     : String   ("INR")
  amount       : Number   (in rupees)
  trans_date   : Date
  createdAt, updatedAt    (timestamps)
}
```

Every service (character certificate, migration certificate, etc.) creates one `Payment` document before redirecting to CCAvenue. The service-specific record (e.g., `CharacterCertificate`) holds a `payment: ObjectId` reference back to this document.

---

## 5. Two Distinct Payment Flows

### Flow A — Subscription / License Renewal

**Controllers**: [`payment.Controller.js`](sgtumobileapplicationdashboard-Backend/controllers/payment.Controller.js) — `createOrder` + `verifyPayment` / `verifyDocs`

**When used**: Student app subscription (₹504) and the older generic Application/AcademicDoc flow.

#### Step-by-step

**Step 1 — Create Order**
```
POST /api/payment/create-order
Auth: verifyStudentToken
Body: { userId, name, email }
```
1. Reads `WORKING_KEY`, `ACCESS_CODE`, `MERCHANT_ID` from env.
2. Generates `order_id = Date.now()` (plain timestamp string).
3. Creates `Payment` record: `{ order_status: "Pending", amount: 504, ... }`.
4. Builds querystring of payment params (billing name, amount, order_id, redirect/cancel URLs, currency, language).
5. Derives AES key from MD5 of `WORKING_KEY`; encrypts params → `encRequest`.
6. Returns raw HTML: an auto-submitting `<form>` POSTing `encRequest` + `access_code` to `https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction`.

**Step 2 — Student pays on CCAvenue**

**Step 3 — CCAvenue posts encrypted response**
```
POST /api/payment/verify-payment    (used by verifyPayment — checks referer/origin header)
POST /api/payment/verify-docs       (used by verifyDocs — no auth; for Application flow)
```
Both handlers:
1. Receive `encResp` in body (for `verify-payment`) **or** plain form fields (for `verify-docs`, CCAvenue posts unencrypted fields to this one).
2. Find `Payment` by `order_id`.
3. Update all transaction fields: `tracking_id`, `bank_ref_no`, `order_status`, `amount`, `trans_date`, etc.
4. If `order_status === "Success"`:
   - `verifyPayment`: activates student subscription for 1 year (`subscriptionDetails.isActive = true`).
   - `verifyDocs`: finds linked `Application` → sets `amountPaid`, `paymentVerified = true`, `status = "paid"`.
5. Returns an HTML receipt page.

---

### Flow B — Document Services (Certificates, Records)

**Controllers** (one per service — all follow the same pattern):

| Service | Controller | Route prefix |
|---|---|---|
| Character Certificate | `characterCertificate.Controller.js` | `/character-certificate` |
| Migration Certificate | `migrationCertificate.Controller.js` | `/migration-certificate` |
| Course Completion Certificate | `courseCompletionCertificate.Controller.js` | `/course-completion-certificate` |
| Provisional Degree Certificate | `degreeCertificate.Controller.js` (or similar) | `/provisional-degree-certificate` |
| Academic Record Verification | `academicRecordVerification.Controller.js` | `/academic-records` |
| Duplicate Document | `duplicateDocument.Controller.js` | `/duplicate-document` |

#### Step-by-step (Character Certificate as canonical example)

**Step 1 — Student submits application form**
```
POST /api/character-certificate/apply
Auth: verifyStudentToken
Body: multipart/form-data (address, delivery mode, marksheet PDF, ...)
Header: x-client: mobile   ← set by mobile app to flag mobile flow
```
1. Validates all form fields.
2. Determines `amount`: Normal = ₹2000, Express = ₹3500.
3. Generates `order_id = "CC" + Date.now() + uuid.substring(0,6)` (prefix differs per service).
4. Determines `redirect_url` and `cancel_url`:
   - **Mobile** (`x-client: mobile`): both point to `${BACKEND_URL}/character-certificate/ccavenue-response?return=mobile`
   - **Web**: `redirect_url` → backend callback; `cancel_url` → student portal status page with `?cancelled=true`
5. Creates `Payment` record: `{ order_status: "Pending", amount, ... }`.
6. Creates `CharacterCertificate` record: `{ payment: payment._id, paymentStatus: "Pending", amount, ... }`.
7. Encrypts payment params → `encRequest`.
8. Returns the CCAvenue auto-submit HTML form (same structure as Flow A).

**Step 2 — Student pays on CCAvenue**

**Step 3 — CCAvenue posts encrypted response**
```
POST /api/character-certificate/ccavenue-response
Auth: NONE (public endpoint)
Query: ?return=mobile    ← present only for mobile clients
Body: { encResp: "<hex string>" }
```
`handleCCAvenueResponse()`:
1. Reads `encResp` from body.
2. Derives same AES key/IV, calls `ccav.decrypt(encResp, keybase64, ivBase64)`.
3. Parses decrypted querystring → `params`.
4. Finds `Payment` by `params.order_id`.
5. Updates all payment fields on the `Payment` record.
6. Finds `CharacterCertificate` where `payment === payment._id`.
7. Sets `record.paymentStatus = isSuccess ? "Paid" : "Failed"`.
8. If success: calls `generatePaymentSlip(record, payment)` → writes a PDF to `document/slips/` → saves path in `record.paymentSlipUrl`.
9. Builds redirect URL:
   - **Mobile success**: `${MOBILE_APP_SCHEME}://services/character-certificate/status?payment=success&orderId=...`
   - **Mobile cancelled**: `${MOBILE_APP_SCHEME}://services/character-certificate/status?cancelled=true`
   - **Mobile failed**: `${MOBILE_APP_SCHEME}://services/character-certificate/status?payment=failed&reason=...`
   - **Web success/failed/cancelled**: `${STUDENT_PORTAL_URL}/authenticate/character-certificate/status?payment=success|failed|cancelled=true`
10. For **non-success**: returns an HTML page with a JS `window.location.href` redirect (1.2 s delay).
11. For **success**: returns an HTML receipt page with a button linking to the status page and the deep-link redirect.

#### Retry Payment

```
POST /api/character-certificate/:id/retry-payment
Auth: verifyStudentToken
```
- Finds existing `CharacterCertificate` by ID; validates ownership and that `paymentStatus !== "Paid"`.
- Creates a new `Payment` record (new `order_id`).
- Updates the certificate record's `payment` reference to the new payment.
- Re-encrypts and returns a new CCAvenue form — same flow from Step 1 onwards.

---

## 6. Backend Routes

### payment.Routes.js

```
GET  /api/payment/                 → getAllPayment      (admin, requires "Payment Management" permission)
POST /api/payment/create-order     → createOrder        (student auth)
POST /api/payment/form             → storePaymentForm   (student auth — stores HTML in memory for 5 min, returns token)
GET  /api/payment/form/:token      → renderPaymentForm  (no auth — serves stored form HTML once, then deletes it)
POST /api/payment/verify-payment   → verifyPayment      (admin auth — checks referer/origin)
POST /api/payment/verify-docs      → verifyDocs         (no auth — CCAvenue callback for Application flow)
```

### Per-service routes (example: character-certificate)

```
POST /api/character-certificate/apply                → apply()              (student auth)
POST /api/character-certificate/ccavenue-response    → handleCCAvenueResponse()  (NO auth)
POST /api/character-certificate/:id/retry-payment    → retryPayment()       (student auth)
GET  /api/character-certificate/my                   → getMyApplications()  (student auth)
GET  /api/character-certificate/:id/payment-slip     → getPaymentSlip()     (student auth)
```

> The same pattern repeats for every document service controller.

---

## 7. Mobile App Integration (React Native)

### Flow

1. Student presses "Pay Now" in a service screen (e.g., `license-renewal.js`).
2. App calls the service's `apply` API (via `submitModuleApplication` in [`lib/studentServicesApi.js`](NewSGTUApp-main/lib/studentServicesApi.js)).
3. The response is `Content-Type: text/html` — the CCAvenue auto-submit form.
4. App stores the HTML in `ApiContext.paymentHtml` state, then navigates to `/PaymentWebView?source=<service-key>`.

### PaymentWebView ([`app/PaymentWebView.js`](NewSGTUApp-main/app/PaymentWebView.js))

```
PaymentWebView
  ├── Reads paymentHtml from context (preferred) OR fetches via POST /payment/create-order
  ├── Renders html via <WebView source={{ html: htmlForm }} />
  ├── WebView loads the form → auto-submits → navigates to ccavenue.com
  │
  ├── onShouldStartLoadWithRequest(nextUrl) — intercepts every navigation
  │     ├── Allows: ccavenue.com, transaction.do, /ccavenue-response
  │     ├── On payment outcome URLs (payment=success|failed, cancelled=true, reason=):
  │     │     └── routeBySource(query) — navigates app to status screen
  │     └── On /authenticate/<service>/status or /student-verification:
  │           └── Maps to the correct app route
  │
  └── Post-payment: app lands on /(tabs)/services/<service>/status
        which fetches the record and shows payment status
```

**Key detection patterns the WebView watches for** (in `nextUrl`):
- `cancelled=true` → user cancelled
- `payment=success` → payment confirmed
- `payment=failed` → payment failed
- `reason=` → failure reason present

**Source → Route mapping** (defined in [`lib/serviceModules.js`](NewSGTUApp-main/lib/serviceModules.js) as `PAYMENT_REDIRECT_PATHS`):
- `character-certificate` → `/(tabs)/services/character-certificate/status`
- `academic-records` → `/(tabs)/services/academic-records/status`
- etc.

**"Open in Browser" fallback**: The WebView offers an option to open the form in the system browser. It POSTs the HTML to `POST /payment/form` (gets a one-time token), then calls `GET /payment/form/:token` to retrieve and open it — this allows the system browser to handle the payment page.

---

## 8. Student Web Portal Integration (React)

**File**: [`studendashboard/src/Pages/Protected/NewApplication.js`](studendashboard/src/Pages/Protected/NewApplication.js)

```js
const res = await axios.post(`${apiBase}/${endpoint}/apply`, formData, config);
const paymentFormHTML = res.data;        // raw HTML string from backend
const paymentWindow = window.open("", "_blank");
paymentWindow.document.write(paymentFormHTML);
paymentWindow.document.close();
// ↑ The form auto-submits and navigates the new tab to CCAvenue
// After payment, CCAvenue redirects back to the backend callback URL
// which in turn redirects to /authenticate/<service>/status?payment=success
```

The web portal opens a new blank tab, writes the CCAvenue form HTML directly, and lets it auto-submit. No iframes or SDKs involved.

---

## 9. Admin Dashboard — Payment Management

**File**: [`sgtumobileapplicationdashboard-Frontend/src/pages/Auth/Payment/Payment.js`](sgtumobileapplicationdashboard-Frontend/src/pages/Auth/Payment/Payment.js)

- Fetches all `Payment` records via `GET /api/payment/` (requires "Payment Management" permission).
- Displays a paginated, searchable table with columns: Order ID, Amount, Status badge, Tracking ID, Bank Ref, Payment Mode, Date.
- Status badges: `Success` (green), `Pending` (yellow), `Failed`/others (red).
- No manual payment triggering from this view; it is read-only.

---

## 10. Fee Schedule

| Service | Normal | Express |
|---|---|---|
| Character Certificate | ₹2,000 | ₹3,500 |
| Migration Certificate | ₹5,000 | ₹7,500 |
| Course Completion Certificate | ₹3,000 | ₹5,000 |
| Provisional Degree Certificate | ₹3,000 | ₹5,000 |
| Academic Records Verification — Email | ₹1,000 (Normal) / ₹2,500 (Express) | — |
| Academic Records Verification — Post | ₹1,500 (Normal) / ₹4,000 (Express) | — |
| Subscription (License Renewal) | ₹504 (fixed) | — |

Fee values are **hardcoded** in each controller's `apply()` function (not in a config file or database).

---

## 11. Razorpay Migration Guide

This section maps every CCAvenue-specific piece to its Razorpay equivalent.

### What to Replace

| CCAvenue Component | Location | Razorpay Replacement |
|---|---|---|
| `utils/ccavutil.js` (AES encrypt/decrypt) | Backend | Delete. Use Razorpay SDK: `npm install razorpay` |
| Key derivation (MD5 + Base64) | Every service controller's `apply()` | Replace with Razorpay `orders.create()` call |
| `encRequest` + `ACCESS_CODE` in HTML form | Every `apply()` return | Return `{ orderId, amount, currency, key }` JSON instead |
| Auto-submit HTML form response | `apply()` endpoints | Return JSON with Razorpay order details |
| `handleCCAvenueResponse()` (decrypts `encResp`) | Every service controller | Replace with `verifySignature()` handler |
| CCAvenue signature check (none — vulnerability) | All response routes | HMAC-SHA256: `validatePaymentVerification()` from Razorpay SDK |
| `redirect_url` / `cancel_url` in payment params | Every `apply()` | Not needed — Razorpay uses webhook + client-side callback |
| `process.env.WORKING_KEY`, `ACCESS_CODE`, `MERCHANT_ID` | `.env` | Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |

### New Flow with Razorpay

**Backend — apply()** (replaces the CCAvenue form generation):
```js
// 1. Create Razorpay order
const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
const rzpOrder = await razorpay.orders.create({ amount: amount * 100, currency: "INR", receipt: order_id });

// 2. Save Payment record (same as before, just use rzpOrder.id as order_id)
await Payment.create({ student_id, order_id: rzpOrder.id, currency: "INR", amount, order_status: "Pending" });
await CharacterCertificate.create({ ..., payment: payment._id, paymentStatus: "Pending" });

// 3. Return JSON (not HTML)
return res.json({ orderId: rzpOrder.id, amount: amount * 100, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID });
```

**Backend — new webhook/callback handler** (replaces `handleCCAvenueResponse`):
```js
const { validatePaymentVerification } = require("razorpay/dist/utils/razorpay-utils");

const handleRazorpayResponse = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const isValid = validatePaymentVerification(
    { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
    razorpay_signature,
    process.env.RAZORPAY_KEY_SECRET
  );

  if (!isValid) return res.status(400).json({ message: "Invalid signature" });

  // Same DB update logic as before
  const payment = await Payment.findOne({ order_id: razorpay_order_id });
  payment.order_status = "Success";
  payment.tracking_id = razorpay_payment_id;
  await payment.save();

  const record = await CharacterCertificate.findOne({ payment: payment._id });
  if (record) {
    record.paymentStatus = "Paid";
    record.paymentSlipUrl = await generatePaymentSlip(record, payment);
    await record.save();
  }

  return res.json({ success: true });
};
```

**Mobile App** — Replace `PaymentWebView` with Razorpay React Native SDK:
```js
import RazorpayCheckout from "react-native-razorpay";

// After getting order details from your apply() API:
const options = {
  description: "Character Certificate",
  currency: "INR",
  key: keyId,
  amount: amount,      // in paise
  order_id: orderId,
  name: "SGTU",
  prefill: { name, email },
};

RazorpayCheckout.open(options)
  .then((data) => {
    // POST data to your new handleRazorpayResponse endpoint
    // Then navigate to status screen
  })
  .catch(() => router.replace(`/(tabs)/services/${source}/status?cancelled=true`));
```
> The entire `PaymentWebView.js` file becomes unnecessary — the Razorpay SDK handles the payment UI natively.

**Web Portal** — Replace `window.open` + `document.write` with Razorpay Checkout script:
```js
const res = await axios.post(`${apiBase}/apply`, formData, config);
const { orderId, amount, keyId } = res.data;

const options = {
  key: keyId, amount, currency: "INR", order_id: orderId,
  handler: async (response) => {
    await axios.post(`${apiBase}/razorpay-response`, response, { headers: { Authorization: `Bearer ${token}` } });
    navigate(`/authenticate/character-certificate/status?payment=success`);
  },
};
const rzp = new window.Razorpay(options);
rzp.open();
```

### What Stays the Same

- `Payment` MongoDB model — field names are reusable (use `tracking_id` for `razorpay_payment_id`).
- `generatePaymentSlip()` — PDF generation logic is gateway-agnostic.
- Service record models (`CharacterCertificate`, etc.) — no changes needed.
- `paymentStatus: "Pending" | "Paid" | "Failed"` enum on service records.
- Admin dashboard payment list view — reads from the same `Payment` collection.
- Auth middleware (`verifyStudentToken`, `verifyToken`) — no changes.
- Fee amounts — still hardcoded in each controller; change values as needed for the new org.
- `order_id` prefix convention per service (e.g., `CC`, `PDC`, `MC`) — keep for readability.

### Security Note

The current CCAvenue `ccavenue-response` routes have **no authentication** — anyone can POST to them. Razorpay's `validatePaymentVerification` (HMAC-SHA256) must be called on every callback to cryptographically verify the payment came from Razorpay. Do not skip this step.
