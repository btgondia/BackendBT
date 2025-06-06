const mongoose = require("mongoose")

const DetailsSchema = new mongoose.Schema({
	next_invoice_number: { type: String },
	next_estimate_number: { type: String },
	next_vocher_number: { type: String },
	new_item_reminder: { type: Number },
	next_receipt_number: { type: String },
	sr_if_nongst: { type: String },
	sr_if_gst: { type: String },
	timer_run_at: { type: Number },
	next_collection_tag_number: { type: String },
	next_accounting_voucher_number: { type: String },
	preferred_xpress_config: { type: Number },
	next_purchase_invoice_number: { type: String },
	current_stock_locking: { type: String },
	mobile_order_sequence: { type: Number },
	xpress_config: [
		{
			id: { type: Number, unique: true },
			url: { type: String },
			instance_id: { type: String },
			access_token: { type: String }
		}
	],
	order_cancel_message_template: [
		{
			id: { type: String, unique: true },
			body: { type: String }
		}
	],
	skip_stages: [{ type: Number }],
	bank_statement_item: {
		data_column: { type: String },
		date_column: { type: String },
		narration_column: { type: String },
		paid_amount_column: { type: String },
		received_amount_column: { type: String },
		separator: [{ type: String }],
		start_from_line: { type: String }
	},
	default_opening_balance_date: { type: Number }
})

module.exports = mongoose.model("details", DetailsSchema)
