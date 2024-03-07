const mongoose = require("mongoose");

const PaymentModesSchema = new mongoose.Schema({
  mode_title: {
    type: String,
  },
  mode_uuid: {
    type: String,
  },
  ledger_uuid: {
    type: String,
  },
});

module.exports = mongoose.model("payment_modes", PaymentModesSchema);
