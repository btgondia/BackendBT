const mongoose = require("mongoose");

const IncentiveSchema = new mongoose.Schema({
  type: {
    type: String,
  },
  status: {
    type: Number,
  },
  growth_percent: {
    type: Number,
  },
  discount_percent: {
    type: Number,
  },
  discount_title: {
    type: String,
  },
  counter_scheme_uuid: {
    type: String,
  },
  company: [
    {
      type: String,
    },
  ],
  users: [
    {
      type: String,
    },
  ],
  category: [
    {
      type: String,
    },
  ],
  counters: [
    {
      type: String,
    },
  ],
  counter_groups: [
    {
      type: String,
    },
  ],
  min_range: { type: String },
  calculation: { type: String },
  value: { type: String },
  amt: { type: Number },
});

module.exports = mongoose.model("counter_schemes", IncentiveSchema);
