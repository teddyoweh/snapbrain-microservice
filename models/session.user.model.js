
const mongoose = require('mongoose');

const sessionUserSchema = new mongoose.Schema({
    userid: String,
    sessionid: String,
    team: Number,
    date: {
        type: Date,
        default: Date.now
    
    },
 
   
});
const SessionUserModel = mongoose.model('SessionUser', sessionUserSchema);
module.exports = SessionUserModel