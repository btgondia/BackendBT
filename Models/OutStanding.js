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
  remarks: {
    type: String,
  },
  time: {
    type: Number,
  },
  type: {
    type: Number,
  },
  reminder: {
    type: Number,
  },
  invoice_number: {
    type: String,
  },
  outstanding_uuid: {
    type: String,
  },
  amount: { type: Number },
  status: { type: Number },
  collection_tag_uuid: { type: String },
});

module.exports = mongoose.model("outstanding", OutstandingSchema);
