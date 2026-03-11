let loopRunning = false;

let isSustainDown = false;
const keysPhysicallyPressed = new Set();

const keysAlreadyUsed = new Set()

const progressBar = document.getElementById("progressBar");
let songDuration = 0;
let isDraggingProgress = false;

let practiceMode = "both";
// "left" | "right" | "both"

let pianoInstrument = null;
let pianoLoading = false;

const songNotes = [
  // mão esquerda
  { midi: 48, start: 0, end: 1200, hand: "left" },
  { midi: 52, start: 0, end: 1200, hand: "left" },
  { midi: 55, start: 0, end: 1200, hand: "left" },

  // mão direita
  { midi: 60, start: 0, end: 400, hand: "right" },
  { midi: 62, start: 500, end: 900, hand: "right" },
  { midi: 64, start: 1000, end: 1400, hand: "right" },
];

let waitingForUser = false;
let expectedNotes = new Set();

const timeline = {
  currentTime: 0,
  playing: false,
  last: 0,
};

const midiEvents = [];
const activeNotes = new Map();

const playPauseBtn = document.getElementById("playpause");
const rewindBtn = document.getElementById("rewind");
const forwardBtn = document.getElementById("forward");

const canvas = document.getElementById("roll");
const ctx2d = canvas.getContext("2d");

const keyboardCanvas = document.getElementById("keyboard");
const keyboardCtx = keyboardCanvas.getContext("2d");

const PX_PER_MS = 0.15;
const NOTE_WIDTH = 10;

const KEYS = [];

function shouldPlay(note) {
  if (practiceMode === "both") return true;
  return note.hand === practiceMode;
}

function highlightKey(midi, state) {
  const key = KEYS.find((k) => k.midi === midi);
  if (!key) return;
  if (key.active === state) return;
  key.active = state;
}

const START_MIDI = 36;
const KEY_COUNT = 61;

for (let i = 0; i < KEY_COUNT; i++) {
  const midi = START_MIDI + i;
  const black = [1, 3, 6, 8, 10].includes(midi % 12);

  KEYS.push({
    midi,
    black,
    active: false,
  });
}

const NOTES_IN_OCTAVE = [
  { name: "C", black: false },
  { name: "C#", black: true },
  { name: "D", black: false },
  { name: "D#", black: true },
  { name: "E", black: false },
  { name: "F", black: false },
  { name: "F#", black: true },
  { name: "G", black: false },
  { name: "G#", black: true },
  { name: "A", black: false },
  { name: "A#", black: true },
  { name: "B", black: false },
];

const CLEANUP_TIME = 10000; // 10s

function redrawUI() {
  drawKeyboard(keyboardCtx);
  drawNotes();
}

function getKeyByMidi(midi) {
  return KEYS.find((k) => k.midi === midi);
}

function onNoteDown(note, velocity = 100) {
  keysAlreadyUsed.delete(note);

  const key = getKeyByMidi(note);
  
  activeNotes.set(note, {
    start: timeline.currentTime,
    velocity,
  });

  highlightKey(note, true);
  noteOn(note, velocity); // Toca o som

  if (waitingForUser) {
    if (expectedNotes.has(note)) {
      expectedNotes.delete(note);
      keysAlreadyUsed.add(note);

      registerHit();

      const explosionColor = key.black ? "#00ffff" : "#aaffff";
      createParticles(key.x + key.w / 2, explosionColor);

      if (expectedNotes.size === 0) {
        waitingForUser = false;
        timeline.playing = true;
        timeline.last = performance.now();
      }
    } else {
      combo = 0;
      scoreMultiplier = 1;
      updateScoreUI();
    }
  }
}

function onNoteUp(note) {
  if (!activeNotes.has(note)) return;

  activeNotes.delete(note);
  highlightKey(note, false);
  noteOff(note);

  const event = [...midiEvents].reverse().find(n => n.note === note && n.end === null);
  if (event) {
    event.end = timeline.currentTime;
  }
  keysPhysicallyPressed.delete(note);

  keysAlreadyUsed.delete(now);
}

function stopAllNotes() {
  for (const note in oscillators) {
    try {
      oscillators[note].osc.stop();
    } catch (e) {}
    delete oscillators[note];
  }

  for (const note of songNotes) {
    if (note.started && !note.stopped) {
      note.stopped = true;
      highlightKey(note.midi, false);
    }
  }
}

function createKeyboard(containerId, startMidi = 36, keyCount = 61) {
  const container = document.getElementById(containerId);

  for (let i = 0; i < keyCount; i++) {
    const midi = startMidi + i;
    const note = NOTES_IN_OCTAVE[midi % 12];

    const key = document.createElement("div");
    key.classList.add("key");
    key.classList.add(note.black ? "black" : "white");
    key.dataset.midi = midi;

    container.appendChild(key);
  }
}

// Notas

function demoSequence() {
  const notes = [61, 60, 62, 64, 67, 69];
  let t = 0;

  for (const note of notes) {
    setTimeout(() => simulateNote(note, 400), t);
    t += 450;
  }
}

function drawNotes() {
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  for (const note of songNotes) {
    const key = getKeyByMidi(note.midi);
    if (!key) continue;

    const bottomY = canvas.height - (note.start - timeline.currentTime) * PX_PER_MS;
    const height = (note.end - note.start) * PX_PER_MS;
    const topY = bottomY - height;

    if (bottomY < 0 || topY > canvas.height) continue

    ctx2d.fillStyle = note.hand === "left" ? "#ff8888" : "#88ff88";
    ctx2d.fillRect(key.x, topY, key.w, height);
  }
}

const particles = [];

function createParticles(x, color) {
  for (let i = 0; i < 13; i++) {
    particles.push({
      x: x,
      y: 0, // A explosão nasce no y=0 do keyboardCanvas onde a nota bate
      vx: (Math.random() - 0.5) * 6, // Velocidade horizontal aleatória
      vy: Math.random() * -5 - 2,    // Velocidade vertical
      life: 1.5,                     // Tempo de vida
      color: color
    });
  }
}

function drawParticles(ctx) {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.3;
    p.life -= 0.04;
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

function loadSong(notes) {
  midiEvents.length = 0;

  for (const n of notes) {
    midiEvents.push({
      note: n.midi,
      velocity: 100,
      start: n.start,
      end: n.end,
      hand: n.hand,
      started: false,
      stopped: false,
    });
  }
}

function drawUserNotes() {
  for (const event of midiEvents) {
    const key = getKeyByMidi(event.note);
    if (!key) continue;

    const end = event.end !== null ? event.end : timeline.currentTime;
    
    const bottomY = canvas.height - (event.start - timeline.currentTime) * PX_PER_MS;
    const height = (end - event.start) * PX_PER_MS;
    const topY = bottomY - height;

    if (bottomY < 0 || topY > canvas.height) continue;

    ctx2d.fillStyle = "#66aaff"; 
    ctx2d.fillRect(key.x, topY, key.w, height);
  }
}

function drawKeyboard(ctx) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const whiteKeyCount = KEYS.filter((k) => !k.black).length;
  const whiteWidth = ctx.canvas.width / whiteKeyCount;
  const whiteHeight = ctx.canvas.height;
  const blackWidth = whiteWidth * 0.6;
  const blackHeight = ctx.canvas.height * 0.6;

  let whiteIndex = 0;

  // posicionar teclas
  for (const key of KEYS) {
    const mod = key.midi % 12;

    if (!key.black) {
      key.x = whiteIndex * whiteWidth;
      key.w = whiteWidth;
      whiteIndex++;
    } else {
      const blackOffsets = {
        1: 1, // C#
        3: 2, // D#
        6: 4, // F#
        8: 5, // G#
        10: 6, // A#
      };

      const octave = Math.floor((key.midi - START_MIDI) / 12);

      const offset = (octave * 7 + blackOffsets[mod]) * whiteWidth;

      key.x = offset - blackWidth / 2;
      key.w = blackWidth;

    }
  }

  // brancas
  for (const key of KEYS) {
    if (key.black) continue;
    ctx.fillStyle = key.active ? "#7fb1b1" : "#eeeeee";
    ctx.fillRect(key.x, 0, key.w, whiteHeight);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(key.x, 0, key.w, whiteHeight);
  }

  // pretas por cima
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
        ctx.fillStyle = "#ff3366"; 
        ctx.fill();
        
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
  }
}

window.AudioContext = window.AudioContext || window.webkitAudioContext; // Safari compatibilidade
// const audioContext = new AudioContext();
// console.log(audioContext);
let ctx;
//console.log(ctx)

const oscillators = {};

const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
let playbackRate = 1.0;

speedSlider.addEventListener("input", (e) => {
  playbackRate = parseFloat(e.target.value);
  speedValue.textContent = playbackRate.toFixed(1) + "x";
});

function update(now) {
  if (timeline.playing) {
    const delta = now - timeline.last;
    timeline.currentTime += delta * playbackRate;
    timeline.last = now;

    checkPracticeCollision();
    handleAutoPlayback();

    if (songDuration > 0 && timeline.currentTime >= songDuration) {
      endGame();
      return;
    }
  }
  if (!isDraggingProgress && songDuration > 0) {
      progressBar.value = timeline.currentTime;
    }

  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  drawNotes();

  keyboardCtx.clearRect(0, 0, keyboardCanvas.width, keyboardCanvas.height);
  drawKeyboard(keyboardCtx);
  drawParticles(keyboardCtx);

  requestAnimationFrame(update);
}

function handleInput(e) {
  const [command, noteOrCC, velocityOrValue] = e.data;
  const time = timeline.currentTime;
  const messageType = command >> 4;

  if (messageType === 9 && velocityOrValue > 0) {
    if (timeline.playing) {
      midiEvents.push({
        note: noteOrCC, velocity: velocityOrValue, start: time, end: null,
        hand: noteOrCC < 60 ? "left" : "right", started: false, stopped: false,
      });
    }
    
    onNoteDown(noteOrCC, velocityOrValue);

  } else if (messageType === 8 || (messageType === 9 && velocityOrValue === 0)) {
    if (timeline.playing) {
      const last = [...midiEvents].reverse().find((n) => n.note === noteOrCC && n.end === null);
      if (last) last.end = time;
    }
    
    onNoteUp(noteOrCC);

  } else if (messageType === 11) {

    if (noteOrCC === 64) {
      isSustainDown = velocityOrValue >= 64;
      if (!isSustainDown) {
        releaseSustainedNotes();
      }
    }
  }
}

function checkPracticeCollision() {
  if (practiceMode === "off" || waitingForUser) return;

  for (const note of songNotes) {
    if (
      timeline.currentTime >= note.start &&
      !note.validated &&
      shouldPlay(note)
    ) {
      stopTimelineAndPrepare(note.start);

      songNotes
        .filter((n) => Math.abs(n.start - note.start) < 50 && shouldPlay(n))
        .forEach((n) => {
          expectedNotes.add(n.midi);
          n.validated = true;
        });


      for (const expectedMidi of expectedNotes) {
        if (activeNotes.has(expectedMidi) && !keysAlreadyUsed.has(expectedMidi)) {
          
          expectedNotes.delete(expectedMidi);
          keysAlreadyUsed.add(expectedMidi);
          registerHit();
          
          //garante que mesmo sem pausar aumente a pontuação
          scoreHits++;
          scoreDisplay.textContent = scoreHits + " Acertos";
        }
      }

      if (expectedNotes.size === 0) {
        waitingForUser = false;
        timeline.playing = true;
        timeline.last = performance.now();
      }

      break;
    }
  }
}

function stopTimelineAndPrepare(exactStartTime) {
  timeline.playing = false;
  waitingForUser = true;
  timeline.currentTime = exactStartTime;

  combo = 0;
  scoreMultiplier = 1;
  updateScoreUI();
}

function handleAutoPlayback() {
  for (const note of songNotes) {
    const isAutoPlayNote = 
      practiceMode === "off" || // "off" significa Auto Play total
      (practiceMode === "left" && note.hand === "right") || // Praticando a esquerda, o PC toca a direita
      (practiceMode === "right" && note.hand === "left");   // Praticando a direita, o PC toca a esquerda

    if (timeline.currentTime >= note.start && !note.started) {
      note.started = true;
      if (isAutoPlayNote) {
        highlightKey(note.midi, true);
        noteOn(note.midi, 100);
      }
    }

    if (timeline.currentTime >= note.end && !note.stopped) {
      note.stopped = true;
      if (isAutoPlayNote) {
        highlightKey(note.midi, false);
        noteOff(note.midi);
      }
    }
  }
}

const activeAudioNodes = {}; 

function noteOn(note, velocity) {
  if (!ctx) return;
  
  // Registra que o dedo está na tecla
  keysPhysicallyPressed.add(note); 

  if (activeAudioNodes[note]) {
    activeAudioNodes[note].stop();
    delete activeAudioNodes[note];
  }

  if (pianoInstrument) {
    const vol = (velocity / 127) * 2.0;
    const audioNode = pianoInstrument.play(note, ctx.currentTime, {
      gain: vol,
      duration: 999 
    });
    activeAudioNodes[note] = audioNode;
  }
}

function noteOff(note) {
  keysPhysicallyPressed.delete(note); 

  if (!isSustainDown) {
    if (activeAudioNodes[note]) {
      activeAudioNodes[note].stop(ctx.currentTime + 0.1);
      delete activeAudioNodes[note];
    }
  }
}

function releaseSustainedNotes() {
  for (const note in activeAudioNodes) {
    if (!keysPhysicallyPressed.has(parseInt(note))) {
      activeAudioNodes[note].stop(ctx.currentTime + 0.1);
      delete activeAudioNodes[note];
    }
  }
}

const configBtn = document.getElementById("configBtn");
const configMenu = document.getElementById("configMenu");
const modeSelect = document.getElementById("modeSelect");
const scoreDisplay = document.getElementById("scoreDisplay");

let scoreHits = 0;
let maxComboThisSong = 0;
let combo = 0;
let scoreMultiplier = 1;

const comboDisplay = document.getElementById("comboDisplay");

function registerHit() {
  combo++;
  
  if (combo > maxComboThisSong) maxComboThisSong = combo;
  if (combo >= 30) scoreMultiplier = 4;
  else if (combo >= 20) scoreMultiplier = 3;
  else if (combo >= 10) scoreMultiplier = 2;
  else scoreMultiplier = 1;

  scoreHits += (10 * scoreMultiplier); // Cada nota base vale 10 pontos
  updateScoreUI();
}

function updateScoreUI() {
  scoreDisplay.textContent = scoreHits + " Pontos";
  
  if (combo >= 10) {
    comboDisplay.style.display = "inline";
    comboDisplay.textContent = `🔥 ${combo} Combo (x${scoreMultiplier})`;
  } else {
    comboDisplay.style.display = "none";
  }
}

function resetScore() {
  scoreHits = 0;
  combo = 0;
  scoreMultiplier = 1;
  maxComboThisSong = 0;
  updateScoreUI();
}

configBtn.addEventListener("click", () => {
  configMenu.classList.toggle("show");
});

window.addEventListener("click", (e) => {
  if (!e.target.closest('.dropdown')) {
    if (configMenu.classList.contains('show')) {
      configMenu.classList.remove('show');
    }
  }
});

modeSelect.addEventListener("change", (e) => {
  practiceMode = e.target.value;
  
  if (practiceMode === "off" && waitingForUser) {
    waitingForUser = false;
    expectedNotes.clear();
    if (playPauseBtn.textContent === "⏸") {
      timeline.playing = true;
      timeline.last = performance.now();
    }
  }
});

playPauseBtn.addEventListener("click", async () => {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();

  if (timeline.playing) {
      timeline.playing = false;
      playPauseBtn.textContent = "▶";
      stopAllNotes();
      return; 
    }

  if (!pianoInstrument) {
      if (!pianoLoading) {
        pianoLoading = true;
        playPauseBtn.textContent = "⏳"; 
        console.log("A transferir o piano de cauda... aguarde.");
        
        try {
          pianoInstrument = await Soundfont.instrument(ctx, 'acoustic_grand_piano', {
            soundfont: 'MusyngKite',
            format: 'mp3'
          });
          console.log("Piano carregado com sucesso!");
        } catch (erro) {
          console.error("Erro ao carregar o piano:", erro);
          playPauseBtn.textContent = "▶";
          pianoLoading = false;
          return;
        }

        pianoLoading = false;
      } else {
        return; 
      }
    }

  timeline.playing = true;
  timeline.last = performance.now();
  playPauseBtn.textContent = "⏸";
});

function seekTo(targetTimeMs) {
  stopAllNotes(); 
  
  timeline.currentTime = Math.max(0, Math.min(targetTimeMs, songDuration));

  for (const note of songNotes) {
    if (note.start >= timeline.currentTime) {
      note.started = false;
      note.validated = false;
    }
    if (note.end >= timeline.currentTime) {
      note.stopped = false;
    }
  }

  if (waitingForUser) {
    waitingForUser = false;
    expectedNotes.clear();
    if (playPauseBtn.textContent === "⏸") {
      timeline.playing = true;
      timeline.last = performance.now();
    }
  }
}

function seek(offsetMs) {
  seekTo(timeline.currentTime + offsetMs);
}

rewindBtn.addEventListener("click", () => seek(-5000));
forwardBtn.addEventListener("click", () => seek(5000));

keyboardCanvas.addEventListener("mousedown", (e) => {
  const rect = keyboardCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const key = getKeyAtPosition(x, y);
  if (!key) return;

  onNoteDown(key.midi, 100);

  debugInject(key.midi);
});

keyboardCanvas.addEventListener("mouseup", () => {
  KEYS.forEach((k) => {
    if (k.active) onNoteUp(k.midi);
  });
});

function getKeyAtPosition(x, y) {
  // pretas
  for (const key of KEYS.filter((k) => k.black)) {
    if (
      x >= key.x &&
      x <= key.x + key.w &&
      y <= keyboardCtx.canvas.height * 0.6
    ) {
      return key;
    }
  }

  // brancas
  for (const key of KEYS.filter((k) => !k.black)) {
    if (x >= key.x && x <= key.x + key.w) {
      return key;
    }
  }

  return null;
}

if (navigator.requestMIDIAccess) {
  navigator.requestMIDIAccess().then(
    (midiAccess) => {
      console.log("🎹 Acesso MIDI concedido!");
      
      const inputs = midiAccess.inputs.values();
      for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = handleInput; // Direciona tudo para o handleInput
      }
      
      midiAccess.onstatechange = (event) => {
        if (event.port.type === "input" && event.port.state === "connected") {
          event.port.onmidimessage = handleInput;
          console.log(`Teclado conectado: ${event.port.name}`);
        }
      };
    },
    () => console.error("Não foi possível acessar seus dispositivos MIDI.")
  );
} else {
  console.warn("Seu navegador não suporta Web MIDI API.");
}

function debugInject(note) {
  midiEvents.push({
    note,
    velocity: 100,
    start: timeline.currentTime,
    end: timeline.currentTime + 300,
    hand: note < 60 ? "left" : "right",
    started: false,
    stopped: false,
  });
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

window.addEventListener("resize", resizeCanvases);


songNotes.forEach((n) => {
  n.started = false;
  n.stopped = false;
  n.validated = false;
});

progressBar.addEventListener("mousedown", () => isDraggingProgress = true);

progressBar.addEventListener("mouseup", () => isDraggingProgress = false);

progressBar.addEventListener("input", (e) => {
  seekTo(parseFloat(e.target.value));
});

const getBtn = document.getElementById("get");
const midiInput = document.getElementById("midiInput");

getBtn.addEventListener("click", () => {
  midiInput.click();
});

midiInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById("songNameDisplay").textContent = file.name;

  timeline.playing = false;
  playPauseBtn.textContent = "▶";

  const reader = new FileReader();
  
  reader.onload = async function(event) {
    const midiData = new Midi(event.target.result);
    
    songNotes.length = 0;

    const faixasComNotas = midiData.tracks.filter(track => track.notes.length > 0);
    
    let leftTrackIndex = -1; 

    if (faixasComNotas.length >= 2) {
      const faixasOrdenadas = [...faixasComNotas].sort((a, b) => {
        const mediaA = a.notes.reduce((soma, n) => soma + n.midi, 0) / a.notes.length;
        const mediaB = b.notes.reduce((soma, n) => soma + n.midi, 0) / b.notes.length;
        return mediaA - mediaB;
      });
      
      leftTrackIndex = midiData.tracks.indexOf(faixasOrdenadas[0]);
    }

    midiData.tracks.forEach((track, index) => {
      track.notes.forEach(note => {
        
        let maoDaNota = "right"; 

        if (faixasComNotas.length >= 2) {
          maoDaNota = (index === leftTrackIndex) ? "left" : "right";
        } 
        else {
          maoDaNota = note.midi < 60 ? "left" : "right";
        }

        songNotes.push({
          midi: note.midi,
          start: note.time * 1000, 
          end: (note.time + note.duration) * 1000,
          hand: maoDaNota, 
          started: false,
          stopped: false,
          validated: false
        });
      });
    });

    songNotes.sort((a, b) => a.start - b.start);

    songDuration = songNotes.length > 0 ? Math.max(...songNotes.map(n => n.end)) : 0;
    progressBar.max = songDuration;
    progressBar.value = 0;

    timeline.currentTime = 0;
    expectedNotes.clear();
    waitingForUser = false;
    
    resizeCanvases();
    resetScore();
    
    console.log("Música carregada com sucesso! Total de notas:", songNotes.length);
  };

  reader.readAsArrayBuffer(file);
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    playPauseBtn.click();
  }
});


const gameOverScreen = document.getElementById("gameOverScreen");
const restartBtn = document.getElementById("restartBtn");

function endGame() {
  timeline.playing = false;
  playPauseBtn.textContent = "▶";
  stopAllNotes();

  // Pega o nome da música atual para salvar o recorde separado por música
  const songName = document.getElementById("songNameDisplay").textContent;
  
  // Verifica se já existe um recorde salvo para esta música
  let highScore = localStorage.getItem("highScore_" + songName) || 0;
  highScore = parseInt(highScore);

    // Atualiza o recorde caso a pontuação atual seja maior
  if (scoreHits > highScore) {
    highScore = scoreHits;
    localStorage.setItem("highScore_" + songName, highScore);
  }

  // Preenche os textos
  document.getElementById("finalScore").textContent = scoreHits;
  document.getElementById("maxCombo").textContent = maxComboThisSong;
  document.getElementById("highScoreDisplay").textContent = highScore;

  // Mostra a tela
  gameOverScreen.style.display = "flex";
}

// Tocar novamente
restartBtn.addEventListener("click", () => {
  gameOverScreen.style.display = "none";
  seekTo(0);
  timeline.playing = true;
  playPauseBtn.textContent = "⏸";
  timeline.last = performance.now();
});

requestAnimationFrame(update);
window.addEventListener("resize", resizeCanvases);


// início
resizeCanvases();