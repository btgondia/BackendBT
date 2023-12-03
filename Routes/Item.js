const express = require("express")

const router = express.Router()
const { v4: uuid } = require("uuid")
const Details = require("../Models/Details")
const Item = require("../Models/Item")
const OrderCompleted = require("../Models/OrderCompleted")
const Orders = require("../Models/Orders")
const fs = require("fs")
router.post("/postItem", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		value = { ...value, item_uuid: value.item_uuid || uuid() }
		if (!value.sort_order) {
			let response = await Item.find({}, { sort_order: 1 })
			response = JSON.parse(JSON.stringify(response))
			value.sort_order = Math.max(...response.map(o => o?.sort_order || 0)) + 1 || 0
			value.created_at = new Date().getTime()
		}
		console.log(value)
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
			fs.access("uploads/" + (item_uuid || "") + ".png", err => {
				if (err) {
					console.log(err)
					return
				}
				fs.unlink("uploads/" + (item_uuid || "") + ".png", err => {
					if (err) {
						console.log(err)
						return
					}
				})
			})
			fs.access("uploads/" + (item_uuid || "") + "thumbnail.png", err => {
				if (err) {
					console.log(err)
					return
				}
				fs.unlink("uploads/" + (item_uuid || "") + "thumbnail.png", err => {
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
		let data = await Item.find({})

		if (data.length)
			res.json({
				success: true,
				result: data.filter(a => a.item_uuid && a.item_title)
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

				item_group_uuid: 1,
				// stock: 1,
				created_at: 1
			}
		)

		if (data.length)
			res.json({
				success: true,
				result: data.filter(a => a.item_uuid && a.item_title)
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
			conversion: 1,
			barcode: 1,
			item_group_uuid: 1,
			// stock: 1,
			created_at: 1
		})

		if (data.length)
			res.json({
				success: true,
				result: data.filter(a => a.item_uuid && a.item_title)
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
				conversion: 1,
				barcode: 1,
				item_group_uuid: 1,
				billing_type: 1,
				created_at: 1
			}
		)

		if (data.length)
			res.json({
				success: true,
				result: data.filter(a => a.item_uuid && a.item_title)
			})
		else res.json({ success: false, message: "Item Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.post("/GetItemData", async (req, res) => {
	try {
		let value = req.body
		let json = {}

		for (let i of value) {
			json = { ...json, [i]: 1 }
		}
		console.log(json)
		let data = await Item.find({}, json)

		if (data.length) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Counters Not found" })
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
			"warehouse_uuid": req.params.warhouse_uuid
		})
		ordersData=JSON.parse(JSON.stringify(ordersData))
	

		ordersData = ordersData.filter(order=>+order.status[order.status.length-1].stage===2)

		let allItems = [].concat
			.apply(
				[],
				ordersData.map(b => b?.item_details || [])
			)
			.filter(a => a.item_uuid === req.params.item_uuid)
			.map(a => +a.b * Itemdata.conversion + +a.p)
		allItems = allItems.length > 1 ? allItems.reduce((a, b) => +a + b) : allItems.length ? allItems[0] : 0
		console.log(allItems)
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
		console.log(req.params.warhouse_uuid)
		let data = await Item.find({ status: 1 })
		data = JSON.parse(JSON.stringify(data))
		if (req.params.warhouse_uuid)
			data = data.map(a => ({
				...a,
				qty: a.stock.find(b => b.warehouse_uuid === req.params.warhouse_uuid)?.qty || 0
			}))

		if (data.length)
			res.json({
				success: true,
				result: data.filter(a => a.item_uuid && a.item_title)
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
				.filter(key => key !== "_id")
				.reduce((obj, key) => {
					obj[key] = value[key]
					return obj
				}, {})
			console.log(value)
			let response = await Item.updateOne({ item_uuid: value.item_uuid }, value)
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
			if (stock.filter(a => a.qty && value?.find(b => b === a.warehouse_uuid)).length) {
				stock = stock.map(b => (value.find(c => c === b.warehouse_uuid) ? { ...b, qty: 0 } : b))
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
		let { startDate, endDate, counter_uuid, counter_group_uuid, item_group_uuid, company_uuid, last_item } =
			req.body
		if (!endDate) return res.json({ success: false, message: "No date range provided" })

		const aggregate = [
			...(last_item
				? [
						{
							$match: {
								$or: [
									{
										$and: [
											{
												$expr: {
													$eq: ["$company_uuid", last_item.company_uuid]
												}
											},
											{
												$expr: {
													$gt: [
														{
															$toLower: "$item_title"
														},
														{
															$toLower: last_item.item_title
														}
													]
												}
											}
										]
									},
									{
										company_uuid: {
											$gt: last_item.company_uuid
										}
									}
								]
							}
						}
				  ]
				: []),
			...(item_group_uuid || company_uuid
				? [
						{
							$match: {
								...(item_group_uuid && company_uuid
									? {
											$or: [{ company_uuid }, { item_group_uuid }]
									  }
									: item_group_uuid
									? { item_group_uuid }
									: { company_uuid })
							}
						}
				  ]
				: []),
			...(!last_item
				? [
						{
							$sort: {
								company_uuid: 1,
								item_title: 1
							}
						},
						{ $limit: 200 }
				  ]
				: []),
			{
				$lookup: {
					from: "completed_orders",
					let: {
						this_item: "$item_uuid",
						conversion: {
							$convert: {
								input: "$conversion",
								to: "int",
								onError: 1
							}
						}
					},
					pipeline: [
						{
							$match: {
								...(!counter_group_uuid && counter_uuid
									? {
											counter_uuid
									  }
									: {}),
								"status": {
									$elemMatch: {
										stage: "1",
										time: {
											$gte: new Date(startDate).setHours(0, 0, 0, 0),
											$lt: new Date(endDate).setHours(23, 59, 59, 99)
										}
									}
								},
								"item_details.item_uuid": {
									$exists: true
								}
							}
						},
						...(counter_group_uuid
							? [
									{
										$lookup: {
											from: "counters",
											localField: "counter_uuid",
											foreignField: "counter_uuid",
											pipeline: [
												{
													$match:
														counter_uuid && counter_group_uuid
															? {
																	$or: [
																		{
																			counter_group_uuid
																		},
																		{
																			counter_uuid
																		}
																	]
															  }
															: { counter_group_uuid }
												},
												{
													$replaceRoot: {
														newRoot: {}
													}
												}
											],
											as: "counter"
										}
									},
									{
										$unwind: {
											path: "$counter",
											preserveNullAndEmptyArrays: false
										}
									}
							  ]
							: []),
						{
							$unwind: {
								path: "$item_details",
								preserveNullAndEmptyArrays: false
							}
						},
						{
							$match: {
								$expr: {
									$eq: ["$item_details.item_uuid", "$$this_item"]
								}
							}
						},
						{
							$replaceRoot: {
								newRoot: {
									item: {
										p: {
											$add: [
												"$item_details.p",
												{
													$multiply: ["$item_details.b", "$$conversion"]
												}
											]
										},
										price: "$item_details.price"
									},
									added: {
										$arrayElemAt: [
											{
												$filter: {
													input: "$auto_added",
													as: "elem",
													cond: {
														$eq: ["$$elem.item_uuid", "$$this_item"]
													}
												}
											},
											0
										]
									},
									cancelled: {
										$arrayElemAt: [
											{
												$filter: {
													input: "$processing_canceled",
													as: "elem",
													cond: {
														$eq: ["$$elem.item_uuid", "$$this_item"]
													}
												}
											},
											0
										]
									},
									returned: {
										$arrayElemAt: [
											{
												$filter: {
													input: "$delivery_return",
													as: "elem",
													cond: {
														$eq: ["$$elem.item_uuid", "$$this_item"]
													}
												}
											},
											0
										]
									}
								}
							}
						}
					],
					as: "orders"
				}
			},
			{
				$match: {
					"orders.item": {
						$exists: 1
					}
				}
			},
			{
				$project: {
					item_uuid: 1,
					item_title: 1,
					company_uuid: 1,
					mrp: 1,
					conversion: 1,
					sales: {
						$reduce: {
							input: "$orders",
							initialValue: {},
							in: {
								p: {
									$add: [
										{
											$ifNull: ["$$value.p", 0]
										},
										{
											$ifNull: ["$$this.item.p", 0]
										}
									]
								},
								price: {
									$add: [
										{
											$ifNull: ["$$value.price", 0]
										},
										{
											$multiply: [
												{
													$ifNull: ["$$this.item.p", 0]
												},
												{
													$ifNull: ["$$this.item.price", 0]
												}
											]
										}
									]
								}
							}
						}
					},
					added: {
						$reduce: {
							input: "$orders",
							initialValue: { p: 0, price: 0 },
							in: {
								p: {
									$add: [
										"$$value.p",
										{
											$ifNull: ["$$this.added.p", 0]
										}
									]
								},
								price: {
									$add: [
										"$$value.price",
										{
											$multiply: [
												{
													$ifNull: ["$$this.added.p", 0]
												},
												"$$this.item.price"
											]
										}
									]
								}
							}
						}
					},
					returned: {
						$reduce: {
							input: "$orders",
							initialValue: { p: 0, price: 0 },
							in: {
								p: {
									$add: [
										"$$value.p",
										{
											$ifNull: ["$$this.returned.p", 0]
										}
									]
								},
								price: {
									$add: [
										"$$value.price",
										{
											$multiply: [
												{
													$ifNull: ["$$this.returned.p", 0]
												},
												"$$this.item.price"
											]
										}
									]
								}
							}
						}
					},
					cancelled: {
						$reduce: {
							input: "$orders",
							initialValue: { p: 0, price: 0 },
							in: {
								p: {
									$add: [
										"$$value.p",
										{
											$ifNull: ["$$this.cancelled.p", 0]
										}
									]
								},
								price: {
									$add: [
										"$$value.price",
										{
											$multiply: [
												{
													$ifNull: ["$$this.cancelled.p", 0]
												},
												"$$this.item.price"
											]
										}
									]
								}
							}
						}
					}
				}
			},
			{
				$sort: {
					company_uuid: 1,
					item_title: 1
				}
			},
			{
				$limit: 100
			}
		]

		const data = await Item.aggregate(aggregate)
		let result = data.map(({ _id, ...value }) => {
			const sumResult = Object.keys(value)
				.filter(key => typeof value[key] !== "string")
				.reduce((_, key) => ({ ..._, [key]: value[key] }), {})

			sumResult.sales.price = +sumResult.sales.price.toFixed(2)

			const wholeQty = Object.values(sumResult).reduce((qty, { p }) => qty + p, 0)
			const pctResult = Object.keys(sumResult)
				.filter(key => key !== "sales")
				.reduce(
					(_result, key) => ({
						..._result,
						[key]: {
							...value[key],
							price: +sumResult[key].price.toFixed(2),
							pct: +((sumResult[key].p * 100) / wholeQty).toFixed(2)
						}
					}),
					{}
				)

			const remaining = Object.keys(value)
				.filter(key => typeof value[key] !== "object")
				.reduce((obj, key) => ({ ...obj, [key]: value[key] }), {})

			return { ...remaining, ...sumResult, ...pctResult }
		})

		res.json({ success: true, length: result.length, result, aggregate })
	} catch (err) {
		res.status(500).json({ success: false, message: err.message })
	}
})

module.exports = router
