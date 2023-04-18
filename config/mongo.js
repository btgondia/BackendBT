const mongoose = require("mongoose");

const connectDB = async () => {
	const conn = await mongoose.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});
	console.green(`Connected to MongoDB Atlas ${conn.connection.host}`);
};

module.exports = connectDB;
