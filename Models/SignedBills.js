const mongoose = require("mongoose");

const RoutesSchema = new mongoose.Schema({
  user_uuid: {
    type: String,
  },
  order_uuid: {
    type: String,
  },
  status: {
    type: Number,
  },
  amount: {
    type: Number,
  },
  received_time: {
    type: String,
  },
  time_stamp: {
    type: Number,
  },
  invoice_number: {
    type: String,
  },
});

module.exports = mongoose.model("signed_bills", RoutesSchema);
