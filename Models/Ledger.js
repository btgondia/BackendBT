const mongoose = require("mongoose")

const Ledger = new mongoose.Schema({
    ledger_uuid: { type: String },
    ledger_group_uuid: { type: String },
    ledger_title: { type: String },
    created_at: { type: Number },
})

module.exports = mongoose.model("ledger", Ledger)