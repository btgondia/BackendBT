const mongoose = require("mongoose");

const CampaignsSchema = new mongoose.Schema({
  campaign_uuid: {
    type: String,
  },
  campaign_title: {
    type: String,
  },
  created_at: {
    type: Number,
  },
  created_by: {
    type: String,
  },
  type: {
    type: String,
  },

  counters: [
    {
      type: String,
    },
  ],
  message: {
    type: String,
  },
});

module.exports = mongoose.model("campaigns", CampaignsSchema);
