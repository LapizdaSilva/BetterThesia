// Sistema de áudio e soundfont;

window.AudioContext = window.AudioContext || window.webkitAudioContext;
let ctx;
let pianoInstrument = null;
let pianoLoading = false;

const activeAudioNodes = {};
const oscillators = {};

function noteOn(note, velocity) {
  if (!ctx) return;
  
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

function stopAllNotes() {
  for (const note in oscillators) {
    try { oscillators[note].osc.stop(); } catch (e) {}
    delete oscillators[note];
  }

  for (const note of songNotes) {
    if (note.started && !note.stopped) {
      note.stopped = true;
      highlightKey(note.midi, false);
    }
  }
}