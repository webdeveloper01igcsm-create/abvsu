const crypto = require("crypto");

const workingKey = "A1B2C3D4E5F6G7H8"; // dummy key
const plainText = "merchant_id=123456&order_id=ORD1234&currency=INR&amount=100.00&redirect_url=https://your-site.com/success&cancel_url=https://your-site.com/fail&language=EN";

function encrypt(text, key) {
  const cipher = crypto.createCipheriv("aes-128-cbc", key, key);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

const encRequest = encrypt(plainText, workingKey);
console.log("Encrypted Request:", encRequest);
