const { paymentModeIDs } = require("../utils/constants")

module.exports.list = [
	{
		$match: {
			pending: 0,
			modes: {
				$elemMatch: {
					amt: {
						$gt: 0,
					},
					status: 0,
					mode_uuid: {
						$in: [paymentModeIDs.UPI.id, paymentModeIDs.CHEQUE.id],
					},
				},
			},
		},
	},
	{
		$lookup: {
			from: "orders",
			localField: "order_uuid",
			foreignField: "order_uuid",
			pipeline: [
				{
					$project: {
						order_uuid: 1,
						invoice_number: 1,
						order_date: {
							$first: "$status.time",
						},
					},
				},
			],
			as: "order_details",
		},
	},
	{
		$facet: {
			runningOrders: [
				{
					$match: {
						"order_details.order_uuid": {
							$exists: true,
						},
					},
				},
			],
			completedOrders: [
				{
					$match: {
						"order_details.order_uuid": {
							$exists: false,
						},
					},
				},
				{
					$lookup: {
						from: "completed_orders",
						localField: "order_uuid",
						foreignField: "order_uuid",
						pipeline: [
							{
								$project: {
									order_uuid: 1,
									invoice_number: 1,
									order_date: {
										$first: "$status.time",
									},
								},
							},
						],
						as: "order_details",
					},
				},
			],
		},
	},
	{
		$project: {
			data: {
				$concatArrays: ["$completedOrders", "$runningOrders"],
			},
		},
	},
	{
		$unwind: {
			path: "$data",
			preserveNullAndEmptyArrays: false,
		},
	},
	{
		$replaceRoot: {
			newRoot: {
				$mergeObjects: [
					{
						$first: "$data.order_details",
					},
					"$data",
				],
			},
		},
	},
	{
		$unset: "order_details",
	},
]
