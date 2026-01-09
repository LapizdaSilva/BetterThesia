let loopRunning = false;

let practiceMode = "both";
// "left" | "right" | "both"

const songNotes = [
  { midi: 48, start: 0, end: 800, hand: "left" },
  { midi: 52, start: 0, end: 800, hand: "left" },
  { midi: 55, start: 0, end: 800, hand: "left" },

  { midi: 60, start: 0, end: 400, hand: "right" },
  { midi: 62, start: 500, end: 900, hand: "right" },
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

function onNoteDown(note, velocity = 100) {
  activeNotes.set(note, {
    start: timeline.currentTime,
    velocity,
  });

  highlightKey(note, true);
  noteOn(note, velocity);
}

function onNoteUp(note) {
  if (!activeNotes.has(note)) return;

  activeNotes.delete(note);
  highlightKey(note, false);
  noteOff(note);
}

function cleanupEvents() {
  midiEvents.splice(
    0,
    midiEvents.findIndex((n) => timeline.currentTime - n.end < CLEANUP_TIME)
  );
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

function simulateNote(note, duration = 500, velocity = 100) {
  if (!timeline.playing) return;

  // note on
  handleInput({
    data: [144, note, velocity],
  });

  // note off
  setTimeout(() => {
    handleInput({
      data: [128, note, 0],
    });
  }, duration);
}

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

  for (const note of midiEvents) {
    const x = (note.note - START_MIDI) * NOTE_WIDTH;

    const end = note.end ?? timeline.currentTime;

    const y = canvas.height - (timeline.currentTime - note.start) * PX_PER_MS;

    const height = (end - note.start) * PX_PER_MS;

    if (height <= 0) continue;

    ctx2d.fillStyle = note.hand === "left" ? "#ff8888" : "#88ff88";
    ctx2d.fillRect(x, y - height, NOTE_WIDTH, height);
  }
}

function drawActiveNotes() {
  for (const [note, data] of activeNotes) {
    const key = KEYS.find((k) => k.midi === note);
    if (!key) continue;

    const x = key.x;
    const width = key.w;
    const height = (timeline.currentTime - data.start) * PX_PER_MS;

    ctx2d.fillStyle = "#66aaff";
    ctx2d.fillRect(x, canvas.height - height, width, height);
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
    ctx.fillStyle = key.active ? "#88ffff" : "#eeeeee";
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
}

function buildExpectedChords(notes) {
  const map = new Map();

  for (const n of notes) {
    if (!map.has(n.start)) {
      map.set(n.start, { time: n.start, notes: new Set(), hand: n.hand });
    }
    map.get(n.start).notes.add(n.midi);
  }

  return [...map.values()];
}

window.AudioContext = window.AudioContext || window.webkitAudioContext; // Safari compatibilidade
// const audioContext = new AudioContext();
// console.log(audioContext);
let ctx;
//console.log(ctx)

const oscillators = {};

function midiToFrequency(number) {
  const a = 440;
  return 440 * Math.pow(2, (number - 69) / 12);
}

if (navigator.requestMIDIAccess) {
  navigator.requestMIDIAccess().then(sucess, failure);
}

function update(now) {
  if (!timeline.playing) return;

  const delta = now - timeline.last;
  timeline.currentTime += delta;
  timeline.last = now;

  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  drawNotes();
  drawActiveNotes();
  drawKeyboard(keyboardCtx);

  requestAnimationFrame(update);
}

function sucess(midiAccess) {
  midiAccess.addEventListener("statechange", updateDevices);
  // console.log(midiAccess);

  const inputs = midiAccess.inputs;
  // console.log(inputs);

  inputs.forEach((input) => {
    input.addEventListener("midimessage", handleInput);
  });
}

function handleInput(e) {
  if (!timeline.playing) return;

  const [command, note, velocity] = e.data;
  const time = timeline.currentTime;

  if (command === 144 && velocity > 0) {
    midiEvents.push({
      note,
      velocity,
      start: time,
      end: null,
      hand: note < 60 ? "left" : "right",
      started: false,
      stopped: false,
    });
  }

  if (command === 128 || (command === 144 && velocity === 0)) {
    const last = [...midiEvents]
      .reverse()
      .find((n) => n.note === note && n.end === null);

    if (last) last.end = time;
  }

  if (waitingForUser && expectedNotes.has(note)) {
    expectedNotes.delete(note);
    highlightKey(note, true);
    noteOn(note, velocity);

    if (expectedNotes.size === 0) {
      waitingForUser = false;
      timeline.playing = true;
      timeline.last = performance.now();
      requestAnimationFrame(update);
    }
  }
}

function scheduleNotes() {
  for (const note of midiEvents) {
    if (!shouldPlay(note)) continue;

    if (!note.started && note.start <= timeline.currentTime) {
      // modo treino: pausa e espera input
      waitingForUser = true;
      expectedNotes.add(note.note);
      practiceController.update(timeline.currentTime);
      practiceController.onUserNote(note);
      return;
    }

    if (
      note.started &&
      !note.stopped &&
      note.end !== null &&
      note.end <= timeline.currentTime
    ) {
      onNoteUp(note.note);
      note.stopped = true;
    }

    if (
      !note.started &&
      !waitingForUser &&
      note.start <= timeline.currentTime
    ) {
      onNoteDown(note.note, note.velocity);
      note.started = true;
    }
  }
}

function noteOn(note, velocity) {
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const vol = (velocity / 127) * 0.5;

  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.01);

  osc.type = "sine";
  osc.frequency.value = midiToFrequency(note);

  osc.connect(gain);
  gain.connect(ctx.destination);

  oscillators[note] = { osc, gain };
  osc.start();
}

function noteOff(note) {
  const voice = oscillators[note];
  if (!voice) return;

  const { osc, gain } = voice;

  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);

  osc.stop(ctx.currentTime + 0.3);
  delete oscillators[note];
}

function updateDevices(event) {
  console.log(event);
  console.log(
    `name: ${event.port.name}, Brand: ${event.port.manufacturer}, Type: ${event.port.type}, State: ${event.port.state}`
  );
}

function failure() {
  console.log("Failed to access MIDI");
}

playPauseBtn.addEventListener("click", async () => {
  if (!ctx) ctx = new AudioContext();

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  timeline.playing = !timeline.playing;
  timeline.last = performance.now();

  playPauseBtn.textContent = timeline.playing ? "⏸" : "▶";

  if (timeline.playing && !loopRunning) {
    loopRunning = true;
    requestAnimationFrame(update);

    demoSequence();
  }
});

rewindBtn.addEventListener("click", () => {
  timeline.currentTime = Math.max(0, timeline.currentTime - 2000);
});

forwardBtn.addEventListener("click", () => {
  timeline.currentTime += 2000;
});

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
  const width = canvas.clientWidth;
  const rollHeight = canvas.clientHeight;
  const keyboardHeight = keyboardCanvas.clientHeight;

  canvas.width = width;
  keyboardCanvas.width = width;

  canvas.height = rollHeight;
  keyboardCanvas.height = keyboardHeight;

  redrawUI();
}

// chamar no início
resizeCanvases();

// opcional: se redimensionar a tela
window.addEventListener("resize", resizeCanvases);
