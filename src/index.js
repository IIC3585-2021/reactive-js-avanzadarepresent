import { fromEvent, zip, interval } from "rxjs";
import { filter, map } from "rxjs/operators";

// consts of game

// movements
const DELTA_LATENCY_BALL = 20; // in ms
const DELTA_MOVEMENT_BALL = 5;
const DELTA_MOVEMENT_RACKET = 25;

// dimensions
const FIELD_WIDTH = 400;
const FIELD_HEIGHT = 800;

const RACKET_WIDTH = 120;
const RACKET_HEIGHT = 20;

const BALL_SIZE = 20;

const yRacketP1 = FIELD_HEIGHT - 2 * RACKET_HEIGHT;
const yRacketP2 = RACKET_HEIGHT;

const STATUSES = {
  STOPPED: "STOPPED",
  RUNNING: "RUNNING"
};

// game stuff
var pong = {
  status: STATUSES.STOPPED,
  pressedKeys: [],
  racketP1: {
    score: 0,
    speed: DELTA_MOVEMENT_RACKET,
    x: FIELD_WIDTH / 2 - RACKET_WIDTH / 2,
    // yMax is the upper most part of the racket
    yUpper: yRacketP1,
    yBottom: yRacketP1 + RACKET_HEIGHT,
    directionX: -1,
    size: RACKET_WIDTH
  },
  racketP2: {
    score: 0,
    speed: DELTA_MOVEMENT_RACKET,
    x: FIELD_WIDTH / 2 - RACKET_WIDTH / 2,
    directionX: -1,
    yUpper: yRacketP2,
    yBottom: yRacketP2 + RACKET_HEIGHT,
    size: RACKET_WIDTH
  },
  ball: {
    speed: DELTA_MOVEMENT_BALL,
    x: FIELD_WIDTH / 2 - BALL_SIZE / 2,
    y: FIELD_HEIGHT / 2 - BALL_SIZE / 2,
    directionX: -1,
    directionY: -1
  }
};

// subscribers
const keyDown = fromEvent(document, "keydown");
// html
var racketP1 = document.getElementById("racketP1");
var racketP2 = document.getElementById("racketP2");
var ballHTML = document.getElementById("ball");
var startMessage = document.getElementById("start-message");
var winPlayerMessage = document.getElementById("win-player");
var playgroundHTML = document.getElementById("playground");
var scoreP1 = document.getElementById("scoreP1");
var scoreP2 = document.getElementById("scoreP2");

var _interval = interval(DELTA_LATENCY_BALL);
var loop = _interval.pipe(filter(isRunning));
var newDirX = loop.pipe(
  map(function () {
    return moveBallDirX(playgroundHTML, pong.ball);
  })
);
var newDirY = loop.pipe(
  map(function () {
    return moveBallDirY(playgroundHTML, pong.ball);
  })
);
var newPosX = newDirX.pipe(
  map(function (dirX) {
    return moveBallPos(pong.ball, dirX);
  })
);
var newPosY = newDirY.pipe(
  map(function (dirY) {
    return moveBallPos(pong.ball, dirY);
  })
);
var newBallPos = zip(newDirX, newDirY, newPosX, newPosY, buildPosition);

var hitP1 = loop.pipe(
  filter(function () {
    return racketHit(racketP1, ballHTML, pong.ball, pong.racketP1);
  })
);

var hitP2 = loop.pipe(
  filter(function () {
    return racketHit(racketP2, ballHTML, pong.ball, pong.racketP2);
  })
);

var pointP1 = loop.pipe(
  filter(function () {
    return playerWonPoint(1, pong.ball);
  })
);

var pointP2 = loop.pipe(
  filter(function () {
    return playerWonPoint(2, pong.ball);
  })
);

newBallPos.subscribe(function (pos) {
  changeBallPosition(pong.ball, pos.directionX, pos.x, pos.directionY, pos.y);
  updateHTMLBall(ballHTML, pong.ball);
});

hitP1.subscribe(function (hit) {
  changeDirY(pong.ball);
});

hitP2.subscribe(function (hit) {
  changeDirY(pong.ball);
});

function resetPositions() {
  pong.status = STATUSES.STOPPED;
  startMessage.style.display = "block";
  pong.ball = {
    speed: DELTA_MOVEMENT_BALL,
    x: FIELD_WIDTH / 2 - BALL_SIZE / 2,
    y: FIELD_HEIGHT / 2 - BALL_SIZE / 2,
    directionX: -1,
    directionY: -1
  };
  pong.racketP1.x = FIELD_WIDTH / 2 - RACKET_WIDTH / 2;
  pong.racketP2.x = FIELD_WIDTH / 2 - RACKET_WIDTH / 2;
}

pointP1.subscribe(function (e) {
  changeScore(pong.racketP1);
  updateHTMLScore(scoreP1, pong.racketP1.score);
  updateWinPlayerHTML(1);
  resetPositions();
});

pointP2.subscribe(function (e) {
  changeScore(pong.racketP2);
  updateHTMLScore(scoreP2, pong.racketP2.score);
  updateWinPlayerHTML(2);
  resetPositions();
});

keyDown.subscribe(function (event) {
  if (pong.status === STATUSES.STOPPED) {
    pong.status = STATUSES.RUNNING;
    startMessage.style.display = "none";
    winPlayerMessage.style.display = "none";
  }
  switch (event.keyCode) {
    case 65:
      pong.racketP1.x = Math.max(pong.racketP1.x - DELTA_MOVEMENT_RACKET, 0);
      break;
    case 68:
      pong.racketP1.x = Math.min(
        pong.racketP1.x + DELTA_MOVEMENT_RACKET,
        FIELD_WIDTH - pong.racketP1.size
      );
      break;
    case 37:
      pong.racketP2.x = Math.max(pong.racketP2.x - DELTA_MOVEMENT_RACKET, 0);
      break;
    case 39:
      pong.racketP2.x = Math.min(
        pong.racketP2.x + DELTA_MOVEMENT_RACKET,
        FIELD_WIDTH - pong.racketP2.size
      );
      break;
    default:
      break;
  }
  drawRacket(racketP1, pong.racketP1.x);
  drawRacket(racketP2, pong.racketP2.x);
});

function drawRacket(racketHTML, pixelPos) {
  racketHTML.style.left = pixelPos + "px";
}

function nextPosition(currentPosition, speed, direction) {
  return currentPosition + speed * direction;
}

function moveBallDirX(playgroundHTML, ball) {
  var width = playgroundHTML.offsetWidth,
    directionX = ball.directionX;
  var positionX = nextPosition(ball.x, ball.speed, ball.directionX);
  if (positionX > width) {
    directionX = -1;
  }
  if (positionX < 0) {
    directionX = 1;
  }
  return directionX;
}

function moveBallDirY(playgroundHTML, ball) {
  var height = playgroundHTML.offsetHeight,
    directionY = ball.directionY;
  var positionY = nextPosition(ball.y, ball.speed, ball.directionY);

  if (positionY > height) {
    directionY = -1;
  }
  if (positionY < 0) {
    directionY = 1;
  }
  return directionY;
}

function moveBallPos(ball, direction) {
  return ball.speed * direction;
}

function changeBallPosition(ball, dirX, posX, dirY, posY) {
  ball.directionX = dirX;
  ball.directionY = dirY;
  ball.x += posX;
  ball.y += posY;
}

function updateHTMLBall(ballHTML, ball) {
  ballHTML.style.left = ball.x + "px";
  ballHTML.style.top = ball.y + "px";
}

function racketYPosFunction(racket, ballPosY) {
  var ballSize = ballHTML.offsetHeight;
  // p1 is the lower one
  if (racket.yUpper === yRacketP1) {
    return (
      ballPosY + ballSize > racket.yUpper &&
      ballPosY + ballSize < racket.yBottom
    );
  } else {
    return ballPosY < racket.yBottom && ballPosY > racket.yUpper;
  }
}

function racketHit(racketHTML, ballHTML, ball, racket) {
  var racketBorderLeft = parseInt(racketHTML.style.left, 10);
  var racketBorderRight = racketBorderLeft + pong.racketP1.size;
  var posX = nextPosition(ball.x, ball.speed, ball.directionX);
  var posY = nextPosition(ball.y, ball.speed, ball.directionY);
  return (
    posX >= racketBorderLeft &&
    posX <= racketBorderRight &&
    racketYPosFunction(racket, posY)
  );
}

function playerWonPoint(player, ball) {
  if (player === 1) {
    return ball.y <= 0;
  } else {
    return ball.y >= FIELD_HEIGHT;
  }
}

function updateWinPlayerHTML(playerNumber) {
  winPlayerMessage.style.display = "block";
  winPlayerMessage.innerHTML = `Ganó un punto el jugador ${playerNumber}`;
}

function changeScore(player) {
  player.score++;
}

function updateHTMLScore(scoreHTML, score) {
  scoreHTML.innerHTML = score;
}

function changeDirY(ball) {
  // inverts the direction of the ball
  ball.directionY *= -1;
}

function isRunning() {
  return pong.status === STATUSES.RUNNING;
}

function buildPosition(dirX, dirY, x, y) {
  return { directionX: dirX, directionY: dirY, x: x, y: y };
}
