const mongoose = require("mongoose");

const DetailsSchema = new mongoose.Schema({
  next_invoice_number: { type: Number },
});

module.exports = mongoose.model("details", DetailsSchema);
