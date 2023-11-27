const express = require("express")

const router = express.Router()
const { v4: uuid } = require("uuid")
const Trips = require("../Models/Trips")
const Orders = require("../Models/Orders")
const Users = require("../Models/Users")
const Receipts = require("../Models/Receipts")
const CompleteOrder = require("../Models/OrderCompleted")
const Counters = require("../Models/Counters")

const Item = require("../Models/Item")
const OutStanding = require("../Models/OutStanding")
const Warehouse = require("../Models/Warehouse")

router.post("/postTrip", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		value = {
			...value,
			trip_uuid: uuid(),
			created_at: new Date().getTime(),
			status: 1
		}
		// console.log(value);
		let response = await Trips.create(value)
		if (response) {
			res.json({ success: true, result: response })
		} else res.json({ success: false, message: "Trip Not created" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.put("/putTrip", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		value = Object.keys(value)
			.filter(key => key !== "_id")
			.reduce((obj, key) => {
				obj[key] = value[key]
				return obj
			}, {})
		// console.log(value);
		let response = await Trips.updateOne({ trip_uuid: value.trip_uuid }, value)
		if (response.acknowledged) {
			res.json({ success: true, result: response })
		} else res.json({ success: false, message: "Trips Not updated" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

router.get("/GetTripList/:user_uuid", async (req, res) => {
	try {
		let userData = await Users.findOne({ user_uuid: req.params.user_uuid })
		userData = JSON.parse(JSON.stringify(userData))
		let data = await Trips.find(
			// +userData?.warehouse[0] === 1
			//   ?
			{}
			// : { warehouse_uuid: { $in: userData.warehouse } }
		)
		data = JSON.parse(JSON.stringify(data))

		// let ordersData = await Orders.find({});
		// ordersData = JSON.parse(JSON.stringify(ordersData));
		if (data.length) {
			// // console.log(result);
			res.json({
				success: true,
				result: data
			})
		} else res.json({ success: false, message: "Trips Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/GetTripListSummary/:user_uuid", async (req, res) => {
	try {
		let userData = await Users.findOne({ user_uuid: req.params.user_uuid })
		userData = JSON.parse(JSON.stringify(userData))

		let warehouseData = await Warehouse.findOne(
			{
				warehouse_uuid: userData?.warehouse[0]
			},
			{ warehouse_title: 1 }
		)
		let data = await Trips.find({
			status: 1,
			warehouse_uuid: userData?.warehouse[0]
		})
		data = JSON.parse(JSON.stringify(data))

		// let CounterData = await Counters.find(
		//   {},
		//   {
		//     counter_title: 1,
		//     counter_code: 1,
		//     sort_order: 1,
		//     payment_reminder_days: 1,
		//     outstanding_type: 1,
		//     credit_allowed: 1,
		//     gst: 1,
		//     food_license: 1,
		//     counter_uuid: 1,
		//     remarks: 1,
		//     status: 1,
		//     route_uuid: 1,
		//     address: 1,
		//     mobile: 1,
		//     company_discount: 1,
		//     // average_lines_company: 1,
		//     // average_lines_category: 1,
		//     item_special_price: 1,
		//     item_special_discount: 1,
		//     counter_group_uuid: 1,
		//     payment_modes: 1,
		//   }
		// );
		// CounterData = JSON.parse(JSON.stringify(CounterData));

		// data = data.filter(
		//   (a) =>
		//     !a.warehouse_uuid ||
		//     +userData?.warehouse[0] === 1 ||
		//     userData?.warehouse.find((b) => b === a.warehouse_uuid)
		// );

		if (data.length) {
			let result = []

			for (let a of data) {
				let ordersData = await Orders.find({ trip_uuid: a.trip_uuid }, { order_uuid: 1 })

				ordersData = JSON.parse(JSON.stringify(ordersData))
				let orderLength = ordersData.length
				console.log(orderLength)
				result.push({
					...a,
					orderLength,
					warehouse_title: warehouseData?.warehouse_title || ""
				})
			}

			res.json({
				success: true,
				result
			})
		} else res.json({ success: false, message: "Trips Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.post("/GetTripData", async (req, res) => {
	// try {
	let { trips = [], params = [], conditions = [] } = req.body

	let json = {}
	let jsonCondition = {}
	for (let i of params) {
		json = { ...json, [i]: 1 }
	}
	for (let i of conditions) {
		jsonCondition = { ...jsonCondition, ...i }
	}
	let data = await Trips.find(trips.length ? { trip_uuid: { $in: trips }, ...jsonCondition } : jsonCondition, json)

	if (data.length) {
		res.json({
			success: true,
			result: data
		})
	} else res.json({ success: false, message: "Trips Not found" })
	// } catch (err) {
	//   res.status(500).json({ success: false, message: err });
	// }
})
router.get("/GetTripSummaryDetails/:trip_uuid", async (req, res) => {
	try {
		let a = await Trips.findOne({ trip_uuid: req.params.trip_uuid })
		a = JSON.parse(JSON.stringify(a))
		console.log("tripsData", a)

		let CounterData = await Counters.find(
			{},
			{
				counter_title: 1,
				counter_code: 1,
				sort_order: 1,
				payment_reminder_days: 1,
				outstanding_type: 1,
				credit_allowed: 1,
				gst: 1,
				food_license: 1,
				counter_uuid: 1,
				remarks: 1,
				status: 1,
				route_uuid: 1,
				address: 1,
				mobile: 1,
				company_discount: 1,
				// average_lines_company: 1,
				// average_lines_category: 1,
				item_special_price: 1,
				item_special_discount: 1,
				counter_group_uuid: 1,
				payment_modes: 1
			}
		)
		CounterData = JSON.parse(JSON.stringify(CounterData))

		if (a) {
			let receiptItems = await CompleteOrder.find({ trip_uuid: a.trip_uuid })
			receiptItems = JSON.parse(JSON.stringify(receiptItems))
			let receiptsData = await Receipts.find({
				order_uuid: { $in: receiptItems.map(a => a.order_uuid) }
			})
			receiptsData = JSON.parse(JSON.stringify(receiptsData))
			receiptItems = receiptItems.map(a => ({
				...a,
				...(receiptsData.find(b => b.order_uuid === a.order_uuid) || {})
			}))
			let sales_return = [].concat.apply(
				[],
				receiptItems.map(b => b?.delivery_return || [])
			)

			let OutstandingData = await OutStanding.find({
				trip_uuid: a.trip_uuid,
				status: 1
			})
			OutstandingData = JSON.parse(JSON.stringify(OutstandingData))
			let unpaid_invoice = OutstandingData.map(b => ({
				...b,
				counter_title: CounterData.find(c => c.counter_uuid === b.counter_uuid)?.counter_title
			}))
			let salesresult = []
			for (let item of sales_return) {
				var existing = salesresult.filter(function (v, i) {
					return v.item_uuid === item.item_uuid
				})

				if (existing.length === 0) {
					let itemsFilteredData = sales_return.filter(a => a.item_uuid === item.item_uuid)
					let itemsData = await Item.findOne({ item_uuid: item?.item_uuid })

					let b =
						itemsFilteredData.length > 1
							? itemsFilteredData?.map(c => +c.b || 0).reduce((c, d) => c + d)
							: +itemsFilteredData[0]?.b || 0
					let p =
						itemsFilteredData.length > 1
							? itemsFilteredData?.map(c => +c.p || 0).reduce((c, d) => c + d)
							: +itemsFilteredData[0]?.p || 0
					let free =
						itemsFilteredData.length > 1
							? itemsFilteredData?.map(c => +c.free || 0).reduce((c, d) => c + d)
							: +itemsFilteredData[0]?.free || 0
					let obj = {
						...item,
						b: parseInt(+b + (+p + free) / +itemsData?.conversion),
						p: parseInt((+p + free) % +itemsData?.conversion)
					}
					salesresult.push(obj)
				}
			}
			sales_return = salesresult
			let itemData = await Item.find({
				item_uuid: sales_return.map(a => a.item_uuid)
			})
			sales_return = sales_return.map(b => ({
				...b,
				item_title: itemData.find(c => c.item_uuid === b.item_uuid)?.item_title
			}))
			let receiptData = await Receipts.find({
				trip_uuid: a.trip_uuid,
				order_uuid: { $in: receiptItems.map(a => a.order_uuid) }
			})

			receiptData = [].concat
				.apply(
					[],
					receiptData.map(b => b?.modes || [])
				)
				.filter(b => b.mode_uuid === "c67b54ba-d2b6-11ec-9d64-0242ac120002")

			let amt =
				receiptItems?.length > 1
					? receiptItems.map(a => +a.order_grandtotal || 0).reduce((c, d) => c + d)
					: receiptItems[0]?.order_grandtotal || 0
			let cash =
				receiptData?.length > 1
					? receiptData.map(a => +a.amt || 0).reduce((c, d) => c + d)
					: receiptData[0]?.amt || 0
			let coin =
				receiptData?.length > 1
					? receiptData.map(a => +a.coin || 0).reduce((c, d) => c + d)
					: receiptData[0]?.coin || 0
			let ordersData = await Orders.find({ trip_uuid: a.trip_uuid })
			ordersData = JSON.parse(JSON.stringify(ordersData))
			let orderLength = ordersData.length

			let data = {
				...a,
				orderLength,
				unpaid_invoice,
				receiptItems,
				amt,
				cash,
				coin,
				cheque: receiptItems
					?.filter(
						b => b?.modes?.filter(c => c.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" && c.amt).length
					)
					.map(b => ({
						counter_title: CounterData.find(c => c.counter_uuid === b.counter_uuid)?.counter_title,
						amt: b?.modes?.find(c => c.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002")?.amt,
						invoice_number: b.invoice_number
					})),
				replacement: receiptItems
					.filter(b => b.replacement || b.shortage || b.adjustment)
					.map(b => ({
						replacement: b.replacement,
						shortage: b.shortage,
						adjustment: b.adjustment,
						counter_title: CounterData.find(c => c.counter_uuid === b.counter_uuid)?.counter_title,
						invoice_number: b.invoice_number
					})),
				sales_return
			}

			res.json({
				success: true,
				result: data
			})
		} else res.json({ success: false, message: "Trips Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.post("/GetTripItemSummary", async (req, res) => {
	try {
		let value = req.body
		let data = await Trips.findOne({ trip_uuid: value.trip_uuid })
		data = JSON.parse(JSON.stringify(data))
		let CounterData = await Counters.find(
			{},
			{
				counter_title: 1,
				counter_code: 1,
				sort_order: 1,
				payment_reminder_days: 1,
				outstanding_type: 1,
				credit_allowed: 1,
				gst: 1,
				food_license: 1,
				counter_uuid: 1,
				remarks: 1,
				status: 1,
				route_uuid: 1,
				address: 1,
				mobile: 1,
				company_discount: 1,
				// average_lines_company: 1,
				// average_lines_category: 1,
				item_special_price: 1,
				item_special_discount: 1,
				counter_group_uuid: 1,
				payment_modes: 1
			}
		)
		CounterData = JSON.parse(JSON.stringify(CounterData))
		let OutstandingData = await OutStanding.find({ status: 1 })
		OutstandingData = JSON.parse(JSON.stringify(OutstandingData))

		let CompleteOrdersData = await CompleteOrder.find({})
		CompleteOrdersData = JSON.parse(JSON.stringify(CompleteOrdersData))
		let receiptsData = await Receipts.find({
			order_uuid: { $in: CompleteOrdersData.map(a => a.order_uuid) }
		})
		receiptsData = JSON.parse(JSON.stringify(receiptsData))
		CompleteOrdersData = CompleteOrdersData.map(a => ({
			...data,
			...(receiptsData.find(b => b.order_uuid === a.order_uuid) || {})
		}))
		if (CompleteOrdersData.length) {
			let receiptItems = CompleteOrdersData.filter(b => b.trip_uuid === data.trip_uuid)
			let sales_return = [].concat.apply(
				[],
				receiptItems.map(b => b?.delivery_return || [])
			)
			// console.log(sales_return);
			sales_return =
				sales_return.length > 1
					? sales_return.reduce((acc, curr) => {
							let item = acc.find(item => item.item_uuid === curr.item_uuid)

							if (item) {
								item.p = +item.p + curr.p
								item.p = +item.b + curr.b
							} else {
								acc.push(curr)
							}

							return acc
					  }, [])
					: sales_return
			let itemData = await Item.find({
				item_uuid: sales_return.map(a => a.item_uuid)
			})
			sales_return = sales_return.map(b => ({
				...b,
				item_title: itemData.find(c => c.item_uuid === b.item_uuid)?.item_title
			}))
			let receiptData = await Receipts.find({ trip_uuid: data.trip_uuid })
			receiptData = JSON.parse(JSON.stringify(receiptData))
			receiptData = [].concat
				.apply(
					[],
					receiptData.map(b => b?.modes || [])
				)
				.filter(b => b.mode_uuid === "c67b54ba-d2b6-11ec-9d64-0242ac120002")
			let amt =
				receiptData?.length > 1 ? receiptData.map(a => +a.amt || 0).reduce((c, d) => c + d) : receiptData[0]?.amt
			let coin =
				receiptData?.length > 1
					? receiptData.map(a => +a.coin || 0).reduce((c, d) => c + d)
					: receiptData[0]?.coin || 0

			data = {
				...data,
				orderLength: CompleteOrdersData.filter(b => data.trip_uuid === b.trip_uuid).length,
				unpaid_invoice: OutstandingData.filter(b => b.trip_uuid === data.trip_uuid).map(b => ({
					...b,
					counter_title: CounterData.find(c => c.counter_uuid === b.counter_uuid)?.counter_title
				})),
				receiptItems,
				amt,
				coin,
				cheque: receiptItems
					?.filter(
						b => b?.modes?.filter(c => c.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002" && c.amt).length
					)
					.map(b => ({
						counter_title: CounterData.find(c => c.counter_uuid === b.counter_uuid)?.counter_title,
						amt: b?.modes?.find(c => c.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002")?.amt,
						invoice_number: b.invoice_number
					})),
				replacement: receiptItems
					.filter(b => b.replacement || b.replacement_mrp)
					.map(b => ({
						replacement: b.replacement,
						replacement_mrp: b.replacement_mrp,
						counter_title: CounterData.find(c => c.counter_uuid === b.counter_uuid)?.counter_title,
						invoice_number: b.invoice_number
					})),
				sales_return
			}

			res.json({
				success: true,
				result: data
			})
		} else res.json({ success: false, message: "Trips Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.post("/GetCompletedTripList", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		// console.log(value);
		let ordersData = await CompleteOrder.find({})
		ordersData = JSON.parse(JSON.stringify(ordersData))
		let endDate = +value.endDate + 86400000
		// console.log(endDate, value.startDate);
		let response = await Trips.find({
			created_at: { $gt: value.startDate, $lt: endDate },
			status: 0
		})
		response = JSON.parse(JSON.stringify(response))
		response = response.filter(a => !value.user_uuid || a.users.filter(b => b === value.user_uuid).length)
		let data = []
		for (let item of response) {
			let orderLength = ordersData.filter(b => item.trip_uuid === b.trip_uuid).length
			let users = []
			if (item.users.length) users = await Users.find({ user_uuid: { $in: item.users } })
			data.push({ ...item, orderLength, users })
		}
		if (data) {
			res.json({ success: true, result: data })
		} else res.json({ success: false, message: "Trip Not created" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

router.post("/GetProcessingTripList", async (req, res) => {
	try {
		const orderPipeline = [
			{
				$project: {
					status: "$status.stage",
					priority: 1
				}
			},
			{
				$match: {
					status: ["1"]
				}
			}
		]
		const nonTripOrders = await Orders.aggregate([{ $match: { trip_uuid: null } }, ...orderPipeline])
		const trips = await Trips.aggregate([
			{
				$match: {
					$and: [{ trip_title: { $exists: 1 } }, { trip_title: { $ne: "" } }]
				}
			},
			{
				$lookup: {
					from: "orders",
					localField: "trip_uuid",
					foreignField: "trip_uuid",
					as: "orderLength",
					pipeline: orderPipeline
				}
			},
			{
				$addFields: {
					orderLength: {
						$size: "$orderLength"
					},
					priorityOrders: {
						$sum: "$orderLength.priority"
					}
				}
			},
			{
				$match: {
					orderLength: {
						$gt: 0
					}
				}
			},
			{
				$sort: {
					created_at: 1
				}
			}
		])

		const unknownTrip = nonTripOrders?.length
			? [
					{
						trip_uuid: 0,
						trip_title: "Unknown",
						ordersLength: nonTripOrders?.length,
						priorityOrders: nonTripOrders?.reduce((sum, i) => sum + (+i.priority || 0), 0)
					}
			  ]
			: []

		res.json({
			success: true,
			result: unknownTrip.concat(trips)
		})
	} catch (err) {
		res.status(500).json({ success: false, message: err.message })
	}
})

router.post("/GetCheckingTripList", async (req, res) => {
	try {
		// console.log(req.body);
		let data = await Trips.find({})
		data = JSON.parse(JSON.stringify(data))
		let ordersData = await Orders.find({})
		ordersData = JSON.parse(JSON.stringify(ordersData))
		// console.log(ordersData);
		let result = [
			{
				trip_uuid: 0,
				trip_title: "Unknown",
				orderLength: ordersData
					.filter(b => !b.trip_uuid)
					?.filter(b =>
						b.status.length > 1
							? +b.status.map(c => +c.stage).reduce((c, d) => Math.max(c, d)) === 2
							: +b?.status[0]?.stage === 2
					).length
			},
			...data.map(a => ({
				...a,
				orderLength: ordersData
					.filter(b => a.trip_uuid === b.trip_uuid)
					?.filter(b =>
						b.status.length > 1
							? +b.status.map(c => +c.stage).reduce((c, d) => Math.max(c, d)) === 2
							: +b?.status[0]?.stage === 2
					).length
			}))
		].filter(a => a.orderLength)

		// console.log(result);
		res.json({
			success: true,
			result
		})
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.post("/GetDeliveryTripList", async (req, res) => {
	try {
		let data = await Trips.find({ users: req.body.user_uuid })
		data = JSON.parse(JSON.stringify(data))
		let ordersData = await Orders.find({})
		ordersData = JSON.parse(JSON.stringify(ordersData))

		let result = [
			...data.map(a => ({
				...a,
				orderLength: ordersData
					.filter(b => a.trip_uuid === b.trip_uuid)
					?.filter(b =>
						b.status.length > 1
							? +b.status.map(c => +c.stage).reduce((c, d) => Math.max(c, d)) === 3
							: +b?.status[0]?.stage === 3
					).length
			}))
		].filter(a => a.orderLength)
		// console.log(result);
		res.json({
			success: true,
			result: result
		})
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

module.exports = router
