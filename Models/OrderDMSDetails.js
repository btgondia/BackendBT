const mongoose = require("mongoose");

module.exports.OrderDMSDetailsSchema = {
  beat_name: { type: String },
  date: { type: String },
  buyer_id: { type: String },
  buyer_name: { type: String },
  seller_address: { type: String },
  erp_user_name: { type: String },
  erp_user: { type: String },
  invoice_number: { type: String },
  so_code: { type: String },
};

module.exports.DMSItemSchema = {
  dms_code: { type: String },
  dms_erp_id: { type: String },
  dms_item_name: { type: String },
};
