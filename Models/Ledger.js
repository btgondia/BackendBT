const mongoose = require("mongoose");

const Ledger = new mongoose.Schema({
  ledger_uuid: { type: String },
  ledger_group_uuid: { type: String },
  ledger_title: { type: String },
  created_at: { type: Number },
  gst: {
    type: String,
  },
  transaction_tags: [
    {
      type: String,
    },
  ],
  opening_balance: [
    {
      amount: {
        type: Number,
      },
      date: {
        type: Number,
      },
    },
  ],
  closing_balance: {
    type: Number,
  },
  transaction_tags: [
    {
      type: String,
    },
  ],
});

module.exports = mongoose.model("ledger", Ledger);
