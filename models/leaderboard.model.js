
const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
    userid:String,
 questionid: String,
 
  point:Number,
  team:Number,

    date: {
        type: Date,
        default: Date.now
    
    },
    sessionid: String,


});
const leaderboardModel = mongoose.model('leaderboard', leaderboardSchema);
module.exports = leaderboardModel