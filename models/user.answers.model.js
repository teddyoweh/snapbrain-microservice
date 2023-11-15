
const mongoose = require('mongoose');

const userAnswers = new mongoose.Schema({
    userid: String,
    sessionid: String,
    questionid: String,
    team: Number,
    date: {
        type: Date,
        default: Date.now
    
    },
    answerNumber: Number,
 
   
});
const userAnswerModel = mongoose.model('userAnswer', userAnswers);
module.exports = userAnswerModel