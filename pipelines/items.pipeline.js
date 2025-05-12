module.exports.reportPipeline = ({
	startDate,
	endDate,
	counter_uuid,
	user_uuid,
	counter_group_uuid,
	matchQueries,
	conditions
}) => {
	return [
		...matchQueries.map((i) => ({ $match: i })),
		{
			$sort: {
				company_uuid: 1,
				item_title: 1
			}
		},
		...conditions.map((i) => {
			const statusCheck = {
				status: {
					$elemMatch: {
						stage: i.stage,
						time: {
							$gte: new Date(startDate).setUTCHours(-5, -30, 0, 0),
							$lt: new Date(endDate).setUTCHours(23 - 5, 60 - 30, 59, 99)
						}
					}
				}
			}
			return {
				$lookup: {
					from: i.collection,
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
								...(counter_uuid ? { counter_uuid } : {}),
								...(user_uuid
									? {
											$and: [statusCheck, { status: { $elemMatch: { stage: "1", user_uuid } } }]
									  }
									: statusCheck)
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
													$match: {
														counter_group_uuid: {
															$in: [counter_group_uuid]
														}
													}
												},
												{
													$project: {
														_id: 1
													}
												}
											],
											as: "counter"
										}
									},
									{
										$match: {
											"counter._id": {
												$exists: true
											}
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
							$set: {
								p: {
									$add: [
										"$item_details.p",
										{
											$multiply: ["$item_details.b", "$$conversion"]
										}
									]
								},
								price: ["$item_details.edit_price", "$item_details.price", "$item_details.unit_price"]
							}
						},
						{
							$replaceRoot: {
								newRoot: {
									item: {
										price: {
											$multiply: [
												{
													$first: {
														$filter: {
															input: "$price",
															as: "prc",
															cond: {
																$and: [{ $ne: ["$$prc", null] }, { $gt: ["$$prc", 0] }]
															}
														}
													}
												},
												"$p"
											]
										},
										p: { $add: [{ $ifNull: ["$item_details.free", 0] }, "$p"] },
									}
								}
							}
						}
					],
					as: i.collection
				}
			}
		}),
		{
			$set: {
				sales: {
					$concatArrays: conditions.map((i) => `$${i.collection}`)
				}
			}
		},
		{
			$match: {
				"sales.item": { $exists: 1 }
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
						input: "$sales",
						initialValue: { p: 0, b: [0, 0], price: 0 },
						in: {
							p: {
								$add: ["$$value.p", "$$this.item.p"]
							},
							price: {
								$add: ["$$value.price", "$$this.item.price"]
							}
						}
					}
				}
			}
		},
		{
			$limit: 100
		}
	]
}

module.exports.reportTotalPipeline = ({
	startDate,
	endDate,
	counter_uuid,
	counter_group_uuid,
	user_uuid,
	company_uuid,
	item_group_uuid,
	stage
}) => {
	const statusCheck = {
		status: {
			$elemMatch: {
				stage,
				time: {
					$gte: new Date(startDate).setUTCHours(-5, -30, 0, 0),
					$lt: new Date(endDate).setUTCHours(23 - 5, 60 - 30, 59, 99)
				}
			}
		}
	}
	return [
		{
			$match: {
				...(counter_uuid ? { counter_uuid } : {}),
				...(user_uuid
					? {
							$and: [statusCheck, { status: { $elemMatch: { stage: "1", user_uuid } } }]
					  }
					: statusCheck)
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
									$match: {
										counter_group_uuid: {
											$in: [counter_group_uuid]
										}
									}
								}
							],
							as: "counter"
						}
					},
					{
						$match: {
							"counter.counter_uuid": {
								$exists: true
							}
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
			$lookup: {
				from: "items",
				localField: "item_details.item_uuid",
				foreignField: "item_uuid",
				pipeline: [
					...(company_uuid || item_group_uuid
						? [
								{
									$match: {
										...(company_uuid ? { company_uuid } : {}),
										...(item_group_uuid ? { item_group_uuid: { $in: [item_group_uuid] } } : {})
									}
								}
						  ]
						: []),
					{
						$project: {
							conversion: 1
						}
					}
				],
				as: "item"
			}
		},
		{
			$match: {
				"item._id": {
					$exists: true
				}
			}
		},
		{
			$set: {
				p: {
					$add: [
						"$item_details.p",
						{
							$multiply: ["$item_details.b", { $toInt: { $first: "$item.conversion" } }]
						}
					]
				},
				b: ["$item_details.b", { $add: [{ $ifNull: ["$item_details.free", 0] }, "$item_details.p"] }],
				price: ["$item_details.edit_price", "$item_details.price", "$item_details.unit_price"]
			}
		},
		{
			$replaceRoot: {
				newRoot: {
					p: { $add: [{ $ifNull: ["$item_details.free", 0] }, "$p"] },
					b: "$b",
					price: {
						$multiply: [
							{
								$first: {
									$filter: {
										input: "$price",
										as: "prc",
										cond: {
											$and: [{ $ne: ["$$prc", null] }, { $gt: ["$$prc", 0] }]
										}
									}
								}
							},
							"$p"
						]
					}
				}
			}
		},
		{
			$group: {
				_id: null,
				p: { $sum: "$p" },
				b0: { $sum: { $arrayElemAt: ["$b", 0] } },
				b1: { $sum: { $arrayElemAt: ["$b", 1] } },
				price: { $sum: "$price" }
			}
		},
		{
			$project: {
				_id: 0,
				sales: {
					p: "$p",
					b: ["$b0", "$b1"],
					price: "$price"
				}
			}
		}
	]
}
