const socket = io();
const chess = new Chess();

const boardElement = document.querySelector(".chessboard");
const statusEl = document.getElementById("status");
const winnerEl = document.getElementById("winner");
const turnTextEl = document.getElementById("turn-text");
const moveNumberEl = document.getElementById("move-number");
const moveHistoryEl = document.getElementById("move-history");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let legalMoves = [];
const moveHistory = [];
const capturedPieces = { white: [], black: [] };

// Timer variables
let whiteTime = 600; // 10 minutes in seconds
let blackTime = 600;
let timerInterval = null;

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (chess.game_over()) {
      clearInterval(timerInterval);
      return;
    }

    if (chess.turn() === "w") {
      whiteTime--;
      updateTimerDisplay("white", whiteTime);
      setActiveTimer("white");
    } else {
      blackTime--;
      updateTimerDisplay("black", blackTime);
      setActiveTimer("black");
    }

    if (whiteTime <= 0) {
      endGameByTime("Black");
    } else if (blackTime <= 0) {
      endGameByTime("White");
    }
  }, 1000);
};

const updateTimerDisplay = (color, time) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const timerEl = document.getElementById(`${color}-timer`);
  timerEl.innerHTML = `<i class="fas fa-clock mr-1"></i>${timeString}`;

  timerEl.classList.remove("warning", "danger");
  if (time <= 30) {
    timerEl.classList.add("danger");
  } else if (time <= 120) {
    timerEl.classList.add("warning");
  }
};

const setActiveTimer = (activeColor) => {
  const whiteTimer = document.getElementById("white-timer");
  const blackTimer = document.getElementById("black-timer");

  whiteTimer.classList.remove("active");
  blackTimer.classList.remove("active");

  if (activeColor === "white") {
    whiteTimer.classList.add("active");
  } else {
    blackTimer.classList.add("active");
  }
};

const endGameByTime = (winner) => {
  clearInterval(timerInterval);
  winnerEl.textContent = `${winner} wins on time!`;
  winnerEl.classList.remove("hidden");
  statusEl.style.display = "none";
};

updateTimerDisplay("white", whiteTime);
updateTimerDisplay("black", blackTime);
setActiveTimer("white");

const updateStatus = () => {
  if (chess.game_over()) {
    clearInterval(timerInterval);
    if (chess.in_checkmate()) {
      const winner = chess.turn() === "w" ? "Black" : "White";
      winnerEl.textContent = `Checkmate! ${winner} wins`;
      winnerEl.classList.remove("hidden");
      statusEl.style.display = "none";
    } else if (chess.in_draw()) {
      winnerEl.textContent = "Draw!";
      winnerEl.classList.remove("hidden");
      statusEl.style.display = "none";
    }
  } else {
    const turnColor = chess.turn() === "w" ? "White" : "Black";
    statusEl.textContent = `Turn: ${turnColor}`;
    turnTextEl.textContent = `${turnColor} to move`;
    winnerEl.classList.add("hidden");

    if (chess.in_check()) {
      statusEl.textContent += " (Check)";
      turnTextEl.textContent += " (Check)";
    }

    const fullMoves = Math.ceil(chess.history().length / 2);
    moveNumberEl.textContent = fullMoves || 1;
  }
};

const addToMoveHistory = (move) => {
  moveHistory.push(move);

  if (moveHistory.length === 1) {
    moveHistoryEl.innerHTML = "";
  }

  const moveNumber = Math.ceil(moveHistory.length / 2);
  const isWhiteMove = move.color === "w";

  if (isWhiteMove) {
    const moveItem = document.createElement("div");
    moveItem.className = "move-item";
    moveItem.innerHTML = `
            <span class="text-gray-400">${moveNumber}.</span>
            <span class="text-white">${move.san}</span>
            <span class="text-gray-500">...</span>
        `;
    moveHistoryEl.appendChild(moveItem);
  } else {
    const lastItem = moveHistoryEl.lastElementChild;
    if (lastItem) {
      lastItem.innerHTML = `
                <span class="text-gray-400">${moveNumber}.</span>
                <span class="text-white">${lastItem.querySelector(".text-white").textContent}</span>
                <span class="text-white">${move.san}</span>
            `;
    }
  }

  moveHistoryEl.scrollTop = moveHistoryEl.scrollHeight;
};

const addCapturedPiece = (piece, color) => {
  const capturedContainer = document.getElementById(
    `captured-${color === "w" ? "white" : "black"}`
  );
  const pieceElement = document.createElement("span");
  pieceElement.className = "captured-piece";
  pieceElement.textContent = getPieceUnicode({ type: piece, color: color });
  capturedContainer.appendChild(pieceElement);
};

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  document.querySelectorAll(".square").forEach((sq) => {
    sq.classList.remove("selected", "legal-move");
  });

  const rows = playerRole === "b" ? [...board].reverse() : board;

  rows.forEach((row, rowIndex) => {
    const currentRowIndex = playerRole === "b" ? 7 - rowIndex : rowIndex;
    const cols = playerRole === "b" ? [...row].reverse() : row;

    cols.forEach((square, colIndex) => {
      const currentColIndex = playerRole === "b" ? 7 - colIndex : colIndex;
      const squareName = files[currentColIndex] + (8 - currentRowIndex);
      const squareEl = document.createElement("div");

      squareEl.classList.add(
        "square",
        (currentRowIndex + currentColIndex) % 2 === 0 ? "light" : "dark"
      );
      squareEl.dataset.row = currentRowIndex;
      squareEl.dataset.col = currentColIndex;
      squareEl.dataset.square = squareName;

      // Highlight selected square
      if (
        sourceSquare &&
        sourceSquare.row === currentRowIndex &&
        sourceSquare.col === currentColIndex
      ) {
        squareEl.classList.add("selected");
      }

      // Add move dots for legal moves
      if (legalMoves.some((m) => m.to === squareName)) {
        squareEl.classList.add("legal-move");
      }

      // Place pieces
      if (square) {
        const pieceEl = document.createElement("div");
        pieceEl.classList.add("piece", square.color === "w" ? "white" : "black");
        pieceEl.innerText = getPieceUnicode(square);

        const isPlayersTurn = chess.turn() === playerRole;
        const isPlayersPiece = playerRole === square.color;

        pieceEl.addEventListener("click", (e) => {
          e.stopPropagation();
          const clickedSquare = {
            row: currentRowIndex,
            col: currentColIndex,
          };

          if (sourceSquare) {
            // Attempt move
            handleMove(sourceSquare, clickedSquare);
          } else if (isPlayersPiece && isPlayersTurn) {
            // Select piece
            sourceSquare = clickedSquare;
            legalMoves = chess.moves({ square: squareName, verbose: true });
            renderBoard();
          }
        });

        squareEl.appendChild(pieceEl);
      } else {
        squareEl.addEventListener("click", () => {
          if (sourceSquare) {
            handleMove(sourceSquare, {
              row: currentRowIndex,
              col: currentColIndex,
            });
          }
        });
      }

      boardElement.appendChild(squareEl);
    });
  });

  updateStatus();
};

const handleMove = (from, to) => {
  const fromSquare = files[from.col] + (8 - from.row);
  const toSquare = files[to.col] + (8 - to.row);

  const movingPiece = chess.get(fromSquare);
  const isPromotion =
    movingPiece?.type === "p" && (toSquare.endsWith("8") || toSquare.endsWith("1"));

  const move = {
    from: fromSquare,
    to: toSquare,
    ...(isPromotion && { promotion: "q" }),
  };

  const legalMove = chess
    .moves({ verbose: true })
    .find((m) => m.from === fromSquare && m.to === toSquare);

  if (legalMove) {
    if (legalMove.captured) {
      addCapturedPiece(
        legalMove.captured,
        legalMove.color === "w" ? "b" : "w"
      );
    }

    const result = chess.move(move);
    if (result) {
      addToMoveHistory(result);
      socket.emit("move", move);
      if (!chess.game_over()) {
        startTimer();
      }
    }
  }

  sourceSquare = null;
  legalMoves = [];
  renderBoard();
};

const getPieceUnicode = (piece) => {
  const unicodeMap = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };
  const code =
    piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
  return unicodeMap[code] || "";
};

const requestUndo = () => {
  socket.emit("requestUndo");
  showNotification("Undo request sent", "info");
};

const offerDraw = () => {
  socket.emit("offerDraw");
  showNotification("Draw offer sent", "info");
};

const resignGame = () => {
  if (confirm("Are you sure you want to resign?")) {
    socket.emit("resign");
    showNotification("Game resigned", "error");
  }
};

const showNotification = (message, type) => {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
    type === "error"
      ? "bg-red-600"
      : type === "success"
      ? "bg-green-600"
      : "bg-blue-600"
  }`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
};

socket.on("playerRole", (role) => {
  playerRole = role;
  renderBoard();
  startTimer();
});

socket.on("spectatorRole", () => {
  playerRole = null;
  showNotification("You're a spectator. The board will update in real time.", "info");
  renderBoard();
});

socket.on("move", (move) => {
  const result = chess.move(move);
  if (result) {
    addToMoveHistory(result);
    if (result.captured) {
      addCapturedPiece(
        result.captured,
        result.color === "w" ? "b" : "w"
      );
    }
  }
  legalMoves = [];
  sourceSquare = null;
  renderBoard();
  if (!chess.game_over()) {
    startTimer();
  }
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  legalMoves = [];
  sourceSquare = null;
  renderBoard();
});

socket.on("invalidMove", (move) => {
  showNotification("Invalid move: " + JSON.stringify(move), "error");
});

socket.on("gameEnd", (data) => {
  clearInterval(timerInterval);
  winnerEl.textContent = data.reason;
  winnerEl.classList.remove("hidden");
  statusEl.style.display = "none";
});

renderBoard();
