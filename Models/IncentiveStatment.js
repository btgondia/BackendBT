const mongoose = require("mongoose");

const IncentiveSchema = new mongoose.Schema({
  user_uuid: {
    type: String,
  },
  order_uuid: {
    type: String,
  },
  counter_uuid: {
    type: String,
  },
  incentive_uuid: {
    type: String,
  },

  time: { type: Number },
  amt: { type: Number },
});

module.exports = mongoose.model("incentive_statment", IncentiveSchema);
