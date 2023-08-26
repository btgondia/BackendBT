const mongoose = require("mongoose")

const CounterChargeSchema = new mongoose.Schema({
	charge_uuid: { type: String, required: true },
	counter_uuid: { type: String, required: true },
	user_uuid: { type: String, required: true },
	amt: { type: Number, required: true },
	narration: { type: String, required: true, maxlength: 15 },
	remarks: { type: String, required: true },
	invoice_number: { type: String },
	created_at: { type: Date, default: Date.now },
	completed_at: { type: Date },
	status: { type: Number, default: 0 }
})

module.exports = mongoose.model("counter_charge", CounterChargeSchema)
