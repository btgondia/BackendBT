const mongoose = require('mongoose')

const itemGroupSchema = new mongoose.Schema({
    item_group_title: {
        type: String,
    },
    item_group_uuid: {
        type: String,
    },
})


module.exports = mongoose.model('item_groups', itemGroupSchema)