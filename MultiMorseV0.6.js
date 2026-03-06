const http = require('http');
const WebSocket = require('ws');

// --- 1. LE CODE DE LA PAGE WEB (FRONT-END) ---
const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Radio CW - Interface Fluide</title>
    <style>
        * { box-sizing: border-box; touch-action: pan-y; }
        body { margin: 0; padding: 0; background: #111; color: #0f0; font-family: monospace; display: flex; justify-content: center; min-height: 100vh; text-align: left; }
        
        .app-wrapper { width: 100%; max-width: 900px; display: flex; flex-direction: column; padding: 20px; gap: 20px; }
        
        h2 { text-align: center; margin: 0; color: #fff; text-transform: uppercase; letter-spacing: 2px; }

        /* --- Zone Waterfall --- */
        .waterfall-container { position: relative; width: 100%; height: 35vh; min-height: 250px; border: 2px solid #333; border-radius: 8px; overflow: hidden; background: #000; flex-shrink: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
        
        #cursor-center { position: absolute; bottom: 0; width: 2px; height: 100%; background: red; margin-left: -1px; pointer-events: none; }
        #cursor-band { position: absolute; bottom: 0; height: 100%; background: rgba(255, 0, 0, 0.2); border-left: 1px dashed rgba(255,0,0,0.5); border-right: 1px dashed rgba(255,0,0,0.5); pointer-events: none; }
        
        /* --- Zone Contrôles --- */
        .panel { display: flex; flex-wrap: wrap; background: #222; border-radius: 8px; border: 1px solid #444; padding: 20px; gap: 30px; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        
        .settings { flex: 1 1 280px; display: flex; flex-direction: column; gap: 15px; }
        
        .info-panel { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; padding-bottom: 10px; border-bottom: 1px solid #333; }
        .info-rx { color: #ff5555; }
        .info-tx { color: #0ff; }
        
        .control-group { display: flex; flex-direction: column; gap: 5px; color: #aaa; font-size: 14px; }
        .control-group.row { flex-direction: row; justify-content: space-between; align-items: center; }
        
        input[type="range"] { -webkit-appearance: none; width: 100%; height: 24px; background: #1a1a1a; border-radius: 12px; outline: none; border: 1px solid #333; cursor: pointer; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #0ff; cursor: pointer; box-shadow: 0 0 5px rgba(0,255,255,0.5); }
        input[type="range"]#bandwidth::-webkit-slider-thumb { background: #ff5555; box-shadow: 0 0 5px rgba(255,85,85,0.5); }
        
        select { padding: 8px; background: #1a1a1a; color: #0ff; border: 1px solid #333; border-radius: 6px; font-family: monospace; font-size: 14px; outline: none; cursor: pointer; }
        
        .checkbox-label { cursor: pointer; display: flex; align-items: center; gap: 10px; color: #fff; }
        input[type="checkbox"] { width: 18px; height: 18px; accent-color: #0ff; cursor: pointer; }

        /* --- Bouton Télégraphique Rond 3D Centré --- */
        .action-area { flex: 1 1 200px; display: flex; justify-content: center; align-items: center; padding: 10px 0; }
        button#transmit { 
            width: 130px; height: 130px; border-radius: 50%; 
            background: radial-gradient(circle at 30% 30%, #ff4d4d, #cc0000); 
            border: none; cursor: pointer; touch-action: none; user-select: none;
            box-shadow: 0 8px 0 #8b0000, 0 15px 20px rgba(0,0,0,0.5); 
            transition: transform 0.05s, box-shadow 0.05s; 
            -webkit-tap-highlight-color: transparent; outline: none;
        }
        button#transmit:active, button#transmit.active { 
            transform: translateY(8px); 
            box-shadow: 0 0px 0 #8b0000, 0 5px 10px rgba(0,0,0,0.5); 
            background: radial-gradient(circle at 30% 30%, #ff6666, #dd0000); 
        }
    </style>
</head>
<body>
    
    <div class="app-wrapper">
        <h2>Spectre SDR</h2>
        
        <div class="waterfall-container" id="wf-container">
            <canvas id="waterfall"></canvas>
            <div id="cursor-band"></div>
            <div id="cursor-center"></div>
        </div>
        
        <div class="panel">
            <div class="settings">
                <div class="info-panel">
                    <div class="info-rx">📡 RX: <span id="rxFreqVal">500</span> Hz</div>
                    <div class="info-tx">🎙️ TX: <span id="txFreqVal">500</span> Hz</div>
                </div>

                <div class="control-group">
                    <label>🎙️ Fréquence d'émission (TX)</label>
                    <input type="range" id="freq" min="300" max="800" value="500">
                </div>

                <div class="control-group">
                    <label>🎚️ Largeur du filtre RX : <span id="bwValDisplay" style="color:#ff5555">40</span> Hz</label>
                    <input type="range" id="bandwidth" min="10" max="200" value="40">
                </div>

                <div class="control-group row">
                    <label>🌊 Timbre :</label>
                    <select id="waveform">
                        <option value="sine">Sinusoïdale</option>
                        <option value="square">Carrée</option>
                        <option value="sawtooth">Dents de scie</option>
                        <option value="triangle">Triangle</option>
                    </select>
                </div>

                <div class="control-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="sidetone" checked> M'entendre quand j'émets (Sidetone)
                    </label>
                </div>
            </div>

            <div class="action-area">
                <button id="transmit" title="Maintenir pour télégraphier"></button>
            </div>
        </div>
    </div>

    <script>
        const myId = Math.random().toString(36).substring(2, 10);

        const container = document.getElementById('wf-container');
        const canvas = document.getElementById('waterfall');
        const ctx = canvas.getContext('2d');
        const cursorCenterEl = document.getElementById('cursor-center');
        const cursorBandEl = document.getElementById('cursor-band');

        let audioCtx;
        const oscillators = {}; 
        const activeSignals = new Map(); 
        
        let txFreq = 500;
        let rxFreq = 500;
        let rxBandwidth = 40;
        let txWaveform = 'sine';
        let sidetoneEnabled = true;
        let isTransmitting = false;

        const freqSlider = document.getElementById('freq');
        const bwSlider = document.getElementById('bandwidth');
        const waveformSelect = document.getElementById('waveform');
        const sidetoneCheckbox = document.getElementById('sidetone');
        const txFreqVal = document.getElementById('txFreqVal');
        const rxFreqVal = document.getElementById('rxFreqVal');
        const bwValDisplay = document.getElementById('bwValDisplay');
        const btn = document.getElementById('transmit');

        // --- Redimensionnement ---
        let width, height;
        function resizeCanvas() {
            width = container.clientWidth;
            height = container.clientHeight;
            canvas.width = width;
            canvas.height = height;
            updateCursor();
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        freqSlider.oninput = (e) => { txFreq = parseInt(e.target.value); txFreqVal.innerText = txFreq; };
        bwSlider.oninput = (e) => { rxBandwidth = parseInt(e.target.value); bwValDisplay.innerText = rxBandwidth; updateCursor(); };
        waveformSelect.onchange = (e) => { txWaveform = e.target.value; };
        sidetoneCheckbox.onchange = (e) => { sidetoneEnabled = e.target.checked; };

        function updateCursor() {
            const percent = ((rxFreq - 300) / 500) * 100;
            const bandPercent = (rxBandwidth / 500) * 100;
            cursorCenterEl.style.left = percent + '%';
            cursorBandEl.style.left = percent + '%';
            cursorBandEl.style.width = bandPercent + '%';
            cursorBandEl.style.marginLeft = -(bandPercent / 2) + '%';
            rxFreqVal.innerText = rxFreq;
        }

        let isDraggingFreq = false;
        function setFreqFromPointer(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let x = clientX - rect.left;
            x = Math.max(0, Math.min(width, x)); 
            rxFreq = Math.round(300 + (x / width) * 500);
            updateCursor();
        }

        canvas.addEventListener('mousedown', (e) => { isDraggingFreq = true; setFreqFromPointer(e); });
        window.addEventListener('mousemove', (e) => { if(isDraggingFreq) setFreqFromPointer(e); });
        window.addEventListener('mouseup', () => { isDraggingFreq = false; });
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); isDraggingFreq = true; setFreqFromPointer(e); });
        window.addEventListener('touchmove', (e) => { if(isDraggingFreq) setFreqFromPointer(e); }, {passive: false});
        window.addEventListener('touchend', () => { isDraggingFreq = false; });

        // --- Réseau ---
        const ws = new WebSocket('ws://' + window.location.host);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleSignal(data.id, data.freq, data.state, data.wave);
        };

        function initAudio() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        // --- NOUVELLE GESTION AUDIO (Ondes continues / Zéro clic) ---
        function handleSignal(id, freq, state, wave = 'sine') {
            const isMe = (id === myId);

            if (state === 'on') {
                activeSignals.set(id, { freq, wave, isMe });
                let shouldHear = isMe ? sidetoneEnabled : (Math.abs(freq - rxFreq) <= (rxBandwidth / 2));
                
                if (shouldHear) {
                    let env = oscillators[id];
                    
                    // Si l'oscillateur n'existe pas, on le crée et on le laisse allumé à vie
                    if (!env) {
                        const osc = audioCtx.createOscillator();
                        const gainNode = audioCtx.createGain();
                        osc.type = wave;
                        osc.frequency.value = freq;
                        
                        gainNode.gain.value = 0; // Silencieux par défaut
                        
                        osc.connect(gainNode);
                        gainNode.connect(audioCtx.destination);
                        osc.start();
                        
                        env = { osc, gainNode };
                        oscillators[id] = env;
                    } else {
                        env.osc.type = wave;
                        env.osc.frequency.value = freq; 
                    }
                    
                    const now = audioCtx.currentTime;
                    const targetVol = (wave === 'sine' || wave === 'triangle') ? 0.1 : 0.05;
                    
                    // Attaque propre (Fade In sur 5ms)
                    env.gainNode.gain.cancelScheduledValues(now);
                    env.gainNode.gain.setValueAtTime(env.gainNode.gain.value, now);
                    env.gainNode.gain.linearRampToValueAtTime(targetVol, now + 0.005);
                }
            } else {
                activeSignals.delete(id);
                const env = oscillators[id];
                if (env) {
                    const now = audioCtx.currentTime;
                    
                    // Relâchement propre (Fade Out sur 5ms)
                    env.gainNode.gain.cancelScheduledValues(now);
                    env.gainNode.gain.setValueAtTime(env.gainNode.gain.value, now);
                    env.gainNode.gain.linearRampToValueAtTime(0, now + 0.005);
                    // On ne fait plus osc.stop() ! L'oscillateur tourne en silence.
                }
            }
        }

        // --- Bouton Morse ---
        function startTransmit() {
            initAudio(); 
            if(isTransmitting) return;
            isTransmitting = true;
            btn.classList.add('active'); 
            ws.send(JSON.stringify({ id: myId, freq: txFreq, state: 'on', wave: txWaveform }));
        }

        function stopTransmit() {
            if (!isTransmitting) return;
            isTransmitting = false;
            btn.classList.remove('active');
            ws.send(JSON.stringify({ id: myId, freq: txFreq, state: 'off' }));
        }

        btn.addEventListener('mousedown', startTransmit);
        window.addEventListener('mouseup', stopTransmit); 
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); startTransmit(); });
        window.addEventListener('touchend', stopTransmit); 
        window.addEventListener('touchcancel', stopTransmit);

        // --- Animation Waterfall ---
        function draw() {
            requestAnimationFrame(draw);
            const imageData = ctx.getImageData(0, 1, width, height - 1);
            ctx.putImageData(imageData, 0, 0);

            const bottomY = height - 1;
            ctx.fillStyle = '#000';
            ctx.fillRect(0, bottomY, width, 1);

            activeSignals.forEach((signalData, id) => {
                const x = ((signalData.freq - 300) / 500) * width;
                if (signalData.isMe) {
                    ctx.fillStyle = '#0ff'; 
                } else {
                    const isInsideBand = Math.abs(signalData.freq - rxFreq) <= (rxBandwidth / 2);
                    ctx.fillStyle = isInsideBand ? '#0f0' : '#040'; 
                }
                ctx.fillRect(x - 2, bottomY, 5, 1); 
            });
        }
        
        requestAnimationFrame(draw);
    </script>
</body>
</html>
`;

// --- 2. LE SERVEUR WEB (BACK-END) ---
const PORT = 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`📡 Serveur radio universel activé !`);
    console.log(`➡️  Ouvre ton navigateur sur PC ou Mobile via : http://localhost:${PORT}`);
});
