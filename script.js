
"use strict";

// HTML ELEMENTS
const cakeArea = document.getElementById("cakeArea");
const instructions = document.getElementById("instructions");
const microphoneButton = document.getElementById("microphoneButton");
const birthdayMessage = document.getElementById("birthdayMessage");
const replayButton = document.getElementById("replayButton");

const canvas = document.getElementById("effects");
const ctx = canvas.getContext("2d");

// SETTINGS
const AGE = 30;

const colors = [
    "#f5d58b",
    "#e8b45f",
    "#ffffff",
    "#c7a56a",
    "#ffe7ae"
];

let candles = [];
let finished = false;

// MICROPHONE
let audioContext = null;
let microphoneStream = null;
let analyser = null;
let microphoneFrame = null;
let loudFrames = 0;
let microphoneActive = false;
let microphoneRequest = 0;

// FIREWORKS
let particles = [];
let animationFrame = null;
let celebrationEnd = 0;

// CREATE THE CAKE
function createCake() {
    stopMicrophone();

    cancelAnimationFrame(animationFrame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = [];

    finished = false;
    candles = [];

    cakeArea.innerHTML = "";
    birthdayMessage.hidden = true;
    replayButton.hidden = true;
    microphoneButton.hidden = false;

    instructions.textContent =
        "Tap the candles or use your microphone!";

    const cake = document.createElement("div");
    cake.className = "cake";

    const candleContainer = document.createElement("div");
    candleContainer.className = "candles";

    for (let i = 0; i < AGE; i++) {
        const candle = document.createElement("button");
        candle.className = "candle";
        candle.type = "button";
        candle.setAttribute(
            "aria-label",
            `Blow out candle ${i + 1}`
        );

        const flame = document.createElement("span");
        flame.className = "flame";

        candle.appendChild(flame);

        candle.addEventListener("click", () => {
            blowOutCandle(candle);
        });

        candleContainer.appendChild(candle);
        candles.push(candle);
    }

    cake.appendChild(candleContainer);
    cakeArea.appendChild(cake);
}

// BLOW OUT ONE CANDLE
function blowOutCandle(candle) {
    if (finished || candle.classList.contains("out")) {
        return;
    }

    candle.classList.add("out");
    candle.disabled = true;

    checkCandles();
}

// CHECK ALL CANDLES
function checkCandles() {
    const allOut = candles.every(candle =>
        candle.classList.contains("out")
    );

    if (allOut && !finished) {
        finished = true;
        showCelebration();
    }
}

// FINAL CELEBRATION
function showCelebration() {
    stopMicrophone();

    microphoneButton.hidden = true;
    birthdayMessage.hidden = false;
    replayButton.hidden = false;

    instructions.textContent =
        "Your wish is on its way! ✨";

    launchCelebration();
}

// MICROPHONE BUTTON
microphoneButton.addEventListener("click", startMicrophone);

async function startMicrophone() {
    if (microphoneActive || finished) {
        return;
    }

    const requestId = ++microphoneRequest;
    microphoneActive = true;
    microphoneButton.disabled = true;
    instructions.textContent = "Allow microphone access...";

    let newStream = null;

    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Microphone is not available");
        }

        newStream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        if (requestId !== microphoneRequest || finished) {
            newStream.getTracks().forEach(track => track.stop());
            return;
        }

        microphoneStream = newStream;
        audioContext = new AudioContext();

        await audioContext.resume();

        if (requestId !== microphoneRequest || finished) {
            stopMicrophone();
            return;
        }

        const source =
            audioContext.createMediaStreamSource(microphoneStream);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;

        source.connect(analyser);

        const data = new Float32Array(analyser.fftSize);

        loudFrames = 0;
        instructions.textContent =
            "Make a wish and blow into your microphone! 💨";

        function listen() {
            if (!microphoneActive || finished) {
                return;
            }

            analyser.getFloatTimeDomainData(data);

            let sum = 0;

            for (const sample of data) {
                sum += sample * sample;
            }

            const volume = Math.sqrt(sum / data.length);

            if (volume > 0.12) {
                loudFrames++;
            } else {
                loudFrames = 0;
            }

            if (loudFrames >= 3) {
                candles.forEach(candle => {
                    blowOutCandle(candle);
                });

                stopMicrophone();
                return;
            }

            microphoneFrame = requestAnimationFrame(listen);
        }

        listen();

    } catch (error) {
        console.error("Microphone error:", error);

        if (newStream && newStream !== microphoneStream) {
            newStream.getTracks().forEach(track => track.stop());
        }

        if (requestId === microphoneRequest) {
            stopMicrophone();
            instructions.textContent =
                "Microphone unavailable. Tap the candles instead!";
        }
    }
}

// STOP MICROPHONE
function stopMicrophone() {
    microphoneRequest++;
    microphoneActive = false;

    cancelAnimationFrame(microphoneFrame);

    if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => {
            track.stop();
        });
        microphoneStream = null;
    }

    if (audioContext) {
        audioContext.close().catch(() => {});
        audioContext = null;
    }

    analyser = null;
    loudFrames = 0;
    microphoneButton.disabled = false;
}

// CANVAS SIZE
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// CREATE FIREWORK BURST
function createBurst(x, y, count = 100) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;

        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 5,
            color: colors[
                Math.floor(Math.random() * colors.length)
            ],
            life: 100,
            rotation: Math.random() * Math.PI
        });
    }
}

// START THE CELEBRATION
function launchCelebration() {
    cancelAnimationFrame(animationFrame);

    particles = [];

    createBurst(
        canvas.width * 0.2,
        canvas.height * 0.3
    );

    createBurst(
        canvas.width * 0.8,
        canvas.height * 0.25
    );

    createBurst(
        canvas.width * 0.5,
        canvas.height * 0.15,
        140
    );

    celebrationEnd = performance.now() + 6000;

    animateParticles();
}

// ANIMATE FIREWORKS AND CONFETTI
function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        particle.vy += 0.08;
        particle.vx *= 0.99;

        particle.life--;

        ctx.globalAlpha =
            Math.max(0, particle.life / 100);

        ctx.fillStyle = particle.color;

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);

        ctx.fillRect(
            -particle.size / 2,
            -particle.size / 2,
            particle.size,
            particle.size * 1.8
        );

        ctx.restore();
    });

    ctx.globalAlpha = 1;

    particles = particles.filter(particle =>
        particle.life > 0
    );

    if (
        performance.now() < celebrationEnd &&
        Math.random() < 0.08
    ) {
        createBurst(
            Math.random() * canvas.width,
            Math.random() * canvas.height * 0.5,
            40
        );
    }

    if (
        particles.length > 0 ||
        performance.now() < celebrationEnd
    ) {
        animationFrame =
            requestAnimationFrame(animateParticles);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// REPLAY BUTTON
replayButton.addEventListener("click", createCake);

// INITIALIZE
createCake();
