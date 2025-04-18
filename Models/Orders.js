const mongoose = require("mongoose")

const OrdersSchema = new mongoose.Schema({
	status: [
		{
			stage: { type: String },
			time: { type: Number },
			user_uuid: { type: String },
		},
	],
	replacement: { type: Number },
	replacement_mrp: { type: Number },
	shortage: { type: Number },
	adjustment: { type: Number },
	coin: { type: Number },
	counter_order: { type: Number },
	adjustment_remarks: { type: String },
	to_print: { type: String },
	opened_by: { type: String },
	notes: [{ type: String }],
	counter_charges: [{ type: String }],
	priority: { type: Number, default: 0 },
	order_type: { type: String, default: "I" },
	payment_pending: { type: Number, default: 0 },
	time_1: { type: Number },
	time_2: { type: Number },
	item_details: [
		{
			item_uuid: { type: String },
			dms_code: { type: String },
			dms_erp_id: { type: String },
			dms_item_name: { type: String },
			b: { type: Number },
			price: { type: Number },
			p: { type: Number },
			status: { type: Number },
			unit_price: { type: Number },
			old_price: { type: Number },
			edit_price: { type: Number },
			price_approval: { type: String },
			gst_percentage: { type: Number },
			css_percentage: { type: Number },
			item_total: { type: Number },
			free: { type: Number },
			charges_discount: [
				{
					title: { type: String },
					value: { type: Number },
				},
			],
		},
	],
	auto_added: [
		{
			item_uuid: { type: String },
			b: { type: Number },
			p: { type: Number },
		},
	],
	processing_canceled: [
		{
			item_uuid: { type: String },
			b: { type: Number },
			p: { type: Number },
		},
	],
	fulfillment: [
		{
			item_uuid: { type: String },
			b: { type: Number },
			p: { type: Number },
		},
	],
	delivery_return: [
		{
			item_uuid: { type: String },
			b: { type: Number },
			p: { type: Number },
		},
	],
	order_uuid: {
		type: String,
	},
	invoice_number: {
		type: String,
	},
	warehouse_uuid: {
		type: String,
	},
	order_status: {
		type: String,
	},
	counter_uuid: {
		type: String,
	},
	hold: {
		type: String,
	},
	trip_uuid: {
		type: String,
	},
	order_grandtotal: {
		type: Number,
	},
	dms_details: {
		beat_name: { type: String },
		date: { type: String },
		buyer_id: { type: String },
		buyer_name: { type: String },
		seller_address: { type: String },
		erp_user_name: { type: String },
		erp_user: { type: String },
		invoice_number: { type: String },
	},
	dms_invoice_number: { type: String },
	comments: [
		{
			uuid: {
				type: String,
			},
			note: {
				type: String,
			},
			created_at: {
				type: String,
			},
		},
	],
})

module.exports = mongoose.model("orders", OrdersSchema)
