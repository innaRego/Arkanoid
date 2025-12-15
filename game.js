const KEYS = {
  LEFT: 37,
  RIGHT: 39,
  SPACE: 32
};

let game = {
  running: true,
  ctx: null,
  platform: null,
  ball: null,
  blocks: [],
  score: 0,
  rows: 4,
  cols: 8,
  width: 640,
  height: 360,
  sprites: {
    background: null,
    ball: null,
    platform: null,
    block: null
  },
  sounds: {
    bump: null
  },

  // исправлено: init() без двоеточия
  init() {
    this.ctx = document.getElementById("mycanvas").getContext("2d");
    this.setEvents();
  },

  setEvents() {
    window.addEventListener("keydown", e => {
      if (e.keyCode === KEYS.SPACE) {
        this.platform.fire();
      } else if (e.keyCode === KEYS.LEFT || e.keyCode === KEYS.RIGHT) {
        this.platform.start(e.keyCode);
      }
    });
    window.addEventListener("keyup", () => {
      this.platform.stop();
    });
  },

  preload(callback) {
    let loaded = 0;
    let required = Object.keys(this.sprites).length;
    required += Object.keys(this.sounds).length;

    let onResourceLoad = () => {
      ++loaded;
      if (loaded >= required) {
        callback();
      }
    };

    this.preloadSprites(onResourceLoad);
    this.preloadAudio(onResourceLoad);
  },

  preloadSprites(onResourceLoad) {
    for (let key in this.sprites) {
      this.sprites[key] = new Image();
      this.sprites[key].src = "img/" + key + ".png";
      this.sprites[key].addEventListener("load", onResourceLoad);
    }
  },

  preloadAudio(onResourceLoad) {
    for (let key in this.sounds) {
      // корректная работа со звуком
      this.sounds[key] = new Audio("sounds/" + key + ".mp3");
      this.sounds[key].addEventListener("canplaythrough", onResourceLoad, { once: true });
      // принудительно инициируем загрузку
      this.sounds[key].load();
    }
  },

  create() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.blocks.push({
          active: true,
          width: 60,
          height: 20,
          x: 64 * col + 65,
          y: 24 * row + 35
        });
      }
    }

    // создаём платформу и шар отдельно после блоков
    this.platform = {
      velocity: 6,
      dx: 0,
      x: 280,
      y: 300,
      width: 100,
      height: 14,
      ball: this.ball,
      fire: function() {
        if (this.ball) {
          this.ball.start();
          this.ball = null;
        }
      },
      start: function(direction) {
        if (direction === KEYS.LEFT) {
          this.dx = -this.velocity;
        } else if (direction === KEYS.RIGHT) {
          this.dx = this.velocity;
        }
      },
      stop: function() {
        this.dx = 0;
      },
      move: function() {
        if (this.dx) {
          this.x += this.dx;
          if (this.ball) {
            this.ball.x += this.dx;
          }
        }
      },
      getTouchOffset: function(x) {
        let diff = (this.x + this.width) - x;
        let offset = this.width - diff;
        let result = 2 * offset / this.width;
        return (result - 1);
      },
      collideWorldBounds: function() {
        let x = this.x + this.dx;
        let platformLeft = x;
        let platformRight = platformLeft + this.width;
        let worldLeft = 0;
        let worldRight = game.width;

        if (platformLeft < worldLeft || platformRight > worldRight) {
          this.dx = 0;
        }
      }
    };

    // шар
    this.ball = {
      dx: 0,
      dy: 0,
      velocity: 3,
      x: 320,
      y: 280,
      width: 20,
      height: 20,
      start: () => {
        this.ball.dy = -this.ball.velocity;
        this.ball.dx = game.random(-this.ball.velocity, this.ball.velocity);
      },
      move: () => {
        if (this.ball.dy) {
          this.ball.y += this.ball.dy;
        }
        if (this.ball.dx) {
          this.ball.x += this.ball.dx;
        }
      },
      collide: (element) => {
        let x = this.ball.x + this.ball.dx;
        let y = this.ball.y + this.ball.dy;

        if (x + this.ball.width > element.x &&
            x < element.x + element.width &&
            y + this.ball.height > element.y &&
            y < element.y + element.height) {
          return true;
        }
        return false;
      },
      collideWorldBounds: () => {
        let x = this.ball.x + this.ball.dx;
        let y = this.ball.y + this.ball.dy;

        let ballLeft = x;
        let ballRight = ballLeft + this.ball.width;
        let ballTop = y;
        let ballBottom = ballTop + this.ball.height;

        let worldLeft = 0;
        let worldRight = game.width;
        let worldTop = 0;
        let worldBottom = game.height;

        if (ballLeft < worldLeft) {
          this.ball.x = 0;
          this.ball.dx = this.ball.velocity;
          game.sounds.bump.play();
        } else if (ballRight > worldRight) {
          this.ball.x = worldRight - this.ball.width;
          this.ball.dx = -this.ball.velocity;
          game.sounds.bump.play();
        } else if (ballTop < worldTop) {
          this.ball.y = 0;
          this.ball.dy = this.ball.velocity;
          game.sounds.bump.play();
        } else if (ballBottom > worldBottom) {
          game.end("Вы проиграли");
        }
      },
      bumpBlock: (block) => {
        this.ball.dy *= -1;
        block.active = false;
      },
      bumpPlatform: (platform) => {
        if (platform.dx) {
          this.ball.x += platform.dx;
        }

        if (this.ball.dy > 0) {
          this.ball.dy = -this.ball.velocity;
          let touchX = this.ball.x + this.ball.width / 2;
          this.ball.dx = this.ball.velocity * platform.getTouchOffset(touchX);
        }
      }
    };

    // Привязка ball к платформе, чтобы платформа держала шар до старта
    this.platform.ball = this.ball;
  },

  update() {
    this.collideBlocks();
    this.collidePlatform();
    this.ball.collideWorldBounds();
    this.platform.collideWorldBounds();
    this.platform.move();
    this.ball.move();
  },

  addScore() {
    ++this.score;

    if (this.score >= this.blocks.length) {
      this.end("Вы победили");
    }
  },

  collideBlocks() {
    for (let block of this.blocks) {
      if (block.active && this.ball.collide(block)) {
        this.ball.bumpBlock(block);
        this.addScore();
        this.sounds.bump.play();
      }
    }
  },

  collidePlatform() {
    if (this.ball.collide(this.platform)) {
      this.ball.bumpPlatform(this.platform);
      this.sounds.bump.play();
    }
  },

  run() {
    if (this.running) {
      window.requestAnimationFrame(() => {
        this.update();
        this.render();
        this.run();
      });
    }
  },

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.sprites.background, 0, 0);
    this.ctx.drawImage(this.sprites.ball, 0, 0, this.ball.width, this.ball.height, this.ball.x, this.ball.y, this.ball.width, this.ball.height);
    this.ctx.drawImage(this.sprites.platform, this.platform.x, this.platform.y);
    this.renderBlocks();
  },

  renderBlocks() {
    for (let block of this.blocks) {
      if (block.active) {
        this.ctx.drawImage(this.sprites.block, block.x, block.y);
      }
    }
  },

  start() {
    this.init();
    this.preload(() => {
      this.create();
      this.run();
    });
  },

  end(message) {
    this.running = false;
    alert(message);
    window.location.reload();
  },

  random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
};

// Привязка ball и платформы после загрузки ресурсов будет работать через start().
// Но чтобы начать, вызываем game.start() на загрузке страницы.
window.addEventListener("load", () => {
  game.start();
});
