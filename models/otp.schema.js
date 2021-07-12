const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema(
  {
    userAccount: String,
    code: String,
    otpExpiry: Date,
    status: {
      type: String,
      default: "UNVERIFIED"
    },
    ipAddress: String,
    retries: {
      type: Number, 
      default: 0
    }
  },
  {
    timestamps: true,
  },
);

const Otp = mongoose.model('Otp', OtpSchema);

module.exports = Otp; 
