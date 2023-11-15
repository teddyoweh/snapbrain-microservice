
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
 question: String,
 answers:{
        type: Array,
        default: []
    
 },
    correct: Number,
    title: String,
    date: {
        type: Date,
        default: Date.now
    
    },
    sessionid: String,
    point:Number,
});
const questionModel = mongoose.model('Questions', questionSchema);
module.exports = questionModel