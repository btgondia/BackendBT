const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema({
  warehouse_title: {
    type: String,
  },

  warehouse_uuid: {
    type: String,
  },
  compare_stock_level: { type: Number },
  maintain_stock_days: { type: Number },
});

module.exports = mongoose.model("Warehouse", warehouseSchema);
