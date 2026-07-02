// ============================================================
// CONFIG RONDE — 9 kartu (8 kucing + 1 pocong)
// ============================================================
const ROUNDS = [
    { instruction: "Ronde 1 — Buka semua 8 kartu kucing! Jangan kena Pocong!", catsToFind: 8 },
    { instruction: "Ronde 2 — Makin seru! Temukan semua 8 kucing lagi!", catsToFind: 8 },
    { instruction: "Ronde 3 — Final round! Buktikan kamu bisa selamat dari Pocong!", catsToFind: 8 },
];

const TOTAL_CARDS = 9; // 3x3 grid
const CAT_SRC         = "kucing.png";
const CAT_FALLBACK    = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&q=80";
const BOMB_SRC        = "pocong.jpg";

// ============================================================
// STATE
// ============================================================
let round        = 0;
let found        = 0;
let boardState   = [];
let gameActive   = false;
let musicPlaying = false;
let scareCallback = null;

// ============================================================
// DOM REFS
// ============================================================
const boardEl        = document.getElementById('game-board');
const roundDisplay   = document.getElementById('round-display');
const instructionEl  = document.getElementById('instruction-text');
const progressFill   = document.getElementById('progress-fill');
const progressLabel  = document.getElementById('progress-label');
const glitchFlash    = document.getElementById('glitch-flash');
const jumpscareEl    = document.getElementById('jumpscare');
const modalOverlay   = document.getElementById('modal-overlay');
const modalIcon      = document.getElementById('modal-icon');
const modalTitle     = document.getElementById('modal-title');
const modalMessage   = document.getElementById('modal-message');
const modalBtnText   = document.getElementById('modal-btn-text');
const bgm            = document.getElementById('bgm');
const scareSfx       = document.getElementById('scare-sfx');
const musicBtn       = document.getElementById('music-btn');
const musicIconEl    = document.getElementById('music-icon');
const musicLabel     = document.getElementById('music-label');

// ============================================================
// PARTICLES
// ============================================================
function spawnParticles() {
    const container = document.getElementById('particles');
    const colors = ['#f472b6','#ec4899','#db2777','#a78bfa','#fbcfe8','#fce7f3'];
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 10 + 4;
        p.style.cssText = `
            width:${size}px; height:${size}px;
            left:${Math.random()*100}%;
            background:${colors[Math.floor(Math.random()*colors.length)]};
            animation-duration:${Math.random()*12+8}s;
            animation-delay:${Math.random()*8}s;
        `;
        container.appendChild(p);
    }
}

// ============================================================
// MUSIC TOGGLE
// ============================================================
function toggleMusic() {
    if (!musicPlaying) {
        bgm.volume = 0.45;
        bgm.play().then(() => {
            musicPlaying = true;
            musicBtn.classList.add('playing');
            musicLabel.textContent = 'Pause BGM';
            musicIconEl.className = 'fa-solid fa-compact-disc';
        }).catch(() => {
            alert('Gagal memutar BGM. Pastikan file bgm.mp3 ada di folder bomb-game.');
        });
    } else {
        bgm.pause();
        musicPlaying = false;
        musicBtn.classList.remove('playing');
        musicLabel.textContent = 'Play BGM';
        musicIconEl.className = 'fa-solid fa-music';
    }
}

// ============================================================
// GAME INIT
// ============================================================
function initGame() {
    round = 0;
    startRound();
}

function startRound() {
    const cfg = ROUNDS[round];
    found = 0;
    gameActive = true;

    roundDisplay.textContent = `${round + 1} / ${ROUNDS.length}`;
    instructionEl.textContent = cfg.instruction;
    updateProgress();
    modalOverlay.classList.add('hidden');
    jumpscareEl.classList.add('hidden');
    glitchFlash.classList.add('hidden');

    // Build board: 8 cats + 1 bomb
    boardState = Array(TOTAL_CARDS).fill('cat');
    boardState[0] = 'bomb';
    boardState.sort(() => Math.random() - 0.5);

    // Render cards
    boardEl.innerHTML = '';
    boardState.forEach((type, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'card-wrap';

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        // Front face
        const front = document.createElement('div');
        front.className = 'card-front';
        front.innerHTML = `<i class="fa-solid fa-paw"></i>`;

        // Back face
        const back = document.createElement('div');
        if (type === 'cat') {
            back.className = 'card-back is-cat';
            back.innerHTML = `<img src="${CAT_SRC}" onerror="this.onerror=null;this.src='${CAT_FALLBACK}';" alt="Kucing">`;
        } else {
            back.className = 'card-back is-bomb';
            back.innerHTML = `<img src="${BOMB_SRC}" alt="Pocong">`;
        }

        inner.appendChild(front);
        inner.appendChild(back);
        wrap.appendChild(inner);

        // Click handler
        wrap.addEventListener('click', () => flipCard(i, wrap));
        boardEl.appendChild(wrap);
    });
}

// ============================================================
// FLIP CARD — kartu tetap terbuka setelah diklik
// ============================================================
function flipCard(index, wrap) {
    // Abaikan jika sudah terbuka atau game tidak aktif
    if (!gameActive || wrap.classList.contains('flipped') || wrap.classList.contains('no-click')) return;

    // Flip kartu (tetap di tempatnya, tidak hilang)
    wrap.classList.add('flipped');

    const type = boardState[index];

    if (type === 'cat') {
        wrap.classList.add('cat-found');
        found++;
        updateProgress();

        if (found >= ROUNDS[round].catsToFind) {
            gameActive = false;
            setTimeout(winRound, 600);
        }
    } else {
        // BOMB! — glitch + jumpscare
        gameActive = false;
        wrap.classList.add('bomb-glitch');

        setTimeout(() => {
            triggerGlitchAndScare(() => {
                // Setelah jumpscare ditutup user, tampilkan modal
                showModal(
                    'ghost-mode',
                    'fa-ghost',
                    'Kena Pocong!! 👻',
                    `Hiii seram! Kamu menemukan Pocong di ronde ${round + 1}. Coba lagi dari ronde ini!`,
                    'Coba Lagi',
                    () => startRound()
                );
            });
        }, 400);
    }
}

// ============================================================
// WIN ROUND
// ============================================================
function winRound() {
    round++;
    if (round < ROUNDS.length) {
        showModal(
            '',
            'fa-cat',
            'Semua Kucing Ketemu! 🐱',
            `Hebat! Kamu selamat dari Pocong di ronde ${round}! Siap ke ronde ${round + 1}?`,
            'Ronde Berikutnya',
            () => startRound()
        );
    } else {
        showModal(
            'trophy-mode',
            'fa-trophy',
            'MENANG TOTAL! 🏆',
            'Kamu berhasil melewati semua 3 ronde dan selamat dari Pocong! Kamu juara!',
            'Main Lagi',
            () => initGame()
        );
    }
}

// ============================================================
// GLITCH FLASH → JUMPSCARE
// ============================================================
function triggerGlitchAndScare(callback) {
    scareCallback = callback;

    // Pause bgm sementara
    if (musicPlaying) bgm.pause();

    // Step 1: Flash glitch merah
    glitchFlash.classList.remove('hidden');
    // Reset animation
    glitchFlash.style.animation = 'none';
    glitchFlash.offsetHeight; // reflow
    glitchFlash.style.animation = '';

    // Step 2: Setelah flash selesai (~600ms), tampilkan jumpscare
    setTimeout(() => {
        glitchFlash.classList.add('hidden');

        // Putar suara kuntilanak
        scareSfx.pause();
        scareSfx.currentTime = 0;
        scareSfx.volume = 1;
        scareSfx.play().catch(() => {});

        // Tampilkan jumpscare
        jumpscareEl.classList.remove('hidden');
    }, 600);
}

// ============================================================
// CLOSE JUMPSCARE (dipanggil dari tombol "Tutup & Lanjut")
// ============================================================
function closeScare() {
    // Hentikan suara kuntilanak
    scareSfx.pause();
    scareSfx.currentTime = 0;

    // Sembunyikan jumpscare
    jumpscareEl.classList.add('hidden');

    // Resume bgm jika sebelumnya aktif
    if (musicPlaying) bgm.play().catch(() => {});

    // Jalankan callback (tampilkan modal)
    if (scareCallback) {
        scareCallback();
        scareCallback = null;
    }
}

// ============================================================
// PROGRESS
// ============================================================
function updateProgress() {
    const total = ROUNDS[round]?.catsToFind ?? 8;
    const pct = (found / total) * 100;
    progressFill.style.width = pct + '%';
    progressLabel.textContent = `${found} / ${total} Kucing ditemukan`;
}

// ============================================================
// MODAL
// ============================================================
let _nextAction = null;

function showModal(iconMode, iconClass, title, msg, btnLabel, action) {
    modalIcon.className = 'modal-icon ' + iconMode;
    modalIcon.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    modalTitle.textContent = title;
    modalMessage.textContent = msg;
    modalBtnText.textContent = btnLabel;
    _nextAction = action;
    modalOverlay.classList.remove('hidden');
}

function nextAction() {
    modalOverlay.classList.add('hidden');
    if (_nextAction) _nextAction();
}

// ============================================================
// BOOT
// ============================================================
spawnParticles();
initGame();
