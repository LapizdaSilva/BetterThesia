let loopRunning = false;

const timeline = {
  currentTime: 0,
  playing: false,
  last: 0,
};

const midiEvents = [];

const playPauseBtn = document.getElementById('playpause');
const rewindBtn = document.getElementById('rewind');
const forwardBtn = document.getElementById('forward');

const canvas = document.getElementById('roll');
const ctx2d = canvas.getContext('2d');

const PX_PER_MS = 0.15;
const NOTE_WIDTH = 10;

function drawNotes() {
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  for (const note of midiEvents) {
    const x = (note.note - 21) * NOTE_WIDTH;

    const end = note.end ?? timeline.currentTime;

    const y =
      canvas.height -
      (timeline.currentTime - note.start) * PX_PER_MS;

    const height = (end - note.start) * PX_PER_MS;

    if (height <= 0) continue;

    ctx2d.fillStyle = 'deepskyblue';
    ctx2d.fillRect(x, y - height, NOTE_WIDTH, height);
  }
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
  if (!timeline.playing) {
    loopRunning = false;
    return;
  }

  const delta = now - timeline.last;
  timeline.currentTime += delta;
  timeline.last = now;

  scheduleNotes();
  drawNotes();
  requestAnimationFrame(update);
}


function sucess(midiAccess) {
    midiAccess.addEventListener('statechange', updateDevices);
    // console.log(midiAccess);

    const inputs = midiAccess.inputs;
    // console.log(inputs);

    inputs.forEach((input) => {
        input.addEventListener('midimessage', handleInput);
    })
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
      started: false,
      stopped: false,
    });
  }

  if (command === 128 || (command === 144 && velocity === 0)) {
    const last = [...midiEvents]
      .reverse()
      .find(n => n.note === note && n.end === null);

    if (last) last.end = time;
  }
}

function scheduleNotes() {
  for (const note of midiEvents) {
    if (!note.started && note.start <= timeline.currentTime) {
      noteOn(note.note, note.velocity);
      note.started = true;
    }

    if (
      note.started &&
      !note.stopped &&
      note.end !== null &&
      note.end <= timeline.currentTime
    ) {
      noteOff(note.note);
      note.stopped = true;
    }
  }
}

function noteOn(note, velocity) {
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.gain.value = (velocity / 127) * 0.5;

    osc.type = 'sine';
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


function updateDevices(event){
    console.log(event);
    console.log(`name: ${event.port.name}, Brand: ${event.port.manufacturer}, Type: ${event.port.type}, State: ${event.port.state}`);
}

function failure() {
    console.log('Failed to access MIDI');
}

playPauseBtn.addEventListener('click', () => {
  if (!ctx) ctx = new AudioContext();

  timeline.playing = !timeline.playing;
  timeline.last = performance.now();

  playPauseBtn.textContent = timeline.playing ? '⏸' : '▶';

  if (timeline.playing && !loopRunning) {
    loopRunning = true;
    requestAnimationFrame(update);
  }
});

rewindBtn.addEventListener('click', () => {
  timeline.currentTime = Math.max(0, timeline.currentTime - 2000);
});

forwardBtn.addEventListener('click', () => {
  timeline.currentTime += 2000;
});
