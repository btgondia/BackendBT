const mongoose = require("mongoose");

const OrdersSchema = new mongoose.Schema({
  status: [
    {
      stage: { type: String },
      time: { type: Number },
      user_uuid: { type: String },
    },
  ],
  replacement: { type: Number },
  replacement_mrp: { type: Number },
  opened_by: { type: String },
  item_details: [
    {
      item_uuid: { type: String },
      b: { type: Number },
      price: { type: Number },
      p: { type: Number },
      status: { type: Number },
      unit_price: { type: Number },
      old_price: { type: Number },
      price_approval: { type: String },
      gst_percentage: { type: Number },
      item_total: { type: Number },
      free: { type: Number },
      charges_discount: [
        {
          title: { type: String },
          value: { type: Number },
        },
      ],
    },
  ],
  auto_added: [
    {
      item_uuid: { type: String },
      b: { type: Number },
      p: { type: Number },
    },
  ],
  processing_canceled: [
    {
      item_uuid: { type: String },
      b: { type: Number },
      p: { type: Number },
    },
  ],
  delivery_return: [
    {
      item_uuid: { type: String },
      b: { type: Number },
      p: { type: Number },
    },
  ],

  order_uuid: {
    type: String,
  },
  invoice_number: {
    type: Number,
  },
  order_status: {
    type: String,
  },
  counter_uuid: {
    type: String,
  },
  hold: {
    type: String,
  },
  trip_uuid: {
    type: String,
  },
  order_grandtotal: {
    type: Number,
  },
});

module.exports = mongoose.model("orders", OrdersSchema);
