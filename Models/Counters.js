const mongoose = require('mongoose')

const CounterSchema = new mongoose.Schema({
    counter_title: {
        type: String,
    },
    sort_order: {
        type: Number,

    },
    counter_uuid: {
        type: String,

    },
    route_uuid: {
        type: String,

    },
    mobile: {
        type: String,

    },
    counter_group_uuid:[{
        type:String,
    }]
})


module.exports = mongoose.model('counters', CounterSchema)