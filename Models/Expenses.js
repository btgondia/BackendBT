const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
  expense_title: {
    type: String,
  },

  expense_uuid: {
    type: String,
    unique: true,
    required: true,
  },
});

module.exports = mongoose.model("expense", ExpenseSchema);
