
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
 createdby: String,
    title: String,
    teams:Number,
    code:String,
    date: {
        type: Date,
        default: Date.now
    
    },
    stat: {
    
     
    
    },
    activeQuestion: {
        type: Number,
        default: 0
    
    },
    maxNumnberTeam:{
        type: Number,
 
    

    }
   
});
const SessionModel = mongoose.model('Session', sessionSchema);
module.exports = SessionModel