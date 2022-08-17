const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  task_uuid: {
    type: String,
  },
  counter_uuid: {
    type: String,
  },
  created_by: {
    type: String,
  },
  created_at: {
    type: Number,
  },
  status: {
    type: Number,
  },
  completed_at: {
    type: Number,
  },
  completed_by: {
    type: String,
  },
  task: {
    type: String,
  },
  assigned_to: [{
    type: String,
  }],
});

module.exports = mongoose.model("tasks", taskSchema);
