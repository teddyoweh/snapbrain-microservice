require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Game, Team, Player,Session } = require('./controllers');
const cors = require('cors');  
const crypto = require('crypto');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const { randomBytes } = require('crypto');
const https = require('https');

const fs = require('fs');
const SessionModel = require('./models/session.model');
const userModel = require('./models/user.model');
const SessionUserModel = require('./models/session.user.model');
const questionModel = require('./models/questions.model');
const { WebSocketServer } = require('ws');
const snapSocket = require('./socket');
const { Js } = require('iconsax-react');
const userAnswerModel = require('./models/user.answers.model');
const leaderboardModel = require('./models/leaderboard.model');
const config = {
    DB: process.env.MONGODB
      
}
let pngFiles = [];
const PORT = process.env.PORT || 3030;
fs.readdir("./images", (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
      return;
    }

    
   
     pngFiles = files.filter(file => file.endsWith('.png'));
    
   
  });


  function generateUID(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = randomBytes(length);
    let uid = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = bytes[i] % characters.length;
      uid += characters.charAt(randomIndex);
    }
  
      return uid;
  }

  mongoose.connect(config.DB, { useNewUrlParser: true }).then(
    () => {
        console.log('Database is connected');
    },
    (err) => {
        console.log('Can not connect to the database' + err);
    }
);



function createUniqueId() {
    const timestamp = new Date().getTime().toString(16);  
    const randomPart = Math.floor(Math.random() * 1000000).toString(16); 
    const data =`${timestamp}-${randomPart}`;
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}
async function getUserSessionsAndTeams(sessionid) {
    try {
      const userSessions = await SessionUserModel.find({
        sessionid: sessionid
      });
      const teamHashMap = {};
  
      userSessions.forEach(session => {
        const { team } = session;
        
        if (!teamHashMap[team]) {
          teamHashMap[team] = [];
        }
  
        teamHashMap[team].push(session);
      });
  
      return { userSessions, teamHashMap };
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw error;
    }
  }
const memory = {
    sessions: [],

};

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello World!');
    });

    app.post('/api/create_session', async (req, res) => {
        try {
             const existingUser = await userModel.findOne({ userid: req.body.userid });
    
            if (existingUser) {
 
                existingUser.username = req.body.username;
                existingUser.uimg = req.body.uimg;
                await existingUser.save();
            } else {
 
                const newUser = new userModel({
                    username: req.body.username,
                    uimg: req.body.uimg,
                    userid: req.body.userid,
                });
    
                await newUser.save();
            }
    
      
            const newSession = new SessionModel({
                createdby: req.body.userid,
                title: req.body.title,
                date: req.body.date,
                teams: req.body.teams,
                maxNumnberTeam: req.body.maxper,
                code: generateUID(),
            });
    
    
            const savedSession = await newSession.save();
    
 
            res.json(savedSession);
        } catch (err) {
 
            res.status(500).send(err.message);
        }
    });
 async function getQuestions(sessionid){
    const questions = await questionModel.find({
        sessionid: sessionid
      });
      return questions
 }
 async function getSessionInfo(sessionid) {
    console.log(sessionid,"sessionid");
    try {
        const session = await SessionModel.findOne({ _id: sessionid });
        if (!session) {
            throw new Error("Session not found");
        }

        const sessionUsers = await SessionUserModel.find({ sessionid: sessionid });
        console.log(sessionUsers,"sessionUsers");
        const usersInGroups = [];
        const usersNotInGroups = [];
        const groupsAggregate = {};
        for (let teamNumber = 1; teamNumber <= session.teams; teamNumber++) {
            groupsAggregate[teamNumber] = [];
        }
        for (const user of sessionUsers) {
            const userInfo = await userModel.findOne({ userid: user.userid });

            if (!userInfo) {
                continue;  
            }

            const userEntry = {
                username: userInfo.username,
                userid: userInfo.userid,
                uimg: userInfo.uimg,
            };

            if (user.team) {
               
                usersInGroups.push(userEntry);

            
                if (!groupsAggregate[user.team]) {
                    groupsAggregate[user.team] = [];
                }
                groupsAggregate[user.team].push(userEntry);
            } else {
       
                usersNotInGroups.push(userEntry);
            }
        }

        const usersInfo = {
            in_groups: usersInGroups,
            not_in_groups: usersNotInGroups,
        };

        return { users_info: usersInfo, groups_agg: groupsAggregate };
    } catch (error) {
        throw error;
    }
}

 async function getLeaderboard(sessionid) {
    try {
        const leaderboardEntries = await leaderboardModel.find({ sessionid: sessionid });
        const resultArray = [];

        
        const userTotalPointsMap = new Map();
        const userTeamMap = new Map();

        for (const entry of leaderboardEntries) {

            const userAnswers = await userAnswerModel.find({
                userid: entry.userid,
                sessionid: sessionid,
            });

            userTeamMap.set(entry.userid, entry.team);
            let totalPoints = 0;

            for (const userAnswer of userAnswers) {
                const question = await questionModel.findById(userAnswer.questionid);

                if (question) {
                    const isCorrect = userAnswer.answerNumber === question.correct;
                    totalPoints += isCorrect ? question.point : 0;
                }
            }

            // Update the total points for the user in the map
            if (userTotalPointsMap.has(entry.userid)) {
                userTotalPointsMap.set(entry.userid,  totalPoints);
            } else {
                userTotalPointsMap.set(entry.userid, totalPoints);
            }
        }

        // Create the result array with aggregated user information
        for (const [userid, totalPoints] of userTotalPointsMap.entries()) {
            const user = await userModel.findOne({ userid: userid });
            
            const resultPerUser = {
                user: {
                    username: user.username,
                    uimg: user.uimg,
                    sessionid: sessionid,
                    userid: userid,
                    team: userTeamMap.get(userid),
                 
                },
                leaderboard: {
                    point: totalPoints,
                    date: new Date(), // You can customize this as needed
                },
            };

            resultArray.push(resultPerUser);
        }

        return resultArray;
    } catch (error) {
        throw error;
    }
}

async function fetchData(session,sessionId) {
    try {
        const [questions, usersessions, leaderboard, sessionInfo] = await Promise.all([
            getQuestions(sessionId),
            getUserSessionsAndTeams(sessionId),
            getLeaderboard(sessionId),
            getSessionInfo(sessionId),
        ]);

        const result = {
            usersession: usersessions,
            session: session,
            questions: questions,
            leaderboard: leaderboard,
            sessionInfo: sessionInfo,
        };

        return result;
    } catch (error) {
        throw error;
    }
}

 app.post('/api/get_session', (req, res) => {
    const {userid,sessionid} = req.body
    SessionModel.findById(sessionid).then(async (session) => {
       const questions = await getQuestions(sessionid)
         const usersessions = await getUserSessionsAndTeams(sessionid)
            const leaderboard = await getLeaderboard(sessionid)
            const sessionInfo = await getSessionInfo(sessionid);
            res.json({usersession:usersessions,session:session,questions:questions,leaderboard:leaderboard,sessionInfo:sessionInfo})
        
    })})
 app.post('/api/update_team_no', (req, res) => {
    const {userid,sessionid,teamno} = req.body
    SessionModel.findByIdAndUpdate(sessionid, { teams: teamno}, { new: true })
    .then((session) => {
        console.log("Updated team no");
    })
    .catch((err) => {
        res.status(500).send(err.message);
    });

 })

 app.post('/api/update_max_team_no', (req, res) => {
    const {userid,sessionid,maxteamno} = req.body
    SessionModel.findByIdAndUpdate(sessionid, { maxNumnberTeam: maxteamno}, { new: true })
    .then((session) => {
        console.log("Updated max team no");
    })
    .catch((err) => {
        res.status(500).send(err.message);
    });

 })
 
 app.post('/api/get_user_session', (req, res) => {
    const {userid,sessionid} = req.body
    res.json(getUserSessionsAndTeams(sessionid))
   

 });
 app.post('/api/create_question', (req, res) => {
    const {userid,sessionid,question,answers,correct,point} = req.body

    const newQuestion = new questionModel({
        question: question,
        answers: answers,
        correct: correct,
        sessionid: sessionid,
        point:point,
        
 

    
    })
    newQuestion.save().then((question) => {
        SessionModel.findById(sessionid).then(async (session) => {
            const questions = await getQuestions(sessionid)
            const usersessions = await getUserSessionsAndTeams(sessionid)
            const leaderboard = await getLeaderboard(sessionid)

            res.json({usersession:usersessions,session:session,questions:questions,leaderboard:leaderboard})
        
         })
    }
    ).catch((err) => {
        res.status(500).send(err.message);
    })
  
   

 });

 app.post('/api/delete_question', (req, res) => {
    const {userid,sessionid,questionid} = req.body
    questionModel.findByIdAndDelete(questionid).then((question) => {
        SessionModel.findById(sessionid).then(async (session) => {
            const questions = await getQuestions(sessionid)
            const usersessions = await getUserSessionsAndTeams(sessionid)
            res.json({usersession:usersessions,session:session,questions:questions})
        
         })
    })
 });
 app.post('/api/get_buzz_data', async (req, res) => {
    const { sessionid, questionid } = req.body;
     try {
        const usersData = await userAnswerModel.find({
            sessionid: sessionid,
            questionid: questionid,
        });

        const userIds = usersData.map(user => user.userid);

        const userData = await userModel.find({ userid: { $in: userIds } });

        console.log(usersData,"usersData");
        const mergedUserData = userData.map(user => {
            const answerData = usersData.find(u => u.userid === user.userid);
            return {
                ...user.toObject(), // Convert Mongoose document to plain JavaScript object
                answerNumber: answerData ? answerData.answerNumber : null,
                team: answerData ? answerData.team : null,
                // Add other fields as needed
            };
        });
        console.log(mergedUserData,"mergedUserData");
        res.json({ usersData: mergedUserData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

 app.post('/api/create_user', (req, res) => {
    const newUser = new userModel({
        username: req.body.username,
        uimg: req.body.uimg,
        userid: req.body.userid,

 

    })
    newUser.save().then((user) => {
        res.json(user);
    }
    ).catch((err) => {
        res.status(500).send(err.message);
    })

    })
    app.post('/api/update_user_team', (req, res) => {
      const {userid,session,team} = req.body
        SessionUserModel.findOneAndUpdate({ userid: userid, sessionid: session }, { $set: { team: team } }, { new: true })
        .then((user) => {
            res.json(user);
        })
        })
    app.post('/api/answer_question', (req, res) => {
        const { userid, session, questionid, answer, team } = req.body;
        
        userAnswerModel.findOne({ userid: userid, sessionid: session, questionid: questionid })
        .then((existingUser)=> {
            if (existingUser) {
                return res.status(400).send("User with the provided userid already exists");
            } else {
                const newUserAnswer = new userAnswerModel({
                    userid: userid,
                    sessionid: session,
                    questionid: questionid,
                    answerNumber: answer,
                    team: team,
                });
    
                newUserAnswer.save()
                .then(() => {
                     questionModel.findById(questionid)
                    .then((question) => {
                        if (!question) {
                            return res.status(404).send("Question not found");
                        }
    
                        const isCorrect = (answer === question.correct);
                        const point = isCorrect ? question.point : 0;
    
                        leaderboardModel.findOneAndUpdate(
                            { userid: userid, questionid: questionid, sessionid: session, team: team },
                            { $inc: { point: point }, $set: { group: team } },
                            { upsert: true, new: true }
                        )
                        .then((leaderboardEntry) => {
                            res.json({ userAnswer: newUserAnswer, leaderboardEntry: leaderboardEntry });
                        })
                        .catch((err) => {
                            res.status(500).send(err.message);
                        });
                    })
                    .catch((err) => {
                        res.status(500).send(err.message);
                    });
                })
                .catch((err) => {
                    res.status(500).send(err.message);
                });
            }
        });
    });
    
    
 
 
app.post('/api/join_session', (req, res) => {
    const {userid,code} = req.body
    SessionModel.findOne({
        code:code
    }).then(session=>{
        const usersession = new SessionUserModel({
            userid: userid,
            sessionid: session._id,
      
            date: Date.now()
    
        })
        usersession.save().then( async (session_) => {
            const newUser = new userModel({
                username: req.body.username,
                uimg: req.body.uimg,
                userid: req.body.userid,
        
         
            
            })
            newUser.save().then(async (user) => {
                const questions = await getQuestions(session._id)
                const usersessions = await getUserSessionsAndTeams(session._id)
                   const leaderboard = await getLeaderboard(session._id)
                   const sessionInfo = await getSessionInfo(session._id);
 
                   res.json({usersession:usersessions,session:session,questions:questions,leaderboard:leaderboard,sessionInfo:sessionInfo})
               
          
         
            }
            ).catch((err) => {
                res.status(500).send(err.message);
            })
        
        }
        ).catch((err) => {
            res.status(500).send(err.message);
        })

    })
})
 
app.get('/images', (req, res) => {
    

    res.json({ images: pngFiles });
  });
app.use('/public', express.static('./images'));

app.listen(PORT, () => {
    const WebSocket = require('ws');
    const http = require('http');
    const url = require('url');
    const options = {
        key: fs.readFileSync(path.join(__dirname, 'server.key')),
        cert: fs.readFileSync(path.join(__dirname, 'server.cert')),
      };
      
      const server = https.createServer(options, (req, res) => {
        res.writeHead(200);
        res.end('Hello, HTTPS world!');
      });
    
    const wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws, req) => {
      const userId = url.parse(req.url, true).query.userId;
      const sessionId = url.parse(req.url, true).query.sessionId;
      console.log(`User connected with ID: ${userId} to session ${sessionId}`);

    
    
      ws.on('message', (message) => {
        console.log(`Received message from user ${userId}: ${ message}`);
        const { type, data } = JSON.parse(message);

        if(type=="update_stat"){
            SessionModel.findByIdAndUpdate(sessionId, { stat: data.stat}, { new: true })
            .then((session) => {
                console.log("Updated stat");
            })
        }
       else if (type=="update_question"){
            SessionModel.findByIdAndUpdate(sessionId, { activeQuestion: data.activeQuestion}, { new: true })
            .then((session) => {
                console.log("Updated question");
            })
        }
        else if (type=="update_teamno"){
            SessionModel.findByIdAndUpdate(sessionId, { teams: data.teamno}, { new: true })
            .then((session) => {
                console.log("Updated team no");
            })
            .catch((err) => {
                res.status(500).send(err.message);
            });
        }
        else if (type=="update_max_teamno"){
            SessionModel.findByIdAndUpdate(sessionId, { maxNumnberTeam: data.maxteamno}, { new: true })
    .then((session) => {
        console.log("Updated max team no");
    })
    .catch((err) => {
        res.status(500).send(err.message);
    });
        }
      });
   
      const changeStream = SessionModel.watch({ fullDocument: 'updateLookup', filter: { '_id': sessionId } });


      changeStream.on('change', async (change) => {
         console.log("Change in session");
          
       const newDoc = await SessionModel.findById(sessionId);
    
      
       console.log(newDoc.stat);
        ws.send(JSON.stringify({
            type: "update_stat",
            data: {
                stat: newDoc.stat,
                activeQuestion:newDoc.activeQuestion,
                teams:newDoc.teams,
                maxNumnberTeam:newDoc.maxNumnberTeam,
     
            }
        }));
      });
      
  const changeStream0 = leaderboardModel.watch({ fullDocument: 'updateLookup', filter: {sessionid: sessionId } });
  changeStream0.on('change', async (change) => {
    console.log("Change in leaderboard session");
    const leaderboard = await getLeaderboard(sessionId)
 
    ws.send(JSON.stringify({
        type: "update_leaderboard",
        data: {
            leaderboard
        },
    }));
});
const changeStreamx = SessionUserModel.watch({ fullDocument: 'updateLookup', filter: {sessionid: sessionId } });
changeStreamx.on('change', async (change) => {
    console.log("Change in session");

    try {
        const [newDoc, questions, usersessions, leaderboard, sessionInfo] = await Promise.all([
            SessionModel.findById(sessionId),
            getQuestions(sessionId),
            getUserSessionsAndTeams(sessionId),
            getLeaderboard(sessionId),
            getSessionInfo(sessionId),
        ]);

        console.log(newDoc.stat);
        ws.send(JSON.stringify({
            type: "update_sessionx",
            data: {
                stat: newDoc.stat,
                activeQuestion: newDoc.activeQuestion,
                teams: newDoc.teams,
                maxNumnberTeam: newDoc.maxNumnberTeam,
                newDoc: {
                    usersession: usersessions,
                    session: newDoc,
                    questions: questions,
                    leaderboard: leaderboard,
                    sessionInfo: sessionInfo,
                }
            }
        }));
    } catch (error) {
        console.error("Error processing change:", error);
    }
});
 
  const changeStream1 = userAnswerModel.watch({ fullDocument: 'updateLookup', filter: {sessionid: sessionId,userid:userId } });

 
 
  changeStream1.on('change', async (change) => {
    console.log("Change in userAnswerModel session");
 
     const usersData = await userAnswerModel.find({
        sessionid: change.fullDocument.sessionid,
        questionid: change.fullDocument.questionid,
    });

    const userIds = usersData.map(user => user.userid);

    const userData = await userModel.find({ userid: { $in: userIds } });

 
    const mergedUserData = userData.map(user => {
        const answerData = usersData.find(u => u.userid === user.userid);
        return {
            ...user.toObject(), 
            answerNumber: answerData ? answerData.answerNumber : null,
            team: answerData ? answerData.team : null,
         };
    });
    let answer;
    for (let i = 0; i < usersData.length; i++) {
        if(usersData[i].userid==userId){
            answer=usersData[i].answerNumber
        }
    }
    
    console.log("this answer is",answer)
 
    ws.send(JSON.stringify({
        type: "update_answer",
        data: {
            activeQuestion: answer,
            usersData: mergedUserData
        },
    }));
});
 
      ws.on('close', () => {
        console.log(`User with ID ${userId} disconnected`);
      });
    });
    
    function broadcast(message, sender) {
      wss.clients.forEach((client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
    
    const port = 3050;
    server.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
    

  console.log(`Server is running on port ${PORT}`);
});
