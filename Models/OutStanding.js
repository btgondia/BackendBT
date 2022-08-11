const mongoose = require("mongoose");

const OutstandingSchema = new mongoose.Schema({
  user_uuid: {
    type: String,
  },
  order_uuid: {
    type: String,
  },
  trip_uuid: {
    type: String,
  },
  counter_uuid: {
    type: String,
  },
  time: {
    type: Number,
  },
  invoice_number: {
    type: Number,
  },
  amount: { type: Number },
});

module.exports = mongoose.model("outstanding", OutstandingSchema);
