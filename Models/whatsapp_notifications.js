const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema({
  type: {
    type: String,
  },
  message: [
    {
      type: {
        type: String,
      },
      text: {
        type: String,
      },
      uuid: {
        type: String,
      },
    },
  ],
  notification_uuid: {
    type: String,
  },
  status: {
    type: Boolean,
  },
});

module.exports = mongoose.model("whatsapp_notifications", warehouseSchema);
