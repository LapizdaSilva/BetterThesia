// Lógica, colisões e eventos
function shouldPlay(note) {
  if (practiceMode === "both") return true;
  return note.hand === practiceMode;
}

function onNoteDown(note, velocity = 100) {
  keysAlreadyUsed.delete(note);
  const key = getKeyByMidi(note);
  
  activeNotes.set(note, { start: timeline.currentTime, velocity });
  highlightKey(note, true);
  noteOn(note, velocity); 

  if (waitingForUser) {
    if (expectedNotes.has(note)) {
      expectedNotes.delete(note);
      keysAlreadyUsed.add(note);
      registerHit();

      if (key) {
        const explosionColor = key.black ? "#00ffff" : "#aaffff";
        createParticles(key.x + key.w / 2, explosionColor);
      }

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
  if (event) event.end = timeline.currentTime;
  
  keysPhysicallyPressed.delete(note);
  keysAlreadyUsed.delete(note);
}

function checkPracticeCollision() {
  if (practiceMode === "off" || waitingForUser) return;

  for (const note of songNotes) {
    if (timeline.currentTime >= note.start && !note.validated && shouldPlay(note)) {
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
      practiceMode === "off" || 
      (practiceMode === "left" && note.hand === "right") || 
      (practiceMode === "right" && note.hand === "left");   

    if (timeline.currentTime >= note.start && !note.started) {
      note.started = true;
      if (isAutoPlayNote) { highlightKey(note.midi, true); noteOn(note.midi, 100); }
    }

    if (timeline.currentTime >= note.end && !note.stopped) {
      note.stopped = true;
      if (isAutoPlayNote) { highlightKey(note.midi, false); noteOff(note.midi); }
    }
  }
}

function registerHit() {
  combo++;
  console.log(`A pontuação atual de combo é: ${combo}`);

  if (combo > maxComboThisSong) maxComboThisSong = combo;
  
  if (combo >= 30) scoreMultiplier = 4;
  else if (combo >= 20) scoreMultiplier = 3;
  else if (combo >= 10) scoreMultiplier = 2;
  else scoreMultiplier = 1;

  scoreHits += (10 * scoreMultiplier); 
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

function endGame() {
  timeline.playing = false;
  playPauseBtn.textContent = "▶";
  stopAllNotes();

  const totalNotasEsperadas = songNotes.filter(n => shouldPlay(n)).length;
  const pontuacaoMaximaEstimada = totalNotasEsperadas * 40

  const precisao = pontuacaoMaximaEstimada > 0 ? (scoreHits / pontuacaoMaximaEstimada) : 0;

  let rankStr= "D";
  let rankColor = "#ff4444"

  if (practiceMode === "off") {
    rankStr = "AUTO"; // Auto play não exibe rank
    rankColor = "#aaaaaa";
  } else if (precisao >= 0.90) { 
    rankStr = "S"; rankColor = "#00ffff"; 
  } else if (precisao >= 0.75) { 
    rankStr = "A"; rankColor = "#55ff55"; 
  } else if (precisao >= 0.50) { 
    rankStr = "B"; rankColor = "#ffff55"; 
  } else if (precisao >= 0.25) { 
    rankStr = "C"; rankColor = "#ffaa00"; 
  }

  const finalRankElement = document.getElementById("finalRank");
  finalRankElement.textContent = rankStr;
  finalRankElement.style.color = rankColor;

  const songName = setSongName(file.name);
  let highScore = localStorage.getItem("highScore_" + songName) || 0;
  highScore = parseInt(highScore);

  if (scoreHits > highScore) {
    highScore = scoreHits;
    localStorage.setItem("highScore_" + songName, highScore);
  }

  document.getElementById("finalScore").textContent = scoreHits;
  document.getElementById("maxCombo").textContent = maxComboThisSong;
  document.getElementById("highScoreDisplay").textContent = highScore;
  gameOverScreen.style.display = "flex";
}

speedSlider.addEventListener("input", (e) => {
  playbackRate = parseFloat(e.target.value);
  speedValue.textContent = playbackRate.toFixed(1) + "x";

  localStorage.setItem("betterThesia_speed", playbackRate);
});
const savedSpeed = localStorage.getItem("betterThesia_speed");

if (savedSpeed) {
  playbackRate = parseFloat(savedSpeed);
  speedSlider.value = playbackRate;
  speedValue.textContent = playbackRate.toFixed(1) + "x";
}


configBtn.addEventListener("click", () => configMenu.classList.toggle("show"));

window.addEventListener("click", (e) => {
  if (!e.target.closest('.dropdown') && configMenu.classList.contains('show')) {
    configMenu.classList.remove('show');
  }
});

modeSelect.addEventListener("change", (e) => {
  practiceMode = e.target.value;
  localStorage.setItem("betterThesia_practiceMode", practiceMode)
  if (waitingForUser) {
    waitingForUser = false;
    expectedNotes.clear();
    if (playPauseBtn.textContent === "⏸") {
      timeline.playing = true;
      timeline.last = performance.now(); 
    }
  }
});

const savedPracticeMode = localStorage.getItem("betterThesia_practiceMode");
if (savedPracticeMode) {
  practiceMode = savedPracticeMode;
  modeSelect.value = practiceMode;
};

document.getElementById("keyboardSize").addEventListener("change", (e) => {
  const newSize = parseInt(e.target.value);
  buildKeyboard(newSize);
  resizeCanvases();

  localStorage.setItem("betterThesia_keyboardSize", newSize);
});
const savedSize = localStorage.getItem("betterThesia_keyboardSize");

if (savedSize) {
  const sizeInt = parseInt(savedSize);
  document.getElementById("keyboardSize").value = sizeInt;
  
  buildKeyboard(sizeInt);
}

document.getElementById("songSelect").addEventListener("change", async (e) => {
  const url = e.target.value;
  if (!url) return;
  const songName = e.target.options[e.target.selectedIndex].text;
  setSongName(file.name);
  
  timeline.playing = false;
  playPauseBtn.textContent = "▶";
  
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    processMidiData(arrayBuffer);
  } catch (err) {
    alert("Erro ao carregar música. Verifique se o arquivo existe na pasta midis!");
  }
  
  e.target.value = ""; 
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
        try {
          pianoInstrument = await Soundfont.instrument(ctx, 'acoustic_grand_piano', { soundfont: 'MusyngKite', format: 'mp3' });
        } catch (erro) {
          console.error(erro);
          playPauseBtn.textContent = "▶";
          pianoLoading = false;
          return;
        }
        pianoLoading = false;
      } else return; 
  }

  timeline.playing = true;
  timeline.last = performance.now();
  playPauseBtn.textContent = "⏸";
});

function seekTo(targetTimeMs) {
  stopAllNotes(); 
  timeline.currentTime = Math.max(0, Math.min(targetTimeMs, songDuration));
  for (const note of songNotes) {
    if (note.start >= timeline.currentTime) { note.started = false; note.validated = false; }
    if (note.end >= timeline.currentTime) note.stopped = false;
  }
  if (waitingForUser) {
    waitingForUser = false;
    expectedNotes.clear();
    if (playPauseBtn.textContent === "⏸") { timeline.playing = true; timeline.last = performance.now(); }
  }
}

function setSongName(newName) {
  const nameDisplay = document.getElementById("songNameDisplay");
  const windowContainer = nameDisplay.parentElement;

  nameDisplay.textContent = newName;

  // Remove a classe de animação provisoriamente para conseguir medir o tamanho real da palavra
  nameDisplay.classList.remove("scrolling-text");

  // Verifica se o texto é maior que a caixinha
  if (nameDisplay.scrollWidth > windowContainer.clientWidth) {
    // Se não couber, adiciona a classe que faz ele deslizar
    nameDisplay.classList.add("scrolling-text");
  }
}

function seek(offsetMs) { seekTo(timeline.currentTime + offsetMs); }
rewindBtn.addEventListener("click", () => seek(-5000));
forwardBtn.addEventListener("click", () => seek(5000));

keyboardCanvas.addEventListener("mousedown", (e) => {
  const rect = keyboardCanvas.getBoundingClientRect();
  const key = getKeyAtPosition(e.clientX - rect.left, e.clientY - rect.top);
  if (key) onNoteDown(key.midi, 100);
});

keyboardCanvas.addEventListener("mouseup", () => KEYS.forEach((k) => { if (k.active) onNoteUp(k.midi); }));

progressBar.addEventListener("mousedown", () => isDraggingProgress = true);
progressBar.addEventListener("mouseup", () => isDraggingProgress = false);
progressBar.addEventListener("input", (e) => seekTo(parseFloat(e.target.value)));

getBtn.addEventListener("click", () => midiInput.click());


midiInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setSongName(file.name);
  timeline.playing = false;
  playPauseBtn.textContent = "▶";

  const reader = new FileReader();
  reader.onload = function(event) {
    processMidiData(event.target.result);
  };
  reader.readAsArrayBuffer(file);
});

function processMidiData(arrayBuffer) {
  const midiData = new Midi(arrayBuffer);
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
      if (faixasComNotas.length >= 2) maoDaNota = (index === leftTrackIndex) ? "left" : "right";
      else maoDaNota = note.midi < 60 ? "left" : "right";

      songNotes.push({
        midi: note.midi, start: note.time * 1000, end: (note.time + note.duration) * 1000,
        hand: maoDaNota, started: false, stopped: false, validated: false
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
}

// Teclado Midi físico
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
      if (!isSustainDown) releaseSustainedNotes();
    }
  }
}

if (navigator.requestMIDIAccess) {
  navigator.requestMIDIAccess().then(
    (midiAccess) => {
      console.log("🎹 Acesso MIDI concedido!");
      const inputs = midiAccess.inputs.values();
      for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = handleInput; 
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
}

window.addEventListener("keydown", (e) => { 
  if (e.code === "Space") { 
    e.preventDefault(); 
    playPauseBtn.click(); 
    return;
  }

  // Ignora se o utilizador estiver apenas a segurar a tecla
  if (e.repeat) return;

  // Só ativa o teclado do PC se o teclado na tela for o de 24 teclas
  if (KEY_COUNT === 24) {
    const midiNote = pcKeyboardMap[e.key.toLowerCase()];
    
    if (midiNote) {
      pressedPcKeys.add(e.key.toLowerCase());
      // Chama a função exata que o teclado MIDI chamaria
      onNoteDown(midiNote, 80); 
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (KEY_COUNT === 24) {
    const key = e.key.toLowerCase();
    const midiNote = pcKeyboardMap[key];
    
    if (midiNote && pressedPcKeys.has(key)) {
      pressedPcKeys.delete(key);
      onNoteUp(midiNote);
    }
  }
});

restartBtn.addEventListener("click", () => {
  gameOverScreen.style.display = "none";
  
  // Reseta os estados das notas
  songNotes.forEach(note => {
    note.started = false;
    note.stopped = false;
    note.validated = false;
  });

  expectedNotes.clear();
  waitingForUser = false;
  
  // Reseta os combos e a pontuação
  if (typeof resetScore === "function") resetScore();

  seekTo(0);
  timeline.playing = true;
  playPauseBtn.textContent = "⏸";
  timeline.last = performance.now();
});

window.addEventListener("resize", resizeCanvases);

function update(now) {
  if (timeline.playing) {
    const delta = now - timeline.last;
    timeline.currentTime += delta * playbackRate;
    timeline.last = now;

    checkPracticeCollision();
    handleAutoPlayback();

    if (songDuration > 0 && timeline.currentTime >= songDuration) {
      endGame();
    }
  }
  
  if (!isDraggingProgress && songDuration > 0) progressBar.value = timeline.currentTime;

  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  drawNotes();

  keyboardCtx.clearRect(0, 0, keyboardCanvas.width, keyboardCanvas.height);
  drawKeyboard(keyboardCtx);
  drawParticles(keyboardCtx);

  requestAnimationFrame(update);
}

// Inicialização
resizeCanvases();
requestAnimationFrame(update);