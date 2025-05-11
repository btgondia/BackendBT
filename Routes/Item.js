const express = require("express")

const router = express.Router()
const { v4: uuid } = require("uuid")
const Details = require("../Models/Details")
const Item = require("../Models/Item")
const OrderCompleted = require("../Models/OrderCompleted")
const Orders = require("../Models/Orders")
const fs = require("fs")
const { reportTotalPipeline, reportPipeline } = require("../pipelines/items.pipeline")
router.post("/postItem", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		value = { ...value, item_uuid: value.item_uuid || uuid() }
		if (!value.sort_order) {
			let response = await Item.find({}, { sort_order: 1 })
			response = JSON.parse(JSON.stringify(response))
			value.sort_order = Math.max(...response.map((o) => o?.sort_order || 0)) + 1 || 0
			value.created_at = new Date().getTime()
		}

		let response = await Item.create(value)
		if (response) {
			res.json({ success: true, result: response })
		} else res.json({ success: false, message: "Item Not created" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.delete("/deleteItem", async (req, res) => {
	try {
		let { item_uuid } = req.body
		if (!item_uuid) res.json({ success: false, message: "Invalid Data" })
		let response = { acknowledged: false }
		let orderData = await Orders.find({
			"item_details.item_uuid": item_uuid
		})
		let CompleteOrderData = await OrderCompleted.find({
			"item_details.item_uuid": item_uuid
		})
		if (!(orderData.length || CompleteOrderData.length)) {
			fs.access("uploads/" + (item_uuid || "") + ".png", (err) => {
				if (err) {
					console.log(err)
					return
				}
				fs.unlink("uploads/" + (item_uuid || "") + ".png", (err) => {
					if (err) {
						console.log(err)
						return
					}
				})
			})
			fs.access("uploads/" + (item_uuid || "") + "thumbnail.png", (err) => {
				if (err) {
					console.log(err)
					return
				}
				fs.unlink("uploads/" + (item_uuid || "") + "thumbnail.png", (err) => {
					if (err) {
						console.log(err)
						return
					}
				})
			})
			response = await Item.deleteOne({ item_uuid })
		}
		if (response.acknowledged) {
			res.json({ success: true, result: response })
		} else res.status(404).json({ success: false, message: "Item Not Deleted" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/GetItemList", async (req, res) => {
	try {
		let data = await Item.find(
			{},
			{
				item_title: 1,
				company_uuid: 1,
				category_uuid: 1,
				item_discount: 1,
				exclude_discount: 1,
				status: 1,
				sort_order: 1,
				item_code: 1,
				free_issue: 1,
				item_uuid: 1,
				one_pack: 1,
				pronounce: 1,
				mrp: 1,
				item_price: 1,
				item_gst: 1,
				conversion: 1,
				item_css: 1,
				item_group_uuid: 1,
				// stock: 1,
				created_at: 1,
				item_price_a: 1,
				item_price_b: 1,
				item_price_c: 1,
				hsn: 1,
				dms_erp_id: 1,
				dms_item_name: 1
			}
		)

		if (data.length)
			res.json({
				success: true,
				result: data.filter((a) => a.item_uuid && a.item_title)
			})
		else res.json({ success: false, message: "Item Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/GetActiveItemList", async (req, res) => {
	try {
		let data = await Item.find(
			{ status: 1 },
			{
				item_title: 1,
				company_uuid: 1,
				category_uuid: 1,

				item_discount: 1,
				exclude_discount: 1,
				status: 1,
				sort_order: 1,
				item_code: 1,
				free_issue: 1,
				item_uuid: 1,
				one_pack: 1,
				pronounce: 1,
				mrp: 1,
				item_price: 1,
				item_gst: 1,
				conversion: 1,
				item_css: 1,

				item_group_uuid: 1,
				// stock: 1,
				created_at: 1
			}
		)

		if (data.length)
			res.json({
				success: true,
				result: data.filter((a) => a.item_uuid && a.item_title)
			})
		else res.json({ success: false, message: "Item Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.post("/GetItemList", async (req, res) => {
	try {
		let { items = [] } = req.body
		let data = await Item.find(items?.length ? { item_uuid: { $in: items } } : {}, {
			item_title: 1,
			item_discount: 1,
			exclude_discount: 1,
			status: 1,
			sort_order: 1,
			item_code: 1,
			free_issue: 1,
			item_uuid: 1,
			one_pack: 1,
			company_uuid: 1,
			category_uuid: 1,
			pronounce: 1,
			mrp: 1,
			item_price: 1,
			item_gst: 1,
			item_css: 1,
			conversion: 1,
			barcode: 1,
			item_group_uuid: 1,
			// stock: 1,
			created_at: 1,
			item_price_a: 1,
			item_price_b: 1,
			item_price_c: 1,
			hsn: 1,
			dms_erp_id: 1,
			dms_item_name: 1
		})

		if (data.length)
			res.json({
				success: true,
				result: data.filter((a) => a.item_uuid && a.item_title)
			})
		else res.json({ success: false, message: "Item Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/GetItemData", async (req, res) => {
	try {
		let data = await Item.find(
			{},
			{
				item_title: 1,
				img_status: 1,
				item_discount: 1,
				exclude_discount: 1,
				status: 1,
				sort_order: 1,
				item_code: 1,
				free_issue: 1,
				item_uuid: 1,
				one_pack: 1,
				company_uuid: 1,
				category_uuid: 1,
				pronounce: 1,
				mrp: 1,
				item_price: 1,
				item_gst: 1,
				item_css: 1,
				conversion: 1,
				barcode: 1,
				item_group_uuid: 1,
				billing_type: 1,
				created_at: 1,
				item_price_a: 1,
				item_price_b: 1,
				item_price_c: 1,
				hsn: 1,
				dms_erp_id: 1,
				dms_item_name: 1
			}
		)

		if (data.length)
			res.json({
				success: true,
				result: data.filter((a) => a.item_uuid && a.item_title)
			})
		else res.json({ success: false, message: "Item Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/company-wise/basic", async (req, res) => {
	try {
		const data = await Item.aggregate([
			{
				$match: {
					status: 1
				}
			},
			{
				$group: {
					_id: "$company_uuid",
					items: {
						$push: {
							item_title: "$item_title",
							item_uuid: "$item_uuid"
						}
					}
				}
			},
			{
				$lookup: {
					from: "companies",
					localField: "_id",
					foreignField: "company_uuid",
					as: "company"
				}
			},
			{
				$project: {
					_id: 0,
					company_uuid: "$_id",
					company_title: {
						$first: "$company.company_title"
					},
					items: 1
				}
			}
		])

		res.json({ success: true, result: data })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.patch("/map-item", async (req, res) => {
	try {
		const { item_uuid, dms_item_code } = req.body
		const item = await Item.findOne({ item_uuid }, { dms_erp_ids: 1 })
		if (!item) return res.json({ success: false, error: "Item not found" })
		if (!item.dms_erp_ids?.includes(dms_item_code))
			await Item.updateOne({ item_uuid }, { $push: { dms_erp_ids: dms_item_code } })

		res.json({ success: true })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.put("/flush-dms-ids", async (req, res) => {
	try {
		const { item_uuid } = req.body
		const item = await Item.updateOne({ item_uuid }, { dms_erp_ids: [] })

		if (item.acknowledged) res.json({ success: true })
		else res.json({ success: false, error: "Item not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/getNewItemReminder", async (req, res) => {
	try {
		let data = await Details.findOne({}, { new_item_reminder: 1 })

		if (data)
			res.json({
				success: true,
				result: data?.new_item_reminder
			})
		else res.json({ success: false, message: "Item Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/minValue/:warhouse_uuid/:item_uuid", async (req, res) => {
	try {
		let Itemdata = await Item.findOne({ item_uuid: req.params.item_uuid })
		let ordersData = await Orders.find({
			"item_details.item_uuid": req.params.item_uuid,
			warehouse_uuid: req.params.warhouse_uuid
		})
		ordersData = JSON.parse(JSON.stringify(ordersData))

		ordersData = ordersData.filter((order) => +order.status[order.status.length - 1].stage === 2)

		let allItems = [].concat
			.apply(
				[],
				ordersData.map((b) => b?.item_details || [])
			)
			.filter((a) => a.item_uuid === req.params.item_uuid)
			.map((a) => +a.b * Itemdata.conversion + +a.p)
		allItems = allItems.length > 1 ? allItems.reduce((a, b) => +a + b) : allItems.length ? allItems[0] : 0
		if (allItems)
			res.json({
				success: true,
				result: allItems
			})
		else res.json({ success: false, message: "Item Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/GetItemStockList/:warhouse_uuid", async (req, res) => {
	try {
		let data = await Item.find({ status: 1 })
		data = JSON.parse(JSON.stringify(data))
		if (req.params.warhouse_uuid)
			data = data.map((a) => ({
				...a,
				qty: a.stock.find((b) => b.warehouse_uuid === req.params.warhouse_uuid)?.qty || 0
			}))

		if (data.length)
			res.json({
				success: true,
				result: data.filter((a) => a.item_uuid && a.item_title)
			})
		else res.json({ success: false, message: "Item Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.put("/putItem", async (req, res) => {
	try {
		let result = []
		for (let value of req.body) {
			if (!value) res.json({ success: false, message: "Invalid Data" })
			value = Object.keys(value)
				.filter((key) => key !== "_id")
				.reduce((obj, key) => {
					obj[key] = value[key]
					return obj
				}, {})

			let response = await Item.updateMany({ item_uuid: value.item_uuid }, value)
			if (response.acknowledged) {
				result.push({ success: true, result: value })
			} else result.push({ success: false, message: "Item Not created" })
		}
		res.json({ success: true, result })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.put("/flushWarehouse", async (req, res) => {
	try {
		const value = req.body
		let result = []
		let itemsData = await Item.find({})
		itemsData = JSON.parse(JSON.stringify(itemsData))

		for (let item of itemsData) {
			let stock = item.stock
			if (stock.filter((a) => a.qty && value?.find((b) => b === a.warehouse_uuid)).length) {
				stock = stock.map((b) => (value.find((c) => c === b.warehouse_uuid) ? { ...b, qty: 0 } : b))
				let response = await Item.updateOne({ item_uuid: item.item_uuid }, { stock })
				if (response.acknowledged) {
					result.push({ item_uuid: item?.item_uuid, success: true })
				} else {
					result.push({ item_uuid: item?.item_uuid, success: false })
				}
			}
		}

		res.json({ success: true, result })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.post("/report", async (req, res) => {
	try {
		const { startDate, endDate, counter_uuid, counter_group_uuid, item_group_uuid, company_uuid, last_item } =
			req.body
		if (!endDate) return res.json({ success: false, message: "No date range provided" })

		const matchQueries = []

		if (item_group_uuid && company_uuid) matchQueries.push({ $or: [{ company_uuid }, { item_group_uuid }] })
		else if (item_group_uuid) matchQueries.push({ item_group_uuid })
		else if (company_uuid) matchQueries.push({ company_uuid })

		if (last_item?.company_uuid)
			matchQueries.push({
				$expr: {
					$or: [
						{
							$and: [
								{ $eq: ["$company_uuid", last_item.company_uuid] },
								{
									$gt: [{ $toLower: "$item_title" }, { $toLower: last_item.item_title }]
								}
							]
						},
						{ $gt: ["$company_uuid", last_item.company_uuid] }
					]
				}
			})

		const conditions = [
			{
				stage: "1",
				itemField: "sales",
				collection: "completed_orders"
			},
			{
				stage: "3.5",
				itemField: "delivered",
				collection: "orders"
			}
		]

		const pipeline = reportPipeline({
			...req.body,
			matchQueries,
			conditions
		})

		// console.log(JSON.stringify(pipeline))

		let result = await Item.aggregate(pipeline)

		result = result.map(({ _id, ...value }) => {
			const sumResult = {}
			const pctResult = {}
			const remaining = {}

			let wholeQty = 0

			for (const [key, val] of Object.entries(value)) {
				if (typeof val === "string") remaining[key] = val
				else if (typeof val === "object" && val !== null) {
					sumResult[key] = {
						p: val.p,
						price: +val.price?.toFixed(2)
					}
					wholeQty += val.p
				}
			}

			for (const [key, { p, price }] of Object.entries(sumResult)) {
				if (key !== "sales") {
					pctResult[key] = {
						...value[key],
						price,
						pct: +(wholeQty ? (p * 100) / wholeQty : 0).toFixed(2)
					}
				}
			}

			return { ...remaining, ...sumResult, ...pctResult }
		})

		res.json({ success: true, length: result.length, result })
	} catch (err) {
		console.error(err)
		res.status(500).json({ success: false, message: err.message })
	}
})
router.post("/report-total", async (req, res) => {
	try {
		if (!req.body?.endDate) return res.json({ success: false, message: "No date range provided" })

		const conditions = [
			{
				stage: "1",
				itemField: "sales",
				collection: OrderCompleted
			},
			{
				stage: "3.5",
				itemField: "delivered",
				collection: Orders
			}
		]

		let result = await Promise.all(
			conditions.map(({ collection, ...i }) => {
				const pipeline = reportTotalPipeline({ ...req.body, ...i })
				// console.log(JSON.stringify(pipeline))
				return collection.aggregate(pipeline)
			})
		)

		result = {
			...result[0][0],
			...result[1][0]
		}

		res.json({ success: true, result })
	} catch (err) {
		console.error(err)
		res.status(500).json({ success: false, message: err.message })
	}
})

router.get("/GetItemsPurchaseData", async (req, res) => {
	const { category_uuid = "", company_uuid = "" } = req.query
	try {
		let data = await Item.find(
			{
				...(category_uuid ? { category_uuid } : {}),
				...(company_uuid ? { company_uuid } : {})
			},
			{
				item_title: 1,
				item_uuid: 1,
				item_code: 1,
				company_uuid: 1,
				category_uuid: 1,
				last_purchase_price: 1,
				status: 1
			}
		)
		if (data.length)
			res.json({
				success: true,
				result: data
			})
		else res.json({ success: false, message: "Item Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.put("/putItems/sortOrder", async (req, res) => {
	try {
		const items = await req.body
		if (!items?.[0]) return res.status(204).json({ message: "Empty Payload" })
		const result = { succeed: [], failed: [] }
		let count = 0
		const respond = () => (++count === items?.length ? res.json(result) : "")

		items?.forEach(async (item) => {
			try {
				const res = await Item.updateOne({ item_uuid: item.item_uuid }, item)
				if (res) result.succeed.push(item.item_uuid)
				else result.failed.push({ failed: item.item_uuid })
				respond()
			} catch (error) {
				result.failed.push({
					failed: item.item_uuid,
					error: error.message
				})
				respond()
			}
		})
	} catch (err) {
		res.status(500).json({ success: false, message: err.message })
	}
})

module.exports = router
