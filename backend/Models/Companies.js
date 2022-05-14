const mongoose = require('mongoose')

const CompaniesSchema = new mongoose.Schema({
    company_title: {
        type: String,
    },
    sort_order: {
        type: Number,

    },
    company_uuid: {
        type: String,

    },
    

})


module.exports = mongoose.model('companies', CompaniesSchema)