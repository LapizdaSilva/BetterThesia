const PX_PER_MS = 0.15;
let START_MIDI = 36;
let KEY_COUNT = 61;
let KEYS = [];
const particles = [];

function buildKeyboard(size) {
  KEYS = [];
  if (size === 61) { START_MIDI = 36; KEY_COUNT = 61; } // Começa no Dó 2
  else if (size === 76) { START_MIDI = 28; KEY_COUNT = 76; } // Começa no Mi 1
  else if (size === 88) { START_MIDI = 21; KEY_COUNT = 88; } // Começa no Lá 0 (Piano Real)

  for (let i = 0; i < KEY_COUNT; i++) {
    const midi = START_MIDI + i;
    const black = [1, 3, 6, 8, 10].includes(midi % 12);
    KEYS.push({ midi, black, active: false });
  }
}

buildKeyboard(61);

function highlightKey(midi, state) {
  const key = KEYS.find((k) => k.midi === midi);
  if (!key) return;
  if (key.active === state) return;
  key.active = state;
}

function getKeyByMidi(midi) {
  return KEYS.find((k) => k.midi === midi);
}

function getKeyAtPosition(x, y) {
  for (const key of KEYS.filter((k) => k.black)) {
    if (x >= key.x && x <= key.x + key.w && y <= keyboardCtx.canvas.height * 0.6) return key;
  }
  for (const key of KEYS.filter((k) => !k.black)) {
    if (x >= key.x && x <= key.x + key.w) return key;
  }
  return null;
}

function drawNotes() {
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  for (const note of songNotes) {
    const key = getKeyByMidi(note.midi);
    if (!key) continue;

    const bottomY = canvas.height - (note.start - timeline.currentTime) * PX_PER_MS;
    const height = (note.end - note.start) * PX_PER_MS;
    const topY = bottomY - height;

    if (bottomY < 0 || topY > canvas.height) continue;

    ctx2d.fillStyle = note.hand === "left" ? "#ff8888" : "#88ff88";
    ctx2d.fillRect(key.x, topY, key.w, height);
  }
}

function createParticles(x, color) {
  for (let i = 0; i < 13; i++) {
    particles.push({
      x: x, y: 0,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * -5 - 2,
      life: 1.5, color: color
    });
  }
}

function drawParticles(ctx) {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life -= 0.04;
    
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawKeyboard(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const whiteKeyCount = KEYS.filter((k) => !k.black).length;
  const whiteWidth = ctx.canvas.width / whiteKeyCount;
  const whiteHeight = ctx.canvas.height;
  const blackWidth = whiteWidth * 0.6;
  const blackHeight = ctx.canvas.height * 0.6;

  let whiteIndex = 0;

  for (const key of KEYS) {
    const mod = key.midi % 12;
    if (!key.black) {
      key.x = whiteIndex * whiteWidth;
      key.w = whiteWidth;
      whiteIndex++;
    } else {
      const blackOffsets = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };
      const octave = Math.floor((key.midi - START_MIDI) / 12);
      const offset = (octave * 7 + blackOffsets[mod]) * whiteWidth;
      key.x = offset - blackWidth / 2;
      key.w = blackWidth;
    }
  }

  for (const key of KEYS) {
    if (key.black) continue;
    ctx.fillStyle = key.active ? "#7fb1b1" : "#eeeeee";
    ctx.fillRect(key.x, 0, key.w, whiteHeight);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(key.x, 0, key.w, whiteHeight);
  }

  for (const key of KEYS) {
    if (!key.black) continue;
    ctx.fillStyle = key.active ? "#00cccc" : "#111111";
    ctx.fillRect(key.x, 0, key.w, blackHeight);
  }

  if (waitingForUser) {
    for (const midi of expectedNotes) {
      const key = getKeyByMidi(midi);
      if (!key) continue;

      ctx.beginPath();
      const radius = key.black ? key.w * 0.25 : key.w * 0.2; 
      const centerX = key.x + key.w / 2;
      const centerY = key.black ? blackHeight - radius - 10 : whiteHeight - radius - 15;
      
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#ff3366"; ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
    }
  }
}

function resizeCanvases() {
  const topbar = document.getElementById("topbar");
  const topbarHeight = topbar ? topbar.offsetHeight : 0;
  
  const screenWidth = window.innerWidth;
  canvas.width = screenWidth;
  keyboardCanvas.width = screenWidth;
    
  const keyboardHeight = 150; 
  keyboardCanvas.height = keyboardHeight;
  
  canvas.height = window.innerHeight - topbarHeight - keyboardHeight;
}

buildKeyboard(61);