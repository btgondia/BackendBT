const mongoose = require("mongoose")

const ItemSchema = new mongoose.Schema({
	item_title: {
		type: String
	},
	item_discount: {
		type: Number
	},
	exclude_discount: {
		type: Number
	},
	hsn:{
		type: Number
	},
	status: {
		type: Number
	},
	sort_order: {
		type: String
	},
	item_code: {
		type: String
	},
	free_issue: {
		type: String
	},
	item_uuid: {
		type: String
	},
	one_pack: {
		type: String
	},
	company_uuid: {
		type: String
	},
	category_uuid: {
		type: String
	},
	pronounce: {
		type: String
	},
	mrp: {
		type: String
	},
	item_price: {
		type: String
	},
	last_purchase_price: {
		type: String
	},
	item_price_a:{
		type: String
	},
	item_price_b:{
		type: String
	},
	item_price_c:{
		type: String
	},
	item_gst: {
		type: String
	},
	item_css: {
		type: String
	},

	conversion: {
		type: String
	},
	barcode: [
		{
			type: String
		}
	],
	item_group_uuid: [
		{
			type: String
		}
	],
	billing_type: { type: String, default: "I" },
	stock: [
		{
			warehouse_uuid: {
				type: String
			},
			qty: {
				type: Number
			},
			min_level: {
				type: Number
			}
		}
	],
	img_status: { type: Number },
	created_at: { type: Number },
	hsn_code_uuid: { type: String },
})

module.exports = mongoose.model("items", ItemSchema)
