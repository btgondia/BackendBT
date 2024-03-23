const mongoose = require("mongoose");

const accountingVoucherSchema = new mongoose.Schema({
  accounting_voucher_uuid: { type: String },
  accounting_voucher_number: { type: String },
  created_at: { type: Number },
  created_by: { type: String },
  type: { type: String },
  amt: { type: Number },
  voucher_date: { type: String },
  order_uuid: { type: String },
  invoice_number: { type: Number },
  recept_number: { type: String },
  voucher_difference: { type: Number },
  voucher_verification: { type: Number },
  notes:[{type:String}],

  details: [
    {
      ledger_uuid: { type: String },
      amount: { type: Number },narration:{type:String},
    },
  ],
});

const AccountingVoucher = mongoose.model(
  "accounting_voucher",
  accountingVoucherSchema
);

module.exports = AccountingVoucher;
