const mongoose = require("mongoose");

const AutoBillSchema = new mongoose.Schema({
  type: {
    type: String,
  },
  auto_uuid: {
    type: String,
  },
  items: [
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
  qty_details: [
    {
      base_qty: {
        type: String,
      },
      add_qty: {
        type: String,
      },
      unit: {
        type: String,
      },
    },
  ],
});

module.exports = mongoose.model("autobill", AutoBillSchema);
