const mongoose = require("mongoose");

const OrdersSchema = new mongoose.Schema({
  status: [
    {
      stage: { type: String },
      time: { type: Number },
      user_uuid: { type: String },
    },
  ],
  item_details: [
    {
      item_uuid: { type: String },
      b: { type: Number },
      p: { type: Number },
      unit_price: { type: Number },
      gst_percentage: { type: Number },
      item_total: { type: Number },
    },
  ],
  auto_added: [
    {
      item_uuid: { type: String },
      b: { type: Number },
      p: { type: Number },
    },
  ],

  order_uuid: {
    type: String,
  },
  counter_uuid: {
    type: String,
  },
});

module.exports = mongoose.model("orders", OrdersSchema);
