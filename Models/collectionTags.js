const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
 
    created_by: {
        type: String,
    },
    created_at: {
        type: Number,
    },

    collection_tag_uuid: {
        type: String,
    },
    collection_tag_title: {
        type: String,
    },
    collection_tag_number: {
        type: String,
    },
    
    status: {
        type: Number,
    },
    assigned_to: [{
        type: String,
    }],
})


module.exports = mongoose.model('collection_tag', UserSchema)