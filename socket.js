const WebSocket = require('ws');
const http = require('http');

class snapSocket {
  constructor() {
    this.server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('WebSocket server\n');
    });

    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  handleConnection(ws) {
    console.log('Client connected');

    ws.send('Welcome to the WebSocket server!');

    ws.on('message', (message) => {
      console.log(`Received message: ${message}`);
      this.broadcast(message, ws);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  }

  broadcast(message, sender) {
    this.wss.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  start(port) {
    this.server.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  }
}

module.exports = snapSocket;