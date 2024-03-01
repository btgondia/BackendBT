const mongoose = require('mongoose');

const LedgerGroup = new mongoose.Schema({
    ledger_group_uuid: { type: String },
    ledger_group_title: { type: String },
    created_at: { type: Number },
});

module.exports = mongoose.model('ledger_group', LedgerGroup);