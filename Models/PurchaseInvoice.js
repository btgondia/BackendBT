const mongoose = require("mongoose");

const OrdersSchema = new mongoose.Schema({
  item_details: [
    {
      item_uuid: { type: String },
      b: { type: Number },
      price: { type: Number },
      p: { type: Number },
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
  rate_type: {
    type: String,
  },
  party_number: {
    type: String,
  },

  purchase_order_uuid: {
    type: String,
  },
  purchase_invoice_number: {
    type: String,
  },
  warehouse_uuid: {
    type: String,
  },

  ledger_uuid: {
    type: String,
  },

  order_grandtotal: {
    type: Number,
  },
});

module.exports = mongoose.model("purchase_invoice", OrdersSchema);
