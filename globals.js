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

const getBtn = document.getElementById("get");
const midiInput = document.getElementById("midiInput");