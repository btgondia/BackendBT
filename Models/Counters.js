const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema({
  counter_title: {
    type: String,
  },
  sort_order: {
    type: Number,
  },
  credit_allowed: {
    type: String,
  },
  gst: {
    type: String,
  },
  food_license: {
    type: String,
  },
  counter_uuid: {
    type: String,
  },
  route_uuid: {
    type: String,
  },
  address: {
    type: String,
  },
  mobile:[ {
    type: String,
  }],
  company_discount: [
    {
      company_uuid: {
        type: String,
      },
      discount: {
        type: String,
      },
    },
  ],
  item_special_price: [
    {
      item_uuid: {
        type: String,
      },
      price: {
        type: String,
      },
    },
  ],
  item_special_discount: [
    {
      item_uuid: {
        type: String,
      },
      discount: {
        type: String,
      },
    },
  ],
  counter_group_uuid: [
    {
      type: String,
    },
  ],
  payment_modes: [
    {
      type: String,
    },
  ],
});

module.exports = mongoose.model("counters", CounterSchema);
