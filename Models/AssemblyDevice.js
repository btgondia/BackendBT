const mongoose = require("mongoose");

const assemblyDeviceSchema = new mongoose.Schema(
  {
    device_number: { type: Number, required: true, min: 1, max: 20, index: true },
    url: { type: String, default: "", trim: true },
    // Optional: keep for future multi-tenant scoping. Remove if not needed.
    institute_uuid: { type: String, index: true, default: null },
  },
  { timestamps: true }
);

// unique per institute (or globally if institute_uuid is null)
assemblyDeviceSchema.index(
  { device_number: 1, institute_uuid: 1 },
  { unique: true, partialFilterExpression: { device_number: { $exists: true } } }
);

module.exports = mongoose.model("AssemblyDevice", assemblyDeviceSchema, "assembly_devices");
