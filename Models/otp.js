const mongoose = require("mongoose");

const OTP = mongoose.Schema({
  expiry_time: { type: Number },
  mobile: { type: String },
  counter_uuid: { type: String },
  otp: { type: Number },
});

module.exports = mongoose.model("OTPs", OTP);
