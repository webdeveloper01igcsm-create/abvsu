const Razorpay = require('razorpay');
const crypto = require("crypto");
const Payment = require('../models/Payment');
const Student = require('../models/Student');

const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    studentId, // <-- Get this from frontend too
    amount,
    currency
  } = req.body;

  const generatedSignature = crypto
  .createHmac("sha256", "FLi0ERXPhvhzcVJ7KSoRRAAG")
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest("hex");

if (generatedSignature === razorpay_signature) {
  try {
    const payment = new Payment({
      studentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      currency
    });

    await payment.save();

    const studentUpdate = await Student.findById(studentId)
    
    let newExpiryDate;
    const currentDate = new Date();
    console.log(studentUpdate.subscriptionDetails);
    
    if (
      studentUpdate.subscriptionDetails?.expiryDate &&
      new Date(studentUpdate.subscriptionDetails.expiryDate) > currentDate
    ) {
      // Extend from current expiry if not yet expired
      newExpiryDate = new Date(studentUpdate.subscriptionDetails.expiryDate);
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
    } else {
      // Else set from today
      newExpiryDate = new Date();
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
    }
    console.log(newExpiryDate);
    
    await Student.updateOne(
      { _id: studentId },
      {
        $set: {
          "subscriptionDetails.isActive": true,
          "subscriptionDetails.expiryDate": newExpiryDate
        }
      }
    );

    res.status(200).json({ success: true, message: "Payment verified and saved" });
  } catch (err) {
    console.error("Failed to save payment", err);
    res.status(500).json({ success: false, message: "Failed to save payment" });
  }
} else {
  return res.status(400).json({ success: false, message: "Invalid signature" });
}
};

const razorpayInstance = new Razorpay({
  key_id: 'rzp_test_yZ9zz0HR9aFRkb',
  key_secret: 'FLi0ERXPhvhzcVJ7KSoRRAAG',
});

const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;  // Amount should be in paise (1 INR = 100 paise)
    
    const options = {
      amount: amount * 100, // Convert amount to paise
      currency: "INR",
      receipt: "order_receipt_12345",
      payment_capture: 1, // Automatic capture after payment
    };

    const order = await razorpayInstance.orders.create(options);
    res.json({
      id: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ error: error.message });
  }
};

const payments = async (req, res) => {
  try {
    const payments = await razorpayInstance.payments.all({
      from: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000), // last 30 days
      to: Math.floor(Date.now() / 1000),
      count: 50 // limit
    });
    res.json(payments.items);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

module.exports = {createOrder, verifyPayment, payments }