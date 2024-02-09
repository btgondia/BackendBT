const mongoose = require('mongoose');

const SoundAppSchema = new mongoose.Schema({
  server_calls: Number,
  delete_file: [
    {
      file_id: String,
      request_id: String
    }
  ],
  action: [
    {
      command: String,
      request_id: String
    }
  ],
  play_schedules: [
    {
      file_id: String,
      schedule: [
        {
          time: Number,
          play_id: String
        }
      ]
    }
  ],
  box_id: String
});

module.exports = mongoose.model('sound_app', SoundAppSchema);