const mongoose = require("mongoose");

const cashRegisterSchema = new mongoose.Schema({
    register_uuid:{type:String},
    created_by:{type:String},
    status:{type:Number},
    balance:{type:Number},
    created_at:{type:Number,default:new Date(new Date().setHours(0, 0, 0, 0)).getTime()},
});

module.exports = mongoose.model("cash_register", cashRegisterSchema);
