const Counters = require("../Models/Counters")
const Item = require("../Models/Item")
const OrderCompleted = require("../Models/OrderCompleted")
const Orders = require("../Models/Orders")
const baseRouter = require("express").Router()

baseRouter.post("/invoice-import-prerequisite", async (req, res) => {
	try {
		const { dms_counters, dms_users, dms_items, dms_invoice_numbers } = req.body
		const result = {}
		if (dms_counters?.length > 0)
			result.counters = await Counters.find(
				{ dms_buyer_id: { $in: dms_counters } },
				{
					counter_uuid: 1,
					dms_buyer_id: 1,
					item_special_price: 1,
					item_special_discount: 1,
					company_discount: 1
				}
			)

		if (dms_items?.length > 0)
			result.items = await Item.find(
				{ dms_erp_ids: { $in: dms_items }, status: 1 },
				{
					item_uuid: 1,
					dms_erp_ids: 1,
					conversion: 1,
					item_price: 1
				}
			)

		if (dms_users?.length > 0)
			result.users = await Item.find(
				{ dms_erp_id: { $in: dms_users } },
				{
					user_uuid: 1,
					dms_erp_id: 1
				}
			)

		if (dms_invoice_numbers?.length > 0)
			result.existing_invoice_orders = await Orders.find(
				{ dms_invoice_number: { $in: dms_invoice_numbers } },
				{ _id: 0, dms_invoice_number: 1, order_uuid: 1 }
			)

		res.json(result)
	} catch (error) {
		console.log(error)
		res.status(500).json({ success: false, message: "Internal error" })
	}
})

module.exports = baseRouter
