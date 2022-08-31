const mongoose = require("mongoose");

const DetailsSchema = new mongoose.Schema({
  next_invoice_number: { type: Number },
  next_receipt_number: { type: String },

  timer_run_at: { type: Number },
});

module.exports = mongoose.model("details", DetailsSchema);
