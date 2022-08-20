const mongoose = require("mongoose");

const DetailsSchema = new mongoose.Schema({
  next_invoice_number: { type: Number },
  next_receipt_number: { type: String },
  compare_stock_level: { type: Number },
  maintain_stock_days: { type: Number },
  timer_run_at: { type: Number },
});

module.exports = mongoose.model("details", DetailsSchema);
