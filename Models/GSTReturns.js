const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const gstReturnsSchema = new mongoose.Schema({
  return_uuid: { type: String , default: uuidv4},
  created_at: { type: Number , default: new Date().getTime()},
  created_by: { type: String },
  type: { type: String },
  title: { type: String },
  status: { type: String },
  accounting_voucher_uuid: [{ type: String }],
  json_data: {type:String},
  from_date: { type: Number },
  to_date: { type: Number },
});

const GSTReturns = mongoose.model("gst_returns", gstReturnsSchema);

module.exports = GSTReturns;
