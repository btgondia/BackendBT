const mongoose = require("mongoose");

const IncentiveSchema = new mongoose.Schema({
  type: {
    type: String,
  },
  status: {
    type: Number,
  },
  incentive_title: {
    type: String,
  },
  incentive_uuid: {
    type: String,
  },
  items: [
    {
      type: String,
    },
  ],
  users: [
    {
      type: String,
    },
  ],
  item_groups: [
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

module.exports = mongoose.model("incentives", IncentiveSchema);
