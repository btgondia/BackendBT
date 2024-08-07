const mongoose = require("mongoose");

const OrdersSchema = new mongoose.Schema({
  notification_uuid: { type: String },
  contact: { type: String },
  message: [{ text: { type: String } }],

  invoice_number: {
    type: String,
  },

  created_at: {
    type: Number,
  },
});

module.exports = mongoose.model("notification_logs", OrdersSchema);
