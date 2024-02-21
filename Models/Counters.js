const mongoose = require("mongoose")

const CounterSchema = new mongoose.Schema({
	counter_title: {
		type: String
	},
	credit_rating: {
		type: String
	},
	counter_code: {
		type: String
	},
	form_uuid: {
		type: String
	},
	trip_uuid: {
		type: String
	},
	short_link: {
		type: String
	},
	sort_order: {
		type: Number
	},
	payment_reminder_days: {
		type: Number
	},
	outstanding_type: {
		type: Number
	},
	credit_allowed: {
		type: String
	},
	gst: {
		type: String
	},
	food_license: {
		type: String
	},
	counter_uuid: {
		type: String
	},
	remarks: {
		type: String
	},
	status: {
		type: Number
	},
	route_uuid: {
		type: String
	},
	address: {
		type: String
	},
	mobile: [
		{
			mobile: {
				type: String
			},
			title: {
				type: String
			},
			lable: [
				{
					type: {
						type: String
					},
					varification: {
						type: Number
					}
				}
			],
			uuid: {
				type: String
			}
		}
	],
	company_discount: [
		{
			company_uuid: {
				type: String
			},
			discount: {
				type: String
			},
			item_rate:{
				type: String
			},
			
		}
	],
	average_lines_company: [
		{
			company_uuid: {
				type: String
			},
			lines: {
				type: Number
			}
		}
	],
	average_lines_category: [
		{
			category_uuid: {
				type: String
			},
			lines: {
				type: Number
			}
		}
	],
	item_special_price: [
		{
			item_uuid: {
				type: String
			},
			price: {
				type: Number
			}
		}
	],
	item_special_discount: [
		{
			item_uuid: {
				type: String
			},
			discount: {
				type: String
			}
		}
	],
	counter_group_uuid: [
		{
			type: String
		}
	],
	payment_modes: [
		{
			type: String
		}
	],
	location_coords: {
		latitude: { type: Number },
		longitude: { type: Number }
	},
	notes: [{ type: String }]
})

module.exports = mongoose.model("counters", CounterSchema)
