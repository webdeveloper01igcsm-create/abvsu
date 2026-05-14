const crypto = require("crypto");
const Razorpay = require("razorpay");

const getRazorpayClient = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) {
    return null;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const createRazorpayOrder = async ({ amountRupees, receipt, notes = {} }) => {
  const client = getRazorpayClient();
  if (!client) {
    throw new Error("Payment gateway configuration error");
  }

  return client.orders.create({
    amount: Math.round(Number(amountRupees) * 100),
    currency: "INR",
    receipt: String(receipt || `rcpt_${Date.now()}`).slice(0, 40),
    notes,
  });
};

const buildRazorpayAutoSubmitHtml = ({
  keyId,
  amountPaise,
  orderId,
  callbackUrl,
  cancelUrl,
  name = process.env.PAYMENT_BRAND_NAME || "ABVSU",
  description = "Payment",
  customerName = "",
  customerEmail = "",
}) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Processing Payment</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>
  <body>
    <script>
      (function () {
        var options = {
          key: ${JSON.stringify(keyId)},
          amount: ${Number(amountPaise)},
          currency: "INR",
          name: ${JSON.stringify(name)},
          description: ${JSON.stringify(description)},
          order_id: ${JSON.stringify(orderId)},
          callback_url: ${JSON.stringify(callbackUrl)},
          redirect: true,
          prefill: {
            name: ${JSON.stringify(customerName || "")},
            email: ${JSON.stringify(customerEmail || "")}
          },
          modal: {
            ondismiss: function () {
              window.location.href = ${JSON.stringify(cancelUrl)};
            }
          }
        };
        var rzp = new Razorpay(options);
        rzp.open();
      })();
    </script>
  </body>
</html>
`;

const verifyRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
  keySecret = process.env.RAZORPAY_KEY_SECRET,
}) => {
  if (!orderId || !paymentId || !signature || !keySecret) {
    return false;
  }
  const generated = crypto
    .createHmac("sha256", String(keySecret))
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return generated === String(signature);
};

module.exports = {
  buildRazorpayAutoSubmitHtml,
  createRazorpayOrder,
  verifyRazorpaySignature,
};
