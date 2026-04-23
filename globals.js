let isSustainDown = false;
const keysPhysicallyPressed = new Set();
const keysAlreadyUsed = new Set();

let songDuration = 0;
let isDraggingProgress = false;
let practiceMode = "both";
let waitingForUser = false;
let expectedNotes = new Set();

const timeline = { currentTime: 0, playing: false, last: 0 };
const midiEvents = [];
const activeNotes = new Map();
const songNotes = [];

let scoreHits = 0;
let maxComboThisSong = 0;
let combo = 0;
let scoreMultiplier = 1;
let playbackRate = 1.0;

const progressBar = document.getElementById("progressBar");
const playPauseBtn = document.getElementById("playpause"); 
const rewindBtn = document.getElementById("rewind");
const forwardBtn = document.getElementById("forward");
const canvas = document.getElementById("roll");
const ctx2d = canvas.getContext("2d");
const keyboardCanvas = document.getElementById("keyboard");
const keyboardCtx = keyboardCanvas.getContext("2d");

const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const configBtn = document.getElementById("configBtn");
const configMenu = document.getElementById("configMenu");
const modeSelect = document.getElementById("modeSelect");

const scoreDisplay = document.getElementById("scoreDisplay");
const comboDisplay = document.getElementById("comboDisplay");
const gameOverScreen = document.getElementById("gameOverScreen");
const restartBtn = document.getElementById("restartBtn");

const midiInput = document.getElementById("midiInput");

const pcKeyboardMap = {
  // 1ª Oitava (Linha Z-M para teclas brancas, A-K para pretas)
  'z': 64, // E4 (Branca)
  'x': 65, // F4 (Branca)
  'g': 66, // F#4 (Preta)
  'c': 67, // G4 (Branca)
  'h': 68, // G#4 (Preta)
  'v': 69, // A4 (Branca)
  'j': 70, // A#4 (Preta)
  'b': 71, // B4 (Branca)
  'n': 72, // C5 (Branca)
  's': 73, // C#5 (Preta)
  'm': 74, // D5 (Branca)
  'd': 75, // D#5 (Preta)
  
  // 2ª Oitava (Linha Q-I para brancas, 2-8 para pretas)
  'q': 76, // E5 (Repetida para facilitar a troca de mão)
  'w': 77, // F5 (Branca)
  '5': 78, // F#5 (Preta)
  'e': 79, // G5 (Branca)
  '6': 80, // G#5 (Preta)
  'r': 81, // A5 (Branca)
  '7': 82, // A#5 (Preta)
  't': 83, // B5 (Branca)
  'y': 84, // C6 (Branca)
  '2': 85, // C#6 (Preta)
  'u': 86, // D6 (Branca)
  '3': 87, // D#6 (Preta)
};

const pressedPcKeys = new Set();
