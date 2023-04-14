const mongoose = require("mongoose");

console.log(process.env.MONGO_URI);
const connectDB = async () => {
	const conn = await mongoose.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});
	console.log(`Connected to mongoDB atlas ${conn.connection.host}`);
};

module.exports = connectDB;
