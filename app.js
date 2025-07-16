const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.render('chess', { title: 'Chess Game' });
});

io.on('connection', function (uniquesocket) {
  console.log('A user Connected');

  // Assign player roles
  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
  } else {
    uniquesocket.emit("spectatorRole");
  }

  // Handle disconnects
  uniquesocket.on("disconnect", function () {
    console.log('A user Disconnected');
    if (uniquesocket.id === players.white) {
      delete players.white;
    } else if (uniquesocket.id === players.black) {
      delete players.black;
    }
  });

  // Handle incoming moves
  uniquesocket.on("move", function (move) {
    try {
      if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
      if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

      // Filter out invalid promotions
      if (move.promotion && !(move.from[1] === "7" && move.to[1] === "8") && !(move.from[1] === "2" && move.to[1] === "1")) {
        delete move.promotion;
      }

      const result = chess.move(move);
      if (result) {
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        console.log("Invalid Move:", move);
        uniquesocket.emit("invalidMove", move);
      }
    } catch (err) {
      console.log("Move error:", err);
      uniquesocket.emit("invalidMove", move);
    }
  });
});



server.listen(3000, function () {
  console.log('Server is running on port 3000');
});
