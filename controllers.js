class Player {
    constructor(id, name, team) {
      this.id = id;
      this.name = name;
      this.team = team;
      this.buzzedIn = false;
    }
  
    buzzIn() {
      this.buzzedIn = true;
    }
  
    resetBuzz() {
      this.buzzedIn = false;
    }
  }
  
 
  class Team {
    constructor(name) {
      this.name = name;
      this.players = [];
    }
  
    addPlayer(player) {
      this.players.push(player);
    }
  }
  
 
  class Game {
    constructor(id) {
      this.id = id;
      this.teams = [];
      this.buzzOrder = [];
      this.currentQuestion = null;
    }
  
    addTeam(team) {
      this.teams.push(team);
    }
  
    startQuestion(question) {
      this.currentQuestion = question;
    }
  

    
    endQuestion() {
      this.currentQuestion = null;
 
      this.teams.forEach((team) => {
        team.players.forEach((player) => {
          player.resetBuzz();
        });
      });
    }
  
    handleBuzz(player) {
      player.buzzIn();
      this.buzzOrder.push({ team: player.team, playerName: player.name, timestamp: Date.now() });
    }
  }
class Session{
    constructor(id,createdby,title){
        this.id = id
        this.createdby = createdby
        this.title = title
        this.games = []
    }
    addGame(game){
        this.games.push(game)
    }
}

module.exports = {
    Game,
    Team,
    Player,
    Session
}
 
  