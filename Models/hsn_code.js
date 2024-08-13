const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const hsnCodeSchema = new mongoose.Schema({
    hsn_code_uuid: { type: String , default: uuidv4},
    hsn_code: { type: String },
    title: { type: String },
    gst_rate: { type: Number },
    created_at: { type: Number , default: new Date().getTime()},
    created_by: { type: String },
    gst_percentage: { type: String },
    });

const HSNCode = mongoose.model("hsn_code", hsnCodeSchema);

module.exports = HSNCode;