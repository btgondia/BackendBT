const mongoose = require("mongoose");

const OrdersSchema = new mongoose.Schema({
  status: [
    {
      stage: { type: String },
      time: { type: Number },
      user_uuid: { type: String },
      cancellation_reason: { type: String },
    },
  ],
  replacement: { type: Number },
  replacement_mrp: { type: Number },
  shortage: { type: Number },
  adjustment: { type: Number },
  coin: { type: Number },
  adjustment_remarks: { type: String },
  opened_by: { type: String },
  notes: [{ type: String }],

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
      original_qty: {
        b: { type: Number },
        p: { type: Number },
      },
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
  fulfillment: [
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
  counter_charges: [{ type: String }],
  order_uuid: {
    type: String,
  },
  invoice_number: {
    type: String,
  },
  warehouse_uuid: {
    type: String,
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
  comments: [
    {
      uuid: {
        type: String,
      },
      note: {
        type: String,
      },
      created_at: {
        type: String,
      },
    },
  ],
});

module.exports = mongoose.model("cancel_orders", OrdersSchema);
