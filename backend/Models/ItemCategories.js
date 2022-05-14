const mongoose = require('mongoose')

const ItemCategoriesSchema = new mongoose.Schema({
    category_title: {
        type: String,
    },
    sort_order: {
        type: Number,

    },
    category_uuid: {
        type: String,

    },
    company_uuid: {
        type: String,

    },

    

})


module.exports = mongoose.model('item_categories', ItemCategoriesSchema)