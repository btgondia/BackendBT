const mongoose = require("mongoose");

const ReceiptsSchema = new mongoose.Schema({
  user_uuid: {
    type: String,
  },
  order_uuid: {
    type: String,
  },
  receipt_number: {
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
  modes: [
    {
      mode_uuid: { type: String },
      amt: { type: Number },
      coin: { type: Number },
      status: { type: Number },
    },
  ],
});

module.exports = mongoose.model("receipts", ReceiptsSchema);
