const mongoose = require('mongoose');

const accountingVoucherSchema = new mongoose.Schema({
  accounting_voucher_uuid: String,
  accounting_voucher_number: String,
  created_at: Number,
  created_by: String,
  type: String,
  amt: Number,
  voucher_date: String,
  order_uuid: String,
  invoice_number: Number,
  recept_number: Number,
  voucher_difference: Number,
  voucher_verification: Number,
  details: [
    {
      ledger_uuid: String,
      amount: Number
    }
  ]
});

const AccountingVoucher = mongoose.model('accounting_voucher', accountingVoucherSchema);

module.exports = AccountingVoucher;
