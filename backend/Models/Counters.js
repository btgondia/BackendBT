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
    
    

})


module.exports = mongoose.model('counters', CounterSchema)