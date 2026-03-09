const http = require('http');
const WebSocket = require('ws');

// --- 1. LE CODE DE LA PAGE WEB (FRONT-END) ---
const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>MultiMorse SDR</title>
    <style>
        :root {
            --bg-body: #0b0c10;
            --bg-panel: #1f2833;
            --border-color: #2c363f;
            --text-main: #c5c6c7;
            --text-muted: #8b949e;
            --color-rx: #ff4b4b;
            --color-tx: #45a29e;
            --color-btn: #991b1b;
            --color-btn-active: #dc2626;
            --color-btn-border: #7f1d1d;
        }

        * { box-sizing: border-box; touch-action: pan-y; }
        
        body { 
            margin: 0; padding: 0; 
            background: var(--bg-body); 
            color: var(--text-main); 
            font-family: system-ui, -apple-system, sans-serif; 
            display: flex; justify-content: center; 
            min-height: 100vh; text-align: left; 
        }
        
        .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
        
        .app-wrapper { width: 100%; max-width: 900px; display: flex; flex-direction: column; padding: 20px; gap: 20px; }
        
        h2 { 
            text-align: center; margin: 0; color: #fff; 
            font-weight: 500; font-size: 1.2rem; letter-spacing: 1px; 
            text-transform: uppercase; opacity: 0.8;
        }

        /* --- Zone Waterfall --- */
        .waterfall-container { 
            position: relative; width: 100%; height: 35vh; min-height: 250px; 
            border: 1px solid var(--border-color); border-radius: 6px; 
            overflow: hidden; background: #000; flex-shrink: 0; 
        }
        canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
        
        #cursor-center { position: absolute; bottom: 0; width: 2px; height: 100%; background: var(--color-rx); margin-left: -1px; pointer-events: none; }
        #cursor-band { position: absolute; bottom: 0; height: 100%; background: rgba(255, 75, 75, 0.15); border-left: 1px dashed rgba(255,75,75,0.4); border-right: 1px dashed rgba(255,75,75,0.4); pointer-events: none; }
        
        /* --- Zone Contrôles --- */
        .panel { 
            display: flex; flex-wrap: wrap; 
            background: var(--bg-panel); border-radius: 6px; 
            border: 1px solid var(--border-color); padding: 25px; gap: 30px; 
            align-items: center; 
        }
        
        .settings { flex: 1 1 280px; display: flex; flex-direction: column; gap: 18px; }
        
        .info-panel { 
            display: flex; justify-content: space-between; 
            font-size: 15px; font-weight: 600; padding-bottom: 15px; 
            border-bottom: 1px solid var(--border-color); 
        }
        .info-rx { color: var(--color-rx); }
        .info-tx { color: var(--color-tx); }
        .val-badge { display: inline-block; min-width: 40px; text-align: right; }
        
        .control-group { display: flex; flex-direction: column; gap: 8px; color: var(--text-main); font-size: 14px; }
        .control-group.row { flex-direction: row; justify-content: space-between; align-items: center; }
        
        label { color: var(--text-muted); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;}
        
        /* Sliders Minimalistes */
        input[type="range"] { 
            -webkit-appearance: none; width: 100%; height: 6px; 
            background: #111; border-radius: 3px; outline: none; 
            border: 1px solid #000; cursor: pointer; margin: 10px 0;
        }
        input[type="range"]::-webkit-slider-thumb { 
            -webkit-appearance: none; appearance: none; 
            width: 20px; height: 20px; border-radius: 50%; 
            background: var(--text-main); cursor: pointer; 
            border: 2px solid var(--bg-panel);
            transition: background 0.2s;
        }
        input[type="range"]#freq::-webkit-slider-thumb { background: var(--color-tx); }
        input[type="range"]#bandwidth::-webkit-slider-thumb { background: var(--color-rx); }
        
        select { 
            padding: 8px 12px; background: #111; color: var(--text-main); 
            border: 1px solid var(--border-color); border-radius: 4px; 
            font-size: 13px; outline: none; cursor: pointer; 
        }
        
        .checkbox-label { cursor: pointer; display: flex; align-items: center; gap: 10px; color: var(--text-main); font-weight: normal; text-transform: none; font-size: 14px;}
        input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--color-tx); cursor: pointer; }

        /* --- Bouton Télégraphique Matériel --- */
        .action-area { flex: 1 1 200px; display: flex; justify-content: center; align-items: center; padding: 10px 0; }
        button#transmit { 
            width: 120px; height: 120px; border-radius: 50%; 
            background: var(--color-btn); 
            border: 4px solid var(--color-btn-border); 
            cursor: pointer; touch-action: none; user-select: none;
            box-shadow: 0 6px 12px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1); 
            transition: all 0.05s ease; 
            -webkit-tap-highlight-color: transparent; outline: none;
        }
        button#transmit:active, button#transmit.active { 
            transform: translateY(4px); 
            background: var(--color-btn-active);
            box-shadow: 0 2px 4px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.2); 
        }
    </style>
</head>
<body>
    
    <div class="app-wrapper">
        <h2>MultiMorse SDR</h2>
        
        <div class="waterfall-container" id="wf-container">
            <canvas id="waterfall"></canvas>
            <div id="cursor-band"></div>
            <div id="cursor-center"></div>
        </div>
        
        <div class="panel">
            <div class="settings">
                <div class="info-panel">
                    <div class="info-rx">RX: <span id="rxFreqVal" class="mono val-badge">500</span> <span class="mono">Hz</span></div>
                    <div class="info-tx">TX: <span id="txFreqVal" class="mono val-badge">500</span> <span class="mono">Hz</span></div>
                </div>

                <div class="control-group">
                    <label>Fréquence TX (Émission)</label>
                    <input type="range" id="freq" min="300" max="800" value="500">
                </div>

                <div class="control-group">
                    <label>Bande passante RX : <span id="bwValDisplay" class="mono" style="color:var(--color-rx)">40</span> <span class="mono">Hz</span></label>
                    <input type="range" id="bandwidth" min="10" max="200" value="40">
                </div>

                <div class="control-group row">
                    <label>Forme d'onde</label>
                    <select id="waveform">
                        <option value="sine">Sinusoïdale (CW)</option>
                        <option value="square">Carrée</option>
                        <option value="sawtooth">Dents de scie</option>
                        <option value="triangle">Triangle</option>
                    </select>
                </div>

                <div class="control-group" style="margin-top: 5px;">
                    <label class="checkbox-label">
                        <input type="checkbox" id="sidetone" checked> Retour audio (Sidetone)
                    </label>
                </div>
            </div>

            <div class="action-area">
                <button id="transmit" title="Maintenir pour transmettre"></button>
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

        // --- Réseau Dynamique et Sécurisé ---
        // Détecte automatiquement s'il faut utiliser ws:// (local) ou wss:// (prod HTTPS)
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(wsProtocol + '//' + window.location.host);

        ws.onmessage = (event) => {
            try {
                // Protection contre les erreurs JSON envoyées par un hackeur
                const data = JSON.parse(event.data);
                
                // --- ZERO LATENCE : On ignore nos propres messages venant du serveur ---
                if (data.id === myId) return;

                if (data.id && typeof data.freq === 'number' && data.state) {
                    handleSignal(data.id, data.freq, data.state, data.wave);
                }
            } catch (err) {
                console.warn("Message malformé ignoré");
            }
        };

        function initAudio() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        function handleSignal(id, freq, state, wave = 'sine') {
            const isMe = (id === myId);

            if (state === 'on') {
                activeSignals.set(id, { freq, wave, isMe });
                let shouldHear = isMe ? sidetoneEnabled : (Math.abs(freq - rxFreq) <= (rxBandwidth / 2));
                
                if (shouldHear) {
                    let env = oscillators[id];
                    
                    if (!env) {
                        const osc = audioCtx.createOscillator();
                        const gainNode = audioCtx.createGain();
                        // Tolérance d'erreur sur la forme d'onde
                        osc.type = ['sine', 'square', 'sawtooth', 'triangle'].includes(wave) ? wave : 'sine';
                        osc.frequency.value = freq;
                        
                        gainNode.gain.value = 0; 
                        
                        osc.connect(gainNode);
                        gainNode.connect(audioCtx.destination);
                        osc.start();
                        
                        env = { osc, gainNode };
                        oscillators[id] = env;
                    } else {
                        env.osc.type = ['sine', 'square', 'sawtooth', 'triangle'].includes(wave) ? wave : 'sine';
                        env.osc.frequency.value = freq; 
                    }
                    
                    const now = audioCtx.currentTime;
                    const targetVol = (wave === 'sine' || wave === 'triangle') ? 0.1 : 0.05;
                    
                    env.gainNode.gain.cancelScheduledValues(now);
                    env.gainNode.gain.setValueAtTime(env.gainNode.gain.value, now);
                    env.gainNode.gain.linearRampToValueAtTime(targetVol, now + 0.005);
                }
            } else {
                activeSignals.delete(id);
                const env = oscillators[id];
                if (env) {
                    const now = audioCtx.currentTime;
                    env.gainNode.gain.cancelScheduledValues(now);
                    env.gainNode.gain.setValueAtTime(env.gainNode.gain.value, now);
                    env.gainNode.gain.linearRampToValueAtTime(0, now + 0.005);
                }
            }
        }

        function startTransmit() {
            initAudio(); 
            if(isTransmitting) return;
            isTransmitting = true;
            btn.classList.add('active'); 
            
            // --- ZERO LATENCE : Déclenchement local instantané ---
            handleSignal(myId, txFreq, 'on', txWaveform);
            
            ws.send(JSON.stringify({ id: myId, freq: txFreq, state: 'on', wave: txWaveform }));
        }

        function stopTransmit() {
            if (!isTransmitting) return;
            isTransmitting = false;
            btn.classList.remove('active');
            
            // --- ZERO LATENCE : Arrêt local instantané ---
            handleSignal(myId, txFreq, 'off');
            
            ws.send(JSON.stringify({ id: myId, freq: txFreq, state: 'off' }));
        }

        btn.addEventListener('mousedown', startTransmit);
        window.addEventListener('mouseup', stopTransmit); 
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); startTransmit(); });
        window.addEventListener('touchend', stopTransmit); 
        window.addEventListener('touchcancel', stopTransmit);

        // --- Support Clavier (Barre Espace) ---
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); 
                if (!e.repeat) { startTransmit(); }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); stopTransmit();
            }
        });

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
                    ctx.fillStyle = '#45a29e'; 
                } else {
                    const isInsideBand = Math.abs(signalData.freq - rxFreq) <= (rxBandwidth / 2);
                    ctx.fillStyle = isInsideBand ? '#66ff66' : '#225522'; 
                }
                ctx.fillRect(x - 2, bottomY, 5, 1); 
            });
        }
        
        requestAnimationFrame(draw);
    </script>
</body>
</html>
`;

// --- 2. LE SERVEUR WEB (BACK-END PROD) ---
// Utilisation du port dynamique (process.env.PORT) pour les hébergeurs
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

// Limite la taille des messages entrants (1024 octets max) pour éviter les attaques Buffer Overflow
const wss = new WebSocket.Server({ server, maxPayload: 1024 });

// Fonction de Heartbeat (Ping/Pong)
function heartbeat() {
    this.isAlive = true;
}

wss.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    ws.on('message', function incoming(message) {
        // Prévention 1: Convertir le Buffer en String
        const msgString = message.toString();

        // Prévention 2: Vérifier la taille par sécurité supplémentaire
        if (msgString.length > 300) return; 

        try {
            // Prévention 3: Vérifier que c'est bien du JSON valide
            const data = JSON.parse(msgString);
            
            // Prévention 4: Validation stricte des données (Sanitization)
            if (typeof data.id !== 'string' || data.id.length > 15) return;
            if (typeof data.freq !== 'number' || isNaN(data.freq)) return;
            if (data.state !== 'on' && data.state !== 'off') return;
            
            // Format d'onde valide
            const allowedWaves = ['sine', 'square', 'sawtooth', 'triangle'];
            const safeWave = allowedWaves.includes(data.wave) ? data.wave : 'sine';

            // Création d'un payload propre et sécurisé à renvoyer (efface les champs injéctés)
            const safePayload = JSON.stringify({
                id: data.id,
                freq: Math.max(100, Math.min(2000, data.freq)), // Clampe la fréquence
                state: data.state,
                wave: safeWave
            });

            // Redistribution sécurisée
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(safePayload);
                }
            });

        } catch (e) {
            // Message malformé ou tentative de hack => on l'ignore silencieusement
        }
    });
});

// Nettoyage régulier des connexions mortes (Nginx/Cloudflare Timeout Prevention)
const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000); // Toutes les 30 secondes

wss.on('close', function close() {
    clearInterval(interval);
});

server.listen(PORT, () => {
    console.log(`[MultiMorse PROD] Serveur radio opérationnel.`);
    console.log(`> Port d'écoute : ${PORT}`);
});
