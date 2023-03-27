const mongoose = require("mongoose");

const cashRegisterSchema = new mongoose.Schema({
    register_uuid:{type:String},
    created_by:{type:String},
    status:{type:Number},
    balance:{type:Number},
    created_at:{type:Number},
});

module.exports = mongoose.model("cash_register", cashRegisterSchema);
