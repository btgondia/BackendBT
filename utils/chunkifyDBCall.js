module.exports = async function chunkifyDBCall(Model, chunkSize = 20, query, projection) {
	const count = await Model.countDocuments(query)

	const promiseArr = Array(Math.ceil(count / chunkSize))
		.fill()
		.map((i, chunkIdx) =>
			Model.find(query, projection)
				.skip(chunkSize * chunkIdx)
				.limit(chunkSize)
		)

	const data = await Promise.all(promiseArr)
	return data.flat()
}
