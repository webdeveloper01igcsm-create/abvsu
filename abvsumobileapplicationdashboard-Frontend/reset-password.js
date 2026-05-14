const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // You might need to install bcrypt or bcryptjs

// Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/your_database_name'; // Replace with your backend's DB URI
const TARGET_EMAIL = 'adminhead@admin.com';
const NEW_PASSWORD = 'NewAdminPassword123!';

async function resetPassword() {
  try {
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully.');

    const db = mongoose.connection.db;
    
    // Change 'users' to your actual users collection name (e.g., 'admins', 'Users')
    const usersCollection = db.collection('users'); 

    // Find the user
    const user = await usersCollection.findOne({ email: TARGET_EMAIL });
    
    if (!user) {
      console.error(`User with email ${TARGET_EMAIL} not found in the database.`);
      process.exit(1);
    }

    console.log(`User found. Hashing new password...`);
    
    // Hash the new password using bcrypt (standard for Node.js backends)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

    // Update the password in the database
    const result = await usersCollection.updateOne(
      { email: TARGET_EMAIL },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount === 1) {
      console.log(`\nSuccess! The password for ${TARGET_EMAIL} has been reset.`);
      console.log(`New Password: ${NEW_PASSWORD}`);
    } else {
      console.log('Password was not updated (it might already be set to this hash, or another error occurred).');
    }

  } catch (error) {
    console.error('An error occurred during password reset:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

resetPassword();
