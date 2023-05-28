const mongoose = require("mongoose")

const DetailsSchema = new mongoose.Schema({
	next_invoice_number: { type: Number },
	next_estimate_number: { type: Number },
	next_vocher_number: { type: Number },
	new_item_reminder: { type: Number },
	next_receipt_number: { type: String },
	timer_run_at: { type: Number },
	next_collection_tag_number: { type: Number },
	xpress_access_token: { type: String },
	xpress_instance_id: { type: String },
})

module.exports = mongoose.model("details", DetailsSchema)
