const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  session: {
    type: String,
    required: true,
    unique: true
  },
  year: {
    type: Number,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;