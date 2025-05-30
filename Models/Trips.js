const mongoose = require("mongoose");

const TripsSchema = new mongoose.Schema({
  trip_title: {
    type: String,
  },
  sort_order: {
    type: Number,
  },
  status: {
    type: Number,
  },
  created_at: {
    type: Number,
  },
  trip_uuid: {
    type: String,
  },
  warehouse_uuid: {
    type: String,
  },
  remarks: {
    type: String,
  },
  users: [{ type: String }],
});

module.exports = mongoose.model("trips", TripsSchema);
