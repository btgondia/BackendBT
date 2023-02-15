const mongoose = require("mongoose");

const orderFormsSchema = new mongoose.Schema({
  form_title: {
    type: String,
  },
  form_uuid: {
    type: String,
  },
  form_short_link: {
    type: String,
  },

  company_uuid: [
    {
      type: String,
    },
  ],
  created_at: {
    type: Number,
  },
  created_by: {
    type: String,
  },
});

module.exports = mongoose.model("orderForms", orderFormsSchema);
