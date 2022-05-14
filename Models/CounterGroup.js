const mongoose = require('mongoose')

const CounterGroupSchema = new mongoose.Schema({
    counter_group_title: {
        type: String,
    },
    counter_group_uuid: {
        type: String,
    },
})


module.exports = mongoose.model('counter_groups', CounterGroupSchema)