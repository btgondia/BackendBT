const mongoose = require("mongoose");

const OrdersSchema = new mongoose.Schema({
  notification_uuid: { type: String },
  contact: { type: String },
  message: { type: String },

  invoice_number: {
    type: Number,
  },

  created_at: {
    type: Number,
  },
});

module.exports = mongoose.model("notification_logs", OrdersSchema);
