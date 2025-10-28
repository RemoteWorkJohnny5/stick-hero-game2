// === GAME STATE ===
let phase = "waiting";
let lastTimestamp;
let heroX, heroY, sceneOffset;
let platforms = [], sticks = [];
let score = 0;

// === CONFIG ===
const canvasWidth = 375;
const canvasHeight = 375;
const platformHeight = 100;
const stretchingSpeed = 4;
const turningSpeed = 4;
const walkingSpeed = 4;
const transitioningSpeed = 2;
const fallingSpeed = 2;

// === ELEMENTS ===
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const restartButton = document.getElementById("restart");
const soundToggle = document.getElementById("sound-toggle");

// === SOUND SYSTEM ===
let soundEnabled = true;
const sounds = {};

function loadSound(name, src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  sounds[name] = audio;
}

function playSound(name) {
  if (!soundEnabled) return;
  const sound = sounds[name];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
}

// Load all sounds
loadSound("stretch", "stretch.mp3");
loadSound("drop", "drop.mp3");
loadSound("walk", "walk.mp3");
loadSound("fall", "fall.mp3");

// Sound toggle
soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? "Sound On" : "Sound Off";
  soundToggle.classList.toggle("muted", !soundEnabled);
});

// === START GAME ===
resetGame();

function resetGame() {
  phase = "waiting";
  lastTimestamp = undefined;
  platforms = [{ x: 50, w: 50 }];
  generatePlatform(); generatePlatform(); generatePlatform(); generatePlatform();
  heroX = platforms[0].x + platforms[0].w - 30;
  heroY = 0;
  sceneOffset = 0;
  sticks = [{ x: platforms[0].x + platforms[0].w, length: 0, rotation: 0 }];
  score = 0;
  restartButton.style.display = "none";
  scoreElement.innerText = score;
  draw();
}

// === DRAW ===
function draw() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.save();
  ctx.translate(-sceneOffset, 0);
  drawPlatforms();
  drawHero();
  drawSticks();
  ctx.restore();
}

function drawPlatforms() {
  platforms.forEach(p => {
    ctx.fillStyle = "#000";
    ctx.fillRect(p.x, canvasHeight - platformHeight, p.w, platformHeight + 10);
    ctx.fillStyle = "#222";
    ctx.fillRect(p.x, canvasHeight - platformHeight + 10, p.w, 5);
  });
}

function drawHero() {
  const w = 20, h = 30;
  ctx.fillStyle = "#e74c3c";
  ctx.fillRect(heroX, heroY + canvasHeight - platformHeight - h, w, h);
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(heroX + 5, heroY + canvasHeight - platformHeight - h - 8, 10, 8);
}

function drawSticks() {
  sticks.forEach(s => {
    ctx.save();
    ctx.translate(s.x, canvasHeight - platformHeight);
    ctx.rotate((Math.PI / 180) * s.rotation);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -s.length);
    ctx.stroke();
    ctx.restore();
  });
}

// === INPUT ===
canvas.addEventListener("mousedown", () => { if (phase === "waiting") startStretch(); });
canvas.addEventListener("mouseup", () => { if (phase === "stretching") { phase = "turning"; playSound("drop"); } });
canvas.addEventListener("touchstart", e => { e.preventDefault(); if (phase === "waiting") startStretch(); });
canvas.addEventListener("touchend", e => { e.preventDefault(); if (phase === "stretching") { phase = "turning"; playSound("drop"); } });

function startStretch() {
  phase = "stretching";
  lastTimestamp = undefined;
  playSound("stretch");
  requestAnimationFrame(animate);
}

restartButton.addEventListener("click", resetGame);

// === ANIMATION LOOP ===
let wasWalking = false;

function animate(timestamp) {
  if (!lastTimestamp) { lastTimestamp = timestamp; requestAnimationFrame(animate); return; }
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  switch (phase) {
    case "stretching":
      sticks[sticks.length - 1].length += delta / stretchingSpeed;
      break;

    case "turning":
      sticks[sticks.length - 1].rotation += delta / turningSpeed;
      if (sticks[sticks.length - 1].rotation >= 90) {
        sticks[sticks.length - 1].rotation = 90;
        const hit = thePlatformTheStickHits();
        if (hit) { score++; scoreElement.innerText = score; generatePlatform(); }
        phase = "walking";
      }
      break;

    case "walking":
      heroX += delta / walkingSpeed;
      if (!wasWalking) {
        playSound("walk");
        wasWalking = true;
      }
      const hitWalk = thePlatformTheStickHits();
      if (hitWalk) {
        const maxX = hitWalk.x + hitWalk.w - 30;
        if (heroX > maxX) { heroX = maxX; phase = "transitioning"; wasWalking = false; }
      } else {
        const maxX = sticks[sticks.length - 1].x + sticks[sticks.length - 1].length;
        if (heroX > maxX) { heroX = maxX; phase = "falling"; wasWalking = false; }
      }
      break;

    case "transitioning":
      sceneOffset += delta / transitioningSpeed;
      const next = thePlatformTheStickHits();
      if (next && next.x + next.w - sceneOffset < 100) {
        sticks.push({ x: next.x + next.w, length: 0, rotation: 0 });
        phase = "waiting";
      }
      break;

    case "falling":
      heroY += delta / fallingSpeed;
      playSound("fall");
      if (sticks[sticks.length - 1].rotation < 180)
        sticks[sticks.length - 1].rotation += delta / turningSpeed;
      if (heroY > platformHeight + 100) {
        restartButton.style.display = "block";
        return;
      }
      break;
  }

  draw();
  if (phase !== "waiting") requestAnimationFrame(animate);
}

// === UTILS ===
function generatePlatform() {
  const last = platforms[platforms.length - 1];
  const minGap = 40, maxGap = 200;
  const minW = 20, maxW = 100;
  const x = last.x + last.w + minGap + Math.random() * (maxGap - minGap);
  const w = minW + Math.random() * (maxW - minW);
  platforms.push({ x, w });
}

function thePlatformTheStickHits() {
  const stick = sticks[sticks.length - 1];
  const farX = stick.x + stick.length;
  return platforms.find(p => p.x < farX && farX < p.x + p.w);
}
