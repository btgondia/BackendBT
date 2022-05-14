const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    user_title: {
        type: String,
    },
    status: {
        type: Number,
    },
    user_uuid: {
        type: String,
    },
    user_type: {
        type: String,
    },
    user_mobile: {
        type: String,
    },
    login_username: {
        type: String,
    },
    login_password: {
        type: String,
    },
    user_roles: [{
        type: String,
    }],
})


module.exports = mongoose.model('users', UserSchema)