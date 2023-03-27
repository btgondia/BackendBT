const mongoose = require("mongoose");

const cashRegisterSchema = new mongoose.Schema({
    register_uuid:{type:String},
    created_at:{type:Number},
    amount:{type:Number},
    order_uuid:{type:String},
    transaction_uuid:{type:String},
    type:{type:String},
    title:{type:String},
});

module.exports = mongoose.model("cash_register_transactions", cashRegisterSchema);
