/**
 * SignSpeak AI — Sign Language to Speech
 * Real-time ASL finger-spelling detection using MediaPipe Hands
 * with text output and Web Speech API audio
 */

// ===== DOM Elements =====
const heroSection = document.getElementById('hero-section');
const detectionSection = document.getElementById('detection-section');
const guideSection = document.getElementById('guide-section');
const aboutSection = document.getElementById('about-section');

const startCameraBtn = document.getElementById('start-camera-btn');
const learnMoreBtn = document.getElementById('learn-more-btn');
const stopCameraBtn = document.getElementById('stop-camera-btn');
const toggleSkeletonBtn = document.getElementById('toggle-skeleton');
const flipCameraBtn = document.getElementById('flip-camera');

const videoEl = document.getElementById('camera-video');
const handCanvas = document.getElementById('hand-canvas');
const cameraOverlay = document.getElementById('camera-overlay');
const cameraContainer = document.getElementById('camera-container');

const detectedLetterBadge = document.getElementById('detected-letter-badge');
const detectedLetterDisplay = document.getElementById('detected-letter-display');
const currentLetterEl = document.getElementById('current-letter');
const textDisplay = document.getElementById('text-display');
const confidenceFill = document.getElementById('confidence-fill');

const speakBtn = document.getElementById('speak-btn');
const autoSpeakBtn = document.getElementById('auto-speak-btn');
const autoSpeakStatus = document.getElementById('auto-speak-status');
const speechRateInput = document.getElementById('speech-rate');
const rateValueEl = document.getElementById('rate-value');

const copyTextBtn = document.getElementById('copy-text-btn');
const clearTextBtn = document.getElementById('clear-text-btn');
const addSpaceBtn = document.getElementById('add-space');
const addBackspaceBtn = document.getElementById('add-backspace');
const addPeriodBtn = document.getElementById('add-period');
const addNewlineBtn = document.getElementById('add-newline');

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

const navDetect = document.getElementById('nav-detect');
const navGuide = document.getElementById('nav-guide');
const navAbout = document.getElementById('nav-about');

const toastEl = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

const particlesCanvas = document.getElementById('particles-canvas');

// ===== State =====
let handsModule = null;
let camera = null;
let handCanvasCtx = handCanvas.getContext('2d');
let detectedText = '';
let lastDetectedLetter = '';
let letterHoldCount = 0;
let letterConfirmThreshold = 12; // frames to hold before confirming
let showSkeleton = true;
let isAutoSpeak = false;
let isRunning = false;
let isMirrored = true;
let currentSection = 'detect';
let lastSpeakTime = 0;
let noHandFrames = 0;

// ===== ASL Hand Sign Descriptions (for guide) =====
const ASL_DESCRIPTIONS = {
    A: 'Fist with thumb beside',
    B: 'Flat hand, fingers up, thumb across palm',
    C: 'Curved hand like letter C',
    D: 'Index up, others touch thumb',
    E: 'Fingers curled, thumb tucked',
    F: 'O shape with index & thumb, 3 fingers up',
    G: 'Fist, index & thumb out pointing left',
    H: 'Fist, index & middle out pointing left',
    I: 'Fist, pinky up',
    J: 'Pinky up, trace J shape',
    K: 'Index & middle up spread, thumb between',
    L: 'Index up, thumb out, L shape',
    M: 'Thumb under 3 fingers',
    N: 'Thumb under 2 fingers',
    O: 'All fingers touch thumb, O shape',
    P: 'Like K pointing down',
    Q: 'Like G pointing down',
    R: 'Cross index over middle, fingers up',
    S: 'Fist with thumb over fingers',
    T: 'Thumb between index & middle',
    U: 'Index & middle up together',
    V: 'Index & middle up spread (peace)',
    W: 'Index, middle, ring up spread',
    X: 'Index finger hooked',
    Y: 'Thumb & pinky out (hang loose)',
    Z: 'Index traces Z shape in air',
};

// ===== Particles Background =====
function initParticles() {
    const ctx = particlesCanvas.getContext('2d');
    let particles = [];
    const count = 50;

    function resize() {
        particlesCanvas.width = window.innerWidth;
        particlesCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * particlesCanvas.width,
            y: Math.random() * particlesCanvas.height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.3 + 0.05,
        });
    }

    function draw() {
        ctx.clearRect(0, 0, particlesCanvas.width, particlesCanvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = particlesCanvas.width;
            if (p.x > particlesCanvas.width) p.x = 0;
            if (p.y < 0) p.y = particlesCanvas.height;
            if (p.y > particlesCanvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(108, 92, 231, ${p.alpha})`;
            ctx.fill();
        });

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(108, 92, 231, ${0.06 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
}

// ===== Navigation =====
function showSection(section) {
    currentSection = section;

    heroSection.classList.add('hidden');
    detectionSection.classList.add('hidden');
    guideSection.classList.add('hidden');
    aboutSection.classList.add('hidden');

    navDetect.classList.remove('active');
    navGuide.classList.remove('active');
    navAbout.classList.remove('active');

    switch (section) {
        case 'detect':
            navDetect.classList.add('active');
            if (isRunning) {
                detectionSection.classList.remove('hidden');
            } else {
                heroSection.classList.remove('hidden');
            }
            break;
        case 'guide':
            navGuide.classList.add('active');
            guideSection.classList.remove('hidden');
            break;
        case 'about':
            navAbout.classList.add('active');
            aboutSection.classList.remove('hidden');
            break;
    }
}

// ===== ASL Guide Grid =====
function buildASLGuide() {
    const grid = document.getElementById('asl-grid');
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        const card = document.createElement('div');
        card.className = 'asl-card';
        card.innerHTML = `
            <span class="asl-letter">${letter}</span>
            <span class="asl-description">${ASL_DESCRIPTIONS[letter]}</span>
        `;
        card.addEventListener('click', () => {
            speakText(letter);
            showToast(`Letter: ${letter} — ${ASL_DESCRIPTIONS[letter]}`);
        });
        grid.appendChild(card);
    }
}

// ===== Toast =====
let toastTimeout = null;
function showToast(msg) {
    toastMessage.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// ===== Speech =====
function speakText(text) {
    if (!text || !text.trim()) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = parseFloat(speechRateInput.value);
    utterance.pitch = 1;
    utterance.volume = 1;
    // Try to use a good English voice
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                      voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    speechSynthesis.cancel(); // cancel any ongoing
    speechSynthesis.speak(utterance);
}

// ===== Camera & MediaPipe Setup =====
async function startCamera() {
    showToast('Initializing hand detection...');
    setStatus('Starting...', false);

    // Show detection section
    heroSection.classList.add('hidden');
    detectionSection.classList.remove('hidden');

    try {
        // Initialize MediaPipe Hands
        handsModule = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
            }
        });

        handsModule.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.6,
        });

        handsModule.onResults(onHandResults);

        // Start camera
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        });

        videoEl.srcObject = stream;
        await videoEl.play();

        // Resize canvas to match video
        function resizeCanvas() {
            handCanvas.width = videoEl.videoWidth || 640;
            handCanvas.height = videoEl.videoHeight || 480;
        }
        resizeCanvas();
        videoEl.addEventListener('loadedmetadata', resizeCanvas);

        // Start detection loop
        isRunning = true;
        setStatus('Detecting', true);
        cameraOverlay.classList.add('hidden');
        showToast('✅ Camera ready! Start signing.');

        detectLoop();
    } catch (err) {
        console.error('Camera/MediaPipe error:', err);
        showToast('❌ Camera access denied or error.');
        setStatus('Error', false);
        cameraOverlay.innerHTML = `<p style="color: var(--accent-red);">Camera access denied.<br>Please allow camera permissions.</p>`;
    }
}

async function detectLoop() {
    if (!isRunning) return;
    try {
        await handsModule.send({ image: videoEl });
    } catch (e) {
        // Ignore frame errors
    }
    requestAnimationFrame(detectLoop);
}

function stopCamera() {
    isRunning = false;
    if (videoEl.srcObject) {
        videoEl.srcObject.getTracks().forEach(t => t.stop());
        videoEl.srcObject = null;
    }
    setStatus('Offline', false);
    showSection('detect');
    showToast('Camera stopped.');
}

function setStatus(text, active) {
    statusText.textContent = text;
    statusDot.classList.toggle('active', active);
}

// ===== Hand Detection Results =====
function onHandResults(results) {
    const ctx = handCanvasCtx;
    ctx.clearRect(0, 0, handCanvas.width, handCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        noHandFrames = 0;
        const landmarks = results.multiHandLandmarks[0];

        // Draw hand skeleton
        if (showSkeleton) {
            drawHandSkeleton(ctx, landmarks);
        }

        // Recognize ASL letter
        const { letter, confidence } = recognizeASL(landmarks);

        // Update confidence bar
        confidenceFill.style.width = `${confidence * 100}%`;
        if (confidence > 0.7) {
            confidenceFill.style.background = 'var(--accent-green)';
        } else if (confidence > 0.4) {
            confidenceFill.style.background = 'var(--accent-orange)';
        } else {
            confidenceFill.style.background = 'var(--gradient-main)';
        }

        if (letter && confidence > 0.55) {
            detectedLetterDisplay.textContent = letter;
            detectedLetterBadge.classList.add('detected');
            currentLetterEl.textContent = letter;

            // Letter hold logic
            if (letter === lastDetectedLetter) {
                letterHoldCount++;
            } else {
                letterHoldCount = 0;
                lastDetectedLetter = letter;
            }

            // Confirm letter after holding
            if (letterHoldCount === letterConfirmThreshold) {
                addLetterToText(letter);
            }
        } else {
            detectedLetterDisplay.textContent = '?';
            detectedLetterBadge.classList.remove('detected');
        }
    } else {
        noHandFrames++;
        if (noHandFrames > 20) {
            detectedLetterDisplay.textContent = '—';
            detectedLetterBadge.classList.remove('detected');
            currentLetterEl.textContent = '—';
            confidenceFill.style.width = '0%';
            lastDetectedLetter = '';
            letterHoldCount = 0;
        }
    }
}

// ===== Draw Hand Skeleton =====
function drawHandSkeleton(ctx, landmarks) {
    const w = handCanvas.width;
    const h = handCanvas.height;

    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // Index
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
        [0, 13], [13, 14], [14, 15], [15, 16],// Ring
        [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
        [5, 9], [9, 13], [13, 17]             // Palm
    ];

    // Draw connections
    ctx.lineWidth = 3;
    connections.forEach(([i, j]) => {
        const a = landmarks[i];
        const b = landmarks[j];
        const gradient = ctx.createLinearGradient(a.x * w, a.y * h, b.x * w, b.y * h);
        gradient.addColorStop(0, 'rgba(108, 92, 231, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 206, 255, 0.8)');
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.stroke();
    });

    // Draw landmarks
    landmarks.forEach((lm, i) => {
        const x = lm.x * w;
        const y = lm.y * h;
        const isTip = [4, 8, 12, 16, 20].includes(i);
        const r = isTip ? 6 : 4;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = isTip ? '#00CEFF' : '#6C5CE7';
        ctx.fill();

        if (isTip) {
            ctx.beginPath();
            ctx.arc(x, y, r + 3, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 206, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

// ===== ASL Recognition Engine =====
function recognizeASL(landmarks) {
    // Extract key relationships from 21 hand landmarks
    // Landmarks: 0=wrist, 1-4=thumb, 5-8=index, 9-12=middle, 13-16=ring, 17-20=pinky

    const tips = [4, 8, 12, 16, 20];     // fingertips
    const pips = [3, 7, 11, 15, 19];     // PIP joints
    const mcps = [2, 6, 10, 14, 18];     // MCP joints
    const bases = [1, 5, 9, 13, 17];     // base joints

    const wrist = landmarks[0];

    // Helper functions
    function dist(a, b) {
        return Math.sqrt(
            (landmarks[a].x - landmarks[b].x) ** 2 +
            (landmarks[a].y - landmarks[b].y) ** 2 +
            (landmarks[a].z - landmarks[b].z) ** 2
        );
    }

    function dist2d(a, b) {
        return Math.sqrt(
            (landmarks[a].x - landmarks[b].x) ** 2 +
            (landmarks[a].y - landmarks[b].y) ** 2
        );
    }

    function isFingerExtended(tipIdx, pipIdx, mcpIdx) {
        // A finger is extended if tip is above (lower y) the PIP joint
        // For vertical orientation 
        return landmarks[tipIdx].y < landmarks[pipIdx].y - 0.02;
    }

    function isFingerCurled(tipIdx, pipIdx, mcpIdx) {
        return landmarks[tipIdx].y > landmarks[pipIdx].y + 0.01;
    }

    function isThumbExtended() {
        // Thumb extended if tip is far from index base
        return dist(4, 5) > dist(3, 5) * 1.1;
    }

    function isThumbAcrossPalm() {
        // Thumb across palm if thumb tip X is near middle finger base
        return Math.abs(landmarks[4].x - landmarks[9].x) < 0.06;
    }

    function fingersTouchingThumb(fingerTipIdx) {
        return dist(4, fingerTipIdx) < 0.07;
    }

    function palmHeight() {
        return Math.abs(landmarks[0].y - landmarks[9].y);
    }

    // Determine which fingers are extended
    const indexUp = isFingerExtended(8, 7, 6);
    const middleUp = isFingerExtended(12, 11, 10);
    const ringUp = isFingerExtended(16, 15, 14);
    const pinkyUp = isFingerExtended(20, 19, 18);
    const thumbOut = isThumbExtended();

    const indexCurled = isFingerCurled(8, 7, 6);
    const middleCurled = isFingerCurled(12, 11, 10);
    const ringCurled = isFingerCurled(16, 15, 14);
    const pinkyCurled = isFingerCurled(20, 19, 18);

    const extendedCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
    const curledCount = [indexCurled, middleCurled, ringCurled, pinkyCurled].filter(Boolean).length;

    let letter = null;
    let confidence = 0;

    // ===== ASL Letter Recognition Rules =====
    // These are simplified geometric heuristics for common ASL letters

    // A - Fist with thumb beside (all fingers curled, thumb out to side)
    if (curledCount >= 3 && !indexUp && !middleUp && !ringUp && !pinkyUp && thumbOut) {
        letter = 'A';
        confidence = 0.7 + (curledCount === 4 ? 0.15 : 0);
    }

    // B - All fingers up, thumb across palm
    if (indexUp && middleUp && ringUp && pinkyUp && isThumbAcrossPalm()) {
        letter = 'B';
        confidence = 0.85;
    }

    // C - Curved hand (no fingers fully extended or curled, gap between thumb and index)
    if (!indexUp && !middleUp && !ringUp && !pinkyUp && curledCount < 2) {
        const gap = dist(4, 8);
        if (gap > 0.08 && gap < 0.25 && thumbOut) {
            letter = 'C';
            confidence = 0.65;
        }
    }

    // D - Index up, others touch thumb
    if (indexUp && !middleUp && !ringUp && !pinkyUp && fingersTouchingThumb(12)) {
        letter = 'D';
        confidence = 0.8;
    }

    // E - All fingers curled, thumb tucked
    if (curledCount >= 3 && !thumbOut && !indexUp) {
        if (letter !== 'S') { // disambiguation will handle
            letter = 'E';
            confidence = 0.6;
        }
    }

    // F - Index and thumb make circle, other 3 up
    if (!indexUp && middleUp && ringUp && pinkyUp && fingersTouchingThumb(8)) {
        letter = 'F';
        confidence = 0.8;
    }

    // G - Index and thumb extended pointing sideways (horizontal)
    if (indexUp && !middleUp && !ringUp && !pinkyUp && thumbOut) {
        const indexHorizontal = Math.abs(landmarks[8].y - landmarks[6].y) < 0.06;
        if (indexHorizontal) {
            letter = 'G';
            confidence = 0.7;
        }
    }

    // H - Index and middle extended pointing sideways
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
        const indexHorizontal = Math.abs(landmarks[8].y - landmarks[6].y) < 0.06;
        const middleHorizontal = Math.abs(landmarks[12].y - landmarks[10].y) < 0.06;
        if (indexHorizontal && middleHorizontal) {
            letter = 'H';
            confidence = 0.7;
        }
    }

    // I - Pinky up only
    if (!indexUp && !middleUp && !ringUp && pinkyUp && !thumbOut) {
        letter = 'I';
        confidence = 0.85;
    }

    // K - Index and middle up, spread apart, thumb between
    if (indexUp && middleUp && !ringUp && !pinkyUp && thumbOut) {
        const spread = dist2d(8, 12);
        if (spread > 0.06) {
            letter = 'K';
            confidence = 0.7;
        }
    }

    // L - Index up and thumb extended (L shape)
    if (indexUp && !middleUp && !ringUp && !pinkyUp && thumbOut) {
        const thumbLeft = Math.abs(landmarks[4].x - landmarks[3].x) > 0.04;
        if (thumbLeft && !letter) {
            letter = 'L';
            confidence = 0.8;
        }
    }

    // O - All fingertips touching thumb tip (O shape)
    if (fingersTouchingThumb(8) && fingersTouchingThumb(12) && !indexUp && !middleUp) {
        letter = 'O';
        confidence = 0.7;
    }

    // R - Index and middle crossed/up close together
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
        const close = dist2d(8, 12) < 0.04;
        if (close && !letter) {
            letter = 'R';
            confidence = 0.65;
        }
    }

    // S - Fist with thumb over fingers (all curled, thumb not out)
    if (curledCount >= 3 && !thumbOut && !indexUp) {
        const thumbOverFingers = landmarks[4].y < landmarks[7].y;
        if (thumbOverFingers) {
            letter = 'S';
            confidence = 0.7;
        }
    }

    // U - Index and middle up together, close
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
        const close = dist2d(8, 12) < 0.05;
        const vertical = landmarks[8].y < landmarks[6].y - 0.03;
        if (close && vertical && !letter) {
            letter = 'U';
            confidence = 0.75;
        }
    }

    // V - Index and middle up, spread (peace sign)
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
        const spread = dist2d(8, 12) > 0.06;
        const vertical = landmarks[8].y < landmarks[6].y - 0.03;
        if (spread && vertical && !letter) {
            letter = 'V';
            confidence = 0.85;
        }
    }

    // W - Index, middle, ring up, spread
    if (indexUp && middleUp && ringUp && !pinkyUp) {
        letter = 'W';
        confidence = 0.8;
    }

    // X - Index finger hooked (bent at PIP)
    if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbOut) {
        const indexHooked = landmarks[8].y > landmarks[7].y && landmarks[7].y < landmarks[6].y;
        if (indexHooked) {
            letter = 'X';
            confidence = 0.6;
        }
    }

    // Y - Thumb and pinky out (hang loose)
    if (!indexUp && !middleUp && !ringUp && pinkyUp && thumbOut) {
        letter = 'Y';
        confidence = 0.85;
    }

    // If no letter detected, return null
    if (!letter) {
        return { letter: null, confidence: 0 };
    }

    return { letter, confidence };
}

// ===== Add Letter to Text =====
function addLetterToText(letter) {
    detectedText += letter;
    updateTextDisplay();

    // Auto-speak on word completion (space added)
    if (isAutoSpeak && Date.now() - lastSpeakTime > 2000) {
        speakText(letter);
        lastSpeakTime = Date.now();
    }

    // Visual feedback
    currentLetterEl.style.transform = 'scale(1.2)';
    setTimeout(() => {
        currentLetterEl.style.transform = 'scale(1)';
    }, 200);
}

function updateTextDisplay() {
    if (detectedText.length > 0) {
        textDisplay.innerHTML = `<span>${detectedText}</span><span class="cursor-blink">|</span>`;
        speakBtn.disabled = false;
    } else {
        textDisplay.innerHTML = '<span class="placeholder-text">Start signing to see text appear here...</span>';
        speakBtn.disabled = true;
    }
}

// ===== Event Listeners =====
startCameraBtn.addEventListener('click', startCamera);
learnMoreBtn.addEventListener('click', () => showSection('about'));
stopCameraBtn.addEventListener('click', stopCamera);

toggleSkeletonBtn.addEventListener('click', () => {
    showSkeleton = !showSkeleton;
    toggleSkeletonBtn.classList.toggle('active', showSkeleton);
    showToast(showSkeleton ? 'Skeleton: ON' : 'Skeleton: OFF');
});

flipCameraBtn.addEventListener('click', () => {
    isMirrored = !isMirrored;
    videoEl.style.transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    handCanvas.style.transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    showToast(isMirrored ? 'Mirror: ON' : 'Mirror: OFF');
});

speakBtn.addEventListener('click', () => {
    speakText(detectedText);
    showToast('🔊 Speaking text...');
});

autoSpeakBtn.addEventListener('click', () => {
    isAutoSpeak = !isAutoSpeak;
    autoSpeakStatus.textContent = isAutoSpeak ? 'ON' : 'OFF';
    autoSpeakBtn.classList.toggle('active', isAutoSpeak);
    showToast(isAutoSpeak ? 'Auto-speak enabled' : 'Auto-speak disabled');
});

speechRateInput.addEventListener('input', () => {
    rateValueEl.textContent = parseFloat(speechRateInput.value).toFixed(1) + 'x';
});

copyTextBtn.addEventListener('click', () => {
    if (detectedText) {
        navigator.clipboard.writeText(detectedText).then(() => {
            showToast('📋 Copied to clipboard!');
        });
    }
});

clearTextBtn.addEventListener('click', () => {
    detectedText = '';
    updateTextDisplay();
    currentLetterEl.textContent = '—';
    showToast('Text cleared');
});

addSpaceBtn.addEventListener('click', () => {
    detectedText += ' ';
    updateTextDisplay();
    if (isAutoSpeak) {
        // Speak the last word
        const words = detectedText.trim().split(/\s+/);
        if (words.length > 0) speakText(words[words.length - 1]);
    }
});

addBackspaceBtn.addEventListener('click', () => {
    detectedText = detectedText.slice(0, -1);
    updateTextDisplay();
});

addPeriodBtn.addEventListener('click', () => {
    detectedText += '. ';
    updateTextDisplay();
});

addNewlineBtn.addEventListener('click', () => {
    detectedText += '\n';
    updateTextDisplay();
});

// Navigation
navDetect.addEventListener('click', (e) => { e.preventDefault(); showSection('detect'); });
navGuide.addEventListener('click', (e) => { e.preventDefault(); showSection('guide'); });
navAbout.addEventListener('click', (e) => { e.preventDefault(); showSection('about'); });

// Load voices
speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();

// ===== Cursor blink style =====
const cursorStyle = document.createElement('style');
cursorStyle.textContent = `
    .cursor-blink {
        animation: blink 1s step-end infinite;
        color: var(--accent-purple);
        font-weight: 300;
    }
    @keyframes blink {
        50% { opacity: 0; }
    }
`;
document.head.appendChild(cursorStyle);

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    buildASLGuide();
    toggleSkeletonBtn.classList.add('active');
    speechSynthesis.getVoices(); // preload
});
