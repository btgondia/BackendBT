const mongoose = require('mongoose')

const connectDB = async () => {
    const conn = await mongoose.connect("mongodb+srv://btgondia:UfWmWi7kuoMkfo1i@cluster0.tp4tb.mongodb.net/BT", {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log(`connected to mongoDB atlas ${conn.connection.host}`)
}

module.exports = connectDB;