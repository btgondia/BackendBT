const mongoose = require('mongoose');

const accountingVoucherSchema = new mongoose.Schema({
  voucher_uuid: String,
  created_at: Number,
  created_by: String,
  type: String,
  amt: Number,
  voucher_date: String,
  order_uuid: String,
  details: [
    {
      ledger_uuid: String,
      amount: Number
    }
  ]
});

const AccountingVoucher = mongoose.model('accounting_voucher', accountingVoucherSchema);

module.exports = AccountingVoucher;
