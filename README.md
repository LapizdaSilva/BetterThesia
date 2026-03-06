# BetterThesia

Web interactive application inspired by Synthesia, made to help those who seek free piano appretinceship and midi files playback directly on your browser.

**🔗 [BetterThesia at Netlify](https://willowy-cranachan-0deb13.netlify.app/)**

---

## Features

* **Suport for physical keyboard (Web MIDI API):** connect your keyboard ou digital piano via USB cable and play usin real notes.
* **Realistic Audio (SoundFont):** Generated audio by real piano samples (hosted on cloud), replacing digital oscillators.
* **MIDI files reading:** Make the upload of your own songs `.midi` or `.mid` to practice
* **Practice Mode:** The song will pause and wait for you to press the correct note on your keyboard before continue.
* **Auto-Play:** Watch the song being played perfectly by the machine with visual feedback of the notes.

---

## Used Technologies 
* **HTML5, CSS3 and JavaScript (Vanilla):** Without heavy frameworks, ensuring high performance on canva rendering
* **Web MIDI API:** For BiDirectional communication with external song hardware.
*  **[@tonejs/midi](https://github.com/Tonejs/Midi):** Library used to read and parse `.midi` files, uploaded by user.
*  **[soundfont-player](https://github.com/danigb/soundfont-player):** Responsible for loading and reproducing mp3 audio files (MusyngKite grand piano).

## How to load it locally:

As the project uses just static files, it's very simple to run it on your own machine:

1. Clone the repository:

   ```bash
   git clone https://github.com/LapizdaSilva/BetterThesia.git
   ```
   
2. Navigate to the project file

3. To ensure that the libraries function correctly, use an extension such as "Live Server" in Vs Code to run the project locally
    
## Portuguese Version: 
# BetterThesia

Uma aplicação web interativa inspirada no Synthesia, criada para ajudar no aprendizado de piano e reprodução de arquivos MIDI direto no navegador. 

**🔗 [BetterThesia no Netlify](https://willowy-cranachan-0deb13.netlify.app/)**

---

##  Funcionalidades

* **Suporte a Teclado Físico (Web MIDI API):** Conecte seu teclado ou piano digital via cabo USB e jogue usando as teclas reais.
* **Áudio Realista (SoundFont):** Áudio gerado a partir de samples de um piano de cauda real (hospedado na nuvem), substituindo osciladores digitais por um som profissional.
* **Leitura de Arquivos MIDI:** Faça o upload das suas próprias músicas `.midi` ou `.mid` para praticar.
* **Modo Prática:** O tempo da música pausa e espera você acertar a nota exata no seu teclado antes de continuar.
* **Auto-Play:** Assista a música ser tocada perfeitamente pelo computador, com feedback visual nas teclas.

---

## Tecnologias Utilizadas

* **HTML5, CSS3 e JavaScript (Vanilla):** Sem frameworks pesados, garantindo alta performance na renderização do canvas.
* **Web MIDI API:** Para comunicação bidirecional com hardware musical externo.
* **[@tonejs/midi](https://github.com/Tonejs/Midi):** Biblioteca utilizada para ler e fazer o parse dos arquivos `.midi` carregados pelo usuário.
* **[soundfont-player](https://github.com/danigb/soundfont-player):** Responsável por carregar e reproduzir os arquivos de áudio em formato MP3 (MusyngKite grand piano).

---

## Como rodar o projeto localmente

Como o projeto utiliza apenas arquivos estáticos, é muito simples rodá-lo na sua máquina:

1. Faça o clone do repositório:
   ```bash
   git clone https://github.com/LapizdaSilva/BetterThesia.git
   ```
   
2. Navegue até a pasta do projeto:
   
3. Para garantir que as bibliotecas e o áudio carreguem corretamente, utilize uma extensão como o Live Server no VS Code para rodar o projeto localmente
