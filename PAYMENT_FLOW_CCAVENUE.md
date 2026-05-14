# ABVSU Payment Flow (Razorpay)

This document describes the current end-to-end Razorpay payment implementation for ABVSU across backend, mobile app, and web flows.

## Overview

The system uses Razorpay for:

- Student license renewal
- Subscription and application payment verification flow
- Student document services (character certificate, migration, course completion, provisional degree, duplicate document, transcript, academic records, degree verification)

At a high level, each service:

1. Creates a local Payment record with Pending status.
2. Creates a Razorpay order using the backend utility.
3. Returns auto-submit checkout HTML for WebView/browser checkout.
4. Receives Razorpay callback payload.
5. Verifies the Razorpay signature using HMAC-SHA256.
6. Updates Payment and service records to Paid or Failed.
7. Redirects to web status page or mobile deep link.

## Core Backend Utility

Source of truth:

- sgtumobileapplicationdashboard-Backend/utils/razorpayGateway.js

Exports:

- createRazorpayOrder({ amountRupees, receipt, notes })
- buildRazorpayAutoSubmitHtml({ keyId, amountPaise, orderId, callbackUrl, cancelUrl, ... })
- verifyRazorpaySignature({ orderId, paymentId, signature, keySecret })

Environment variables required:

- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET

Supporting redirect variables commonly used in controllers:

- BACKEND_URL or BASE_URL
- STUDENT_PORTAL_URL
- MOBILE_APP_SCHEME
- FRONTEND_URL

## Data Model

Payment model:

- sgtumobileapplicationdashboard-Backend/models/Payment.js

Important fields:

- order_id (stores Razorpay order id for gateway-driven flows)
- tracking_id (stores Razorpay payment id)
- order_status (Pending, Success, Failed, Cancelled, Aborted)
- payment_gateway (default Razorpay)
- payment_source and payment_purpose
- amount, currency, trans_date

Service models continue using:

- payment reference (ObjectId to Payment)
- paymentStatus (Pending, Paid, Failed)
- paymentSlipUrl (when applicable)

## Backend Routes and Controllers

### Generic payment routes

- POST /api/payment/create-order
- POST /api/payment/form
- GET /api/payment/form/:token
- POST /api/payment/verify-payment
- POST /api/payment/verify-docs

Files:

- sgtumobileapplicationdashboard-Backend/routes/payment.Routes.js
- sgtumobileapplicationdashboard-Backend/controllers/payment.Controller.js

### License renewal routes

- POST /student/license/create-order
- POST /student/license-razorpay-response

Files:

- sgtumobileapplicationdashboard-Backend/routes/student.Routes.js
- sgtumobileapplicationdashboard-Backend/controllers/student.Controller.js

### Document service payment callbacks

Each service follows this shape:

- POST /api/<service>/apply
- POST /api/<service>/razorpay-response
- POST /api/<service>/:id/retry-payment

Representative controllers:

- characterCertificate.Controller.js
- migrationCertificate.Controller.js
- courseCompletionCertificate.Controller.js
- provisionalDegreeCertificate.Controller.js
- duplicateDocument.Controller.js
- transcriptCertificate.Controller.js
- academicRecordVerification.Controller.js
- degreeVerification.Controller.js

## Mobile App Flow

Key files:

- NewSGTUApp-main/app/PaymentWebView.js
- NewSGTUApp-main/lib/studentServicesApi.js

Flow:

1. App submits apply request for a module.
2. Backend returns Razorpay auto-submit HTML.
3. App stores HTML in context and opens PaymentWebView with source key.
4. WebView loads Razorpay checkout script and opens Razorpay modal.
5. Callback URLs resolve to backend razorpay-response endpoints.
6. Backend returns redirect/deep link URL with payment outcome parameters.
7. App routes to service status pages.

Common outcome query parameters handled by the WebView:

- payment=success
- payment=failed
- cancelled=true
- reason=<message>

## Web Flow

Web portals can open the returned HTML in a new window/tab.
After callback verification, backend redirects to status routes in the student portal.

## E2E Validation Script

License flow checker:

- sgtumobileapplicationdashboard-Backend/scripts/e2e-license-flow.js

The script validates that order creation returns Razorpay markup by checking:

- https://checkout.razorpay.com/v1/checkout.js
- new Razorpay(options)
- callback_url
- order_id

## Security Expectations

Every Razorpay callback handler must verify:

- razorpay_order_id
- razorpay_payment_id
- razorpay_signature

Verification rule:

HMAC_SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET) == razorpay_signature

If verification fails, payment must not be marked success.

## Retry Payment Behavior

Retry endpoints create a new pending Payment with a new gateway order reference and repoint the service record to the new payment id.

## Migration Cleanup Notes

CCAvenue legacy artifacts retired in this migration pass:

- Removed: sgtumobileapplicationdashboard-Backend/utils/ccavutil.js
- Removed: sgtumobileapplicationdashboard-Backend/utils/encrypt.js
- Updated: sgtumobileapplicationdashboard-Backend/scripts/e2e-license-flow.js assertions from CCAvenue markers to Razorpay markers

There should be no active runtime dependencies on CCAvenue fields such as:

- encRequest
- encResp
- transaction.do
- WORKING_KEY
- ACCESS_CODE
- MERCHANT_ID

## Operational Checklist

1. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are configured in each environment.
2. Confirm payment callback URLs point to /razorpay-response endpoints.
3. Confirm Payment records transition correctly for success, failed, and cancelled outcomes.
4. Confirm deep links route users to the correct service status page in mobile app.
5. Confirm admin payment listing reads expected order status and gateway fields.
