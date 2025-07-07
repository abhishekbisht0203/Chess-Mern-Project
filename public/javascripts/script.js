const socket = io();
const chess = new Chess();

const boardElement = document.querySelector('.chessboard');
const statusEl = document.getElementById("status");
const winnerEl = document.getElementById("winner");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let legalMoves = [];

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const updateStatus = () => {
  if (chess.game_over()) {
    if (chess.in_checkmate()) {
      const winner = chess.turn() === 'w' ? 'Black' : 'White';
      winnerEl.textContent = `Checkmate! ${winner} wins`;
      winnerEl.classList.remove('hidden');
      statusEl.textContent = '';
    } else if (chess.in_draw()) {
      winnerEl.textContent = "Draw!";
      winnerEl.classList.remove('hidden');
      statusEl.textContent = '';
    }
  } else {
    const turnColor = chess.turn() === 'w' ? 'White' : 'Black';
    statusEl.textContent = `Turn: ${turnColor}`;
    winnerEl.classList.add('hidden');

    if (chess.in_check()) {
      statusEl.textContent += ' (Check)';
    }
  }
};

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = '';

  const rows = playerRole === 'b' ? [...board].reverse() : board;

  rows.forEach((row, rowIndex) => {
    const currentRowIndex = playerRole === 'b' ? 7 - rowIndex : rowIndex;
    const cols = playerRole === 'b' ? [...row].reverse() : row;

    cols.forEach((square, colIndex) => {
      const currentColIndex = playerRole === 'b' ? 7 - colIndex : colIndex;
      const squareName = files[currentColIndex] + (8 - currentRowIndex);

      const squareEl = document.createElement('div');
      squareEl.classList.add('square', (currentRowIndex + currentColIndex) % 2 === 0 ? 'light' : 'dark');
      squareEl.dataset.row = currentRowIndex;
      squareEl.dataset.col = currentColIndex;

      if (legalMoves.some(m => m.to === squareName)) {
        const dot = document.createElement('div');
        dot.classList.add('move-dot');
        squareEl.appendChild(dot);
      }

      if (square) {
        const pieceEl = document.createElement('div');
        pieceEl.classList.add('piece', square.color === 'w' ? 'white' : 'black');
        pieceEl.innerText = getPieceUnicode(square);

        const isPlayersTurn = chess.turn() === playerRole;
        const isPlayersPiece = playerRole === square.color;
        pieceEl.draggable = isPlayersPiece && isPlayersTurn;

        pieceEl.addEventListener('mousedown', () => {
          if (pieceEl.draggable) {
            sourceSquare = { row: currentRowIndex, col: currentColIndex };
            const fromSquare = files[currentColIndex] + (8 - currentRowIndex);
            legalMoves = chess.moves({ square: fromSquare, verbose: true });
            renderBoard();
          }
        });

        pieceEl.addEventListener('dragstart', (e) => {
          if (pieceEl.draggable) {
            draggedPiece = pieceEl;
            sourceSquare = { row: currentRowIndex, col: currentColIndex };
            e.dataTransfer.setData('text/plain', `${currentRowIndex}-${currentColIndex}`);
          }
        });

        pieceEl.addEventListener('dragend', () => {
          draggedPiece = null;
          sourceSquare = null;
          legalMoves = [];
          renderBoard();
        });

        squareEl.appendChild(pieceEl);
      }

      squareEl.addEventListener('dragover', e => e.preventDefault());
      squareEl.addEventListener('drop', e => {
        e.preventDefault();
        if (draggedPiece && sourceSquare) {
          const target = {
            row: parseInt(squareEl.dataset.row),
            col: parseInt(squareEl.dataset.col)
          };
          handleMove(sourceSquare, target);
        }
      });

      boardElement.appendChild(squareEl);
    });
  });

  updateStatus();
};

const handleMove = (from, to) => {
  const fromSquare = files[from.col] + (8 - from.row);
  const toSquare = files[to.col] + (8 - to.row);

  const move = { from: fromSquare, to: toSquare, promotion: 'q' };
  legalMoves = [];
  socket.emit('move', move);
};

const getPieceUnicode = (piece) => {
  const unicodeMap = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
  };
  const code = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
  return unicodeMap[code] || '';
};

socket.on('playerRole', role => {
  playerRole = role;
  renderBoard();
});

socket.on('spectorRole', () => {
  playerRole = null;
  alert("You're a spectator. The board will update in real time.");
  renderBoard();
});

socket.on('move', move => {
  chess.move(move);
  legalMoves = [];
  renderBoard();
});

socket.on('boardState', fen => {
  chess.load(fen);
  legalMoves = [];
  renderBoard();
});

socket.on('invalidMove', move => {
  alert("Invalid move: " + JSON.stringify(move));
});

renderBoard();
