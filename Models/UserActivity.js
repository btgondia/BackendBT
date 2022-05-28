const mongoose = require('mongoose')

const userActivitySchema = new mongoose.Schema({
    user_uuid: {
        type: String,
    },
   role:{
       type:String
   },
    narration: {
        type: String,
    },
    timeStamp: {
        type: Number,
    },
    activity: {
        type: String,
    },
    range: {
        type: Number,
    },
    qty: {
        type: String,
    },
    amt: {
        type: Number,
    },
    
})


module.exports = mongoose.model('user_activity', userActivitySchema)