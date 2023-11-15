
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: String,
    uimg: String,
    userid: String,
    date: {
        type: Date,
        default: Date.now
    
    },
});
const userModel = mongoose.model('User', userSchema);
module.exports = userModel