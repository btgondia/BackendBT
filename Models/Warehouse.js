const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema({
  warehouse_title: {
    type: String,
  },

  warehouse_uuid: {
    type: String,
  },
});

module.exports = mongoose.model("Warehouse", warehouseSchema);
