const mongoose = require('mongoose')

const RoutesSchema = new mongoose.Schema({
    route_title: {
        type: String,
    },
    sort_order: {
        type: Number,

    },
    route_uuid: {
        type: String,

    },
    
    warehouse_uuid: {
        type: String,

    },
    

})


module.exports = mongoose.model('routes', RoutesSchema)