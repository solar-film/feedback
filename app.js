// Goodfilm Care Quest - Core Application Logic (High Fidelity UI matching mockups)

const SoundFX = {
    ctx: null,
    enabled: true,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playClick() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);
    },

    playSuccess() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.frequency.setValueAtTime(freq, now + (idx * 0.08));
            gain.gain.setValueAtTime(0.12, now + (idx * 0.08));
            gain.gain.exponentialRampToValueAtTime(0.01, now + (idx * 0.08) + 0.2);

            osc.start(now + (idx * 0.08));
            osc.stop(now + (idx * 0.08) + 0.25);
        });
    },

    playLevelUp() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [587.33, 783.99, 1174.66]; // D5 -> G5 -> D6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + (idx * 0.08));
            gain.gain.setValueAtTime(0.15, now + (idx * 0.08));
            gain.gain.exponentialRampToValueAtTime(0.01, now + (idx * 0.08) + 0.25);
            
            osc.start(now + (idx * 0.08));
            osc.stop(now + (idx * 0.08) + 0.35);
        });
    }
};

// Canvas Confetti
const Confetti = {
    canvas: null,
    ctx: null,
    particles: [],
    animationId: null,

    init() {
        this.canvas = document.getElementById('confetti-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    },

    createParticle() {
        const colors = ['#1b437c', '#005eb8', '#ffd700', '#38a169', '#e53e3e', '#e2e8f0'];
        return {
            x: Math.random() * this.canvas.width,
            y: -10 - Math.random() * 20,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedX: Math.random() * 4 - 2,
            speedY: Math.random() * 5 + 3,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 8 - 4
        };
    },

    start() {
        this.init();
        this.particles = [];
        for (let i = 0; i < 120; i++) {
            this.particles.push(this.createParticle());
        }
        
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.loop();
    },

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        let alive = false;
        this.particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;

            if (p.y < this.canvas.height) {
                alive = true;
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.rotation * Math.PI / 180);
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                this.ctx.restore();
            }
        });

        if (alive) {
            this.animationId = requestAnimationFrame(() => this.loop());
        } else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
};

// Application State
const state = {
    currentScreen: 'screen-intro',
    historyStack: [],
    activeAccordion: 'admin', // admin, sales, tech
    formData: {
        // Customer Info
        name: '',
        phone: '',
        siteType: '',
        installDate: '',
        filmModel: '',
        
        // Film Result
        benefits: [],
        
        // Team Feedback
        ratings: {
            admin: 0,
            sales: 0,
            tech: 0
        },
        feedbackDetails: {
            admin: [],
            sales: [],
            tech: []
        },
        feedbackComments: {
            admin: '',
            sales: '',
            tech: ''
        },
        mvp: '',
        mvpComment: '',
        
        // Overall
        overallMood: '', // 😍, 😊, 😐, 😟, 🚨
        supportNeeds: [],
        supportDetails: '',
        googleMapsVisited: false
    }
};

// Initial Mock Database
const MOCK_SUBMISSIONS = [
    {
        id: "GF-8821",
        timestamp: "2026-07-08T10:14:00Z",
        name: "สมชาย ยินดี",
        phone: "0812345678",
        siteType: "บ้าน",
        installDate: "2026-07-05",
        filmModel: "3M Ceramic Ultra Clear",
        benefits: ["ห้องเย็นขึ้น", "แสงจ้าลดลง", "ใช้งานพื้นที่สบายขึ้น"],
        ratings: { admin: 5, sales: 5, tech: 5 },
        feedbackDetails: {
            admin: ["ตอบกลับไว", "พูดคุยสุภาพ"],
            sales: ["แนะนำรุ่นฟิล์มเหมาะสม", "ไม่กดดันการขาย"],
            tech: ["เข้างานตรงเวลา", "ติดตั้งเรียบร้อย", "เก็บงานสะอาด"]
        },
        mvp: "tech",
        mvpComment: "ทีมช่างทำงานประณีตมากครับ ไม่มีฟองอากาศหรือฝุ่นเลย ประทับใจมาก",
        overall: {
            overallMood: "😍",
            needFollowUp: "No",
            followUpIssue: [],
            followUpDetails: "",
            googleReviewClicked: "Yes",
            rewardEligible: "Yes",
            submittedDate: "2026-07-08T10:15:00Z"
        }
    },
    {
        id: "GF-8822",
        timestamp: "2026-07-09T09:05:00Z",
        name: "พงศธร รักษ์สุข",
        phone: "0865554321",
        siteType: "คอนโด",
        installDate: "2026-07-03",
        filmModel: "กระจกห้องนั่งเล่น ทาวน์โฮม",
        benefits: ["ห้องเย็นขึ้น", "ความเป็นส่วนตัวดีขึ้น"],
        ratings: { admin: 3, sales: 3, tech: 2 },
        feedbackDetails: {
            admin: ["ติดต่อยาก"],
            sales: ["สับสนรุ่นฟิล์ม"],
            tech: ["ฝุ่นเยอะ/มีจุดฟองน้ำ"]
        },
        mvp: "none",
        mvpComment: "",
        overall: {
            overallMood: "😐",
            needFollowUp: "Yes",
            followUpIssue: ["อยากให้ตรวจเช็กงานบางจุด"],
            followUpDetails: "มีจุดฝุ่นและฟองอากาศตรงขอบล่างหลายบาน อยากให้ช่างเข้ามาช่วยเช็คงานอีกรอบครับ",
            googleReviewClicked: "No",
            rewardEligible: "Yes",
            submittedDate: "2026-07-09T09:06:30Z"
        }
    }
];

// Document Load Init
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    // Seed local database
    if (!localStorage.getItem('goodfilm_submissions_v2')) {
        localStorage.setItem('goodfilm_submissions_v2', JSON.stringify(MOCK_SUBMISSIONS));
    }

    // Clear previously seeded    // Apply fallback logic just in case localstorage logic fails
    const cachedUrl = localStorage.getItem('google_sheets_apps_script_url');
    if (cachedUrl === 'https://script.google.com/macros/s/AKfycbzC9Os3IHKXZQ-epBWilu-k3gaAL8eqZamHN1IH-4svZ5TGxNwo8GeuXPykvV8h4SpNLQ/exec' ||
        cachedUrl === 'https://script.google.com/macros/s/AKfycbxnEtoNpkucS_9L2NPide8tRPF66xK4PKWz0hkzLvbJ8tXyfEsl_nVBiDOOX1bu-qj5qg/exec') {
        localStorage.removeItem('google_sheets_apps_script_url');
    }



    // Date picker initial limit
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('install-date').setAttribute('max', today);
    document.getElementById('install-date').value = today;

    // Add inputs validators
    attachFormValidators();
    setupSoundToggle();
    updateDashboardStats();
    
    // Parse URL parameters for pre-filling contact info
    parseUrlParameters();
    
    // Set default screen
    changeScreen('screen-intro');
});

function setupSoundToggle() {
    const btn = document.getElementById('sound-toggle');
    btn.addEventListener('click', () => {
        SoundFX.enabled = !SoundFX.enabled;
        if (SoundFX.enabled) {
            btn.innerHTML = '<i data-lucide="volume-2"></i>';
            btn.style.color = 'var(--primary)';
        } else {
            btn.innerHTML = '<i data-lucide="volume-x"></i>';
            btn.style.color = 'var(--text-muted)';
        }
        lucide.createIcons();
    });
}

function attachFormValidators() {
    // Form inputs removed
}

function parseUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const name = params.get('name');
    const phone = params.get('phone');
    const siteType = params.get('siteType');
    const installDate = params.get('installDate');
    const filmModel = params.get('filmModel');

    // Always store the ID from URL if provided
    if (id) {
        state.formData.id = id;
    }

    // Handle short URL by fetching customer details from Google Sheets tab 'Data'
    if (id) {
        const sheetsUrl = 'https://script.google.com/macros/s/AKfycbyhrQWxU2tQenMMoV1OaWZUKbDdPhrDIDl_T5XMHMFBIbFtIrVBZiwmFVfUP98-fpmKlw/exec';

        const loader = document.getElementById('loading-overlay');
        loader.style.display = 'flex';

        fetch(`${sheetsUrl}?action=getCustomer&id=${encodeURIComponent(id)}`)
            .then(res => res.json())
            .then(data => {
                loader.style.display = 'none';
                if (data.status === 'success' && data.data) {
                    const c = data.data;
                    state.formData.id = c.id || id;
                    if (c.name) state.formData.name = c.name;
                    if (c.phone) state.formData.phone = c.phone;
                    if (c.siteType) state.formData.siteType = c.siteType;
                    if (c.installDate) state.formData.installDate = c.installDate;
                    if (c.filmModel) state.formData.filmModel = c.filmModel;
                    
                    const reviewLinkElem = document.getElementById('google-review-link');
                    if (reviewLinkElem) {
                        if (c.company === 'MHL') {
                            reviewLinkElem.href = 'https://g.page/r/CRkVPWjmECaEEAI/review';
                        } else {
                            reviewLinkElem.href = 'https://g.page/r/CXyrHfNQMLB8EAI/review';
                        }
                    }
                } else {
                    alert('❌ ไม่พบรหัสลูกค้านี้ในฐานข้อมูลชีต Data ค่ะ');
                }
            })
            .catch(err => {
                loader.style.display = 'none';
                console.error('Error fetching customer details:', err);
                alert('❌ เกิดข้อผิดพลาดในการดึงข้อมูลจากระบบ Google Sheet: ' + err.message);
            });
        return;
    }

    if (name) state.formData.name = name.trim();
    if (phone) state.formData.phone = phone.trim();
    if (siteType) state.formData.siteType = siteType;
    if (installDate) state.formData.installDate = installDate;
    if (filmModel) state.formData.filmModel = filmModel.trim();
}

// Request Full Screen Helper
function requestFullScreen() {
    const doc = window.document;
    const docEl = doc.documentElement;

    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    
    if(requestFullScreen && !doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        requestFullScreen.call(docEl).catch(err => {
            console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    }
}

function startQuest() {
    SoundFX.playClick();
    requestFullScreen();
    state.historyStack.push('screen-intro');
    changeScreen('screen-m2'); // Skip directly to film results
}

// Quick select chips logic inside Mission 1 form
function selectQuickChip(val, node) {
    SoundFX.playClick();
    
    // Highlight chip
    const chipsGrid = node.parentNode;
    chipsGrid.querySelectorAll('.quick-chip').forEach(c => c.classList.remove('selected'));
    node.classList.add('selected');
    
    // Set select dropdown value
    const select = document.getElementById('site-type');
    select.value = val;
    
    validateM1();
}

function validateM1() {
    // Deprecated
}

// Manage Step Transitions
function changeScreen(screenId) {
    SoundFX.playClick();
    
    // Toggle active screen
    document.querySelectorAll('.game-screen').forEach(scr => scr.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    state.currentScreen = screenId;
    
    // Configure header / progress bar fills
    const progressSection = document.getElementById('progress-section');
    const footerNav = document.getElementById('footer-nav');
    const fill = document.getElementById('progress-fill');
    const stepText = document.getElementById('progress-step-text');
    const descText = document.getElementById('progress-desc-text');

    const header = document.querySelector('.app-header');
    if (screenId === 'screen-intro' || screenId === 'screen-thankyou') {
        header.style.display = 'none';
        progressSection.style.display = 'none';
        footerNav.style.display = 'none';
    } else {
        header.style.display = 'block';
        document.getElementById('btn-next').style.display = 'flex';
        
        if (screenId === 'screen-m2' || screenId.startsWith('screen-m3') || screenId === 'screen-m4' || screenId === 'screen-m5') {
            progressSection.style.display = 'none';
        } else {
            progressSection.style.display = 'flex';
        }
        
        footerNav.style.display = 'flex';
        document.querySelector('.app-container').scrollTop = 0;
    }

    // Layout values
    switch(screenId) {
        case 'screen-m1':
            // Removed
            break;
            
        case 'screen-m2':
            fill.style.width = '40%';
            stepText.innerText = 'MISSION 2 / 5';
            descText.innerText = 'หลังติดตั้งแล้ว ฟิล์มช่วยเรื่องไหนได้บ้าง?';
            document.getElementById('btn-back').style.display = 'block';
            validateM2();
            break;
            
        case 'screen-m3':
            fill.style.width = '45%';
            document.getElementById('btn-next').style.display = 'none';
            break;
        case 'screen-m3-admin':
            fill.style.width = '50%';
            stepText.innerText = 'MISSION 3 / 5';
            descText.innerText = 'ด่านต้อนรับ ดูแลคุณดีแค่ไหน?';
            document.getElementById('btn-back').style.display = 'block';
            validateM3Step('admin');
            break;
            
        case 'screen-m3-sales':
            fill.style.width = '60%';
            stepText.innerText = 'MISSION 3 / 5';
            descText.innerText = 'ด่านเลือกฟิล์ม การแนะนำถูกใจไหม?';
            document.getElementById('btn-back').style.display = 'block';
            validateM3Step('sales');
            break;
            
        case 'screen-m3-tech':
            fill.style.width = '70%';
            stepText.innerText = 'MISSION 3 / 5';
            descText.innerText = 'ด่านหน้างาน การติดตั้งและเตรียมพร้อม';
            document.getElementById('btn-back').style.display = 'block';
            validateM3Step('tech');
            break;
            
        case 'screen-m4':
            fill.style.width = '80%';
            stepText.innerText = 'MISSION 4 / 5';
            descText.innerText = 'ทีมไหนคือ MVP ในงานนี้?';
            document.getElementById('btn-back').style.display = 'block';
            validateM4();
            break;
            
        case 'screen-m5':
            fill.style.width = '100%';
            stepText.innerText = 'MISSION 5 / 5';
            descText.innerText = 'ตอนนี้คุณรู้สึกกับผลงานติดตั้งอยู่ใน Mood ไหน?';
            document.getElementById('btn-back').style.display = 'block';
            
            // Step 5 submit survey handles navigation inside cards
            document.getElementById('btn-next').style.display = 'none';
            validateM5();
            break;
    }
}

// Next Step
function nextStep() {
    if (state.currentScreen === 'screen-m2') {
        state.historyStack.push('screen-m2');
        changeScreen('screen-m3');
    } else if (state.currentScreen === 'screen-m3-admin') {
        state.historyStack.push('screen-m3-admin');
        changeScreen('screen-m3-sales');
    } else if (state.currentScreen === 'screen-m3-sales') {
        state.historyStack.push('screen-m3-sales');
        changeScreen('screen-m3-tech');
    } else if (state.currentScreen === 'screen-m3-tech') {
        state.historyStack.push('screen-m3-tech');
        changeScreen('screen-m4');
    } else if (state.currentScreen === 'screen-m4') {
        state.historyStack.push('screen-m4');
        changeScreen('screen-m5');
    }
}

// Back Step
function prevStep() {
    if (state.historyStack.length > 0) {
        const prev = state.historyStack.pop();
        changeScreen(prev);
    }
}

// Mission 2: Toggle film benefits selection
function toggleChip(card, key) {
    SoundFX.playClick();
    card.classList.toggle('selected');
    
    const chipText = card.querySelector('.chip-text').innerText;
    const index = state.formData.benefits.indexOf(chipText);
    
    if (index > -1) {
        state.formData.benefits.splice(index, 1);
    } else {
        state.formData.benefits.push(chipText);
    }
    
    validateM2();
}

function validateM2() {
    const isValid = state.formData.benefits.length > 0;
    document.getElementById('btn-next').disabled = !isValid;
    
    const banner = document.getElementById('unlock-banner-m2');
    const promptBanner = document.getElementById('prompt-banner-m2');
    if (isValid) {
        if (banner.style.display !== 'block') {
            SoundFX.playLevelUp();
        }
        banner.style.display = 'block';
        if(promptBanner) promptBanner.style.display = 'none';
    } else {
        banner.style.display = 'none';
        if(promptBanner) promptBanner.style.display = 'block';
    }
}

// Mission 3: Touchpoints lists
function openAccordionStep(step) {
    state.activeAccordion = step;
    state.historyStack.push('screen-m3');
    changeScreen('screen-m3-details');
}

// Collapsible UI trigger for accordion details
function toggleAccordionUI(step) {
    SoundFX.playClick();
    state.activeAccordion = step;
    
    const sections = ['admin', 'sales', 'tech'];
    sections.forEach(s => {
        const card = document.getElementById(`acc-card-${s}`);
        const header = card.querySelector('.tp-acc-header');
        const content = card.querySelector('.tp-acc-content');
        const icon = header.querySelector('[data-lucide]');
        
        if (s === step) {
            content.style.display = 'block';
            header.classList.add('active');
            header.innerHTML = header.innerHTML.replace('chevron-right', 'chevron-down');
        } else {
            content.style.display = 'none';
            header.classList.remove('active');
            header.innerHTML = header.innerHTML.replace('chevron-down', 'chevron-right');
        }
    });
    lucide.createIcons();
    validateM3Step(section);
}

// Select Emoji Mood in touchpoints sub-accordion card
function selectSubMood(section, score, node) {
    SoundFX.playClick();
    
    const btnRow = node.parentNode;
    btnRow.querySelectorAll('.emoji-rating-btn').forEach(b => b.classList.remove('selected'));
    node.classList.add('selected');
    
    state.formData.ratings[section] = score;

    // Toggle corresponding sub-chips
    const good = document.getElementById(`acc-good-${section}`);
    const bad = document.getElementById(`acc-bad-${section}`);
    
    good.querySelectorAll('.mini-chip').forEach(c => c.classList.remove('selected'));
    bad.querySelectorAll('.mini-chip').forEach(c => c.classList.remove('selected'));
    state.formData.feedbackDetails[section] = [];

    if (score >= 4) {
        good.style.display = 'block';
        bad.style.display = 'none';
    } else {
        good.style.display = 'none';
        bad.style.display = 'block';
    }

    validateM3Step(section);
}

function toggleMiniChip(chip, section, text) {
    SoundFX.playClick();
    chip.classList.toggle('selected');
    
    const index = state.formData.feedbackDetails[section].indexOf(text);
    if (index > -1) {
        state.formData.feedbackDetails[section].splice(index, 1);
    } else {
        state.formData.feedbackDetails[section].push(text);
    }
}







// Mission 4: Select MVP

// Validate touchpoints step Next/Back buttons
function validateM3Step(section) {
    const score = state.formData.ratings[section];
    document.getElementById('btn-next').disabled = score === 0;
}
function selectMVP(team, node) {
    SoundFX.playClick();
    
    const grid = node.parentNode;
    grid.querySelectorAll('.mvp-option-card').forEach(c => c.classList.remove('selected'));
    node.classList.add('selected');
    
    state.formData.mvp = team;
    validateM4();
}

function validateM4() {
    const isValid = state.formData.mvp !== '';
    document.getElementById('btn-next').disabled = !isValid;
}

// Mission 5: Overall Mood
function selectOverallMood(moodKey, node) {
    SoundFX.playClick();
    
    const list = node.parentNode;
    list.querySelectorAll('.horizontal-mood-card, .img-overlay-m5').forEach(c => c.classList.remove('selected'));
    node.classList.add('selected');
    
    let moodChar = '😐';
    if (moodKey === 'happy_max') moodChar = '😍';
    else if (moodKey === 'happy_mid') moodChar = '😊';
    else if (moodKey === 'unhappy') moodChar = '😟';
    else if (moodKey === 'danger_alert') moodChar = '🚨';
    
    state.formData.overallMood = moodChar;

    const supportBox = document.getElementById('care-mission-support');

    if (moodKey === 'happy_max' || moodKey === 'happy_mid') {
        supportBox.style.display = 'none';
        supportBox.querySelectorAll('.chip-option').forEach(c => c.classList.remove('selected'));
        state.formData.supportNeeds = [];
        document.getElementById('support-details').value = '';
    } else {
        supportBox.style.display = 'block';
        
        // Hide "Thank you" text for normal mood
        const thankYouText = document.getElementById('care-mission-thankyou');
        if (thankYouText) {
            thankYouText.style.display = (moodKey === 'normal') ? 'none' : 'block';
        }
    }

    validateM5();
}

function toggleSupportChip(card, key) {
    SoundFX.playClick();
    card.classList.toggle('selected');
    
    const text = card.querySelector('.chip-text').innerText;
    const index = state.formData.supportNeeds.indexOf(text);
    
    if (index > -1) {
        state.formData.supportNeeds.splice(index, 1);
    } else {
        state.formData.supportNeeds.push(text);
    }
}

function validateM5() {
    const isValid = state.formData.overallMood !== '';
    document.getElementById('btn-submit-survey').disabled = !isValid;
}

// Reviews handling
function clickGoogleMaps() {
    state.formData.googleMapsVisited = true;
}

function hideReviewBanner() {
    SoundFX.playClick();
    document.getElementById('thankyou-review-banner').style.display = 'none';
}

function skipGoogleMaps() {
    SoundFX.playClick();
}

// SUBMIT SURVEY AND INTEGRATIONS
function submitSurvey() {
    // Read textareas
    state.formData.mvpComment = document.getElementById('mvp-comment').value.trim();
    state.formData.supportDetails = document.getElementById('support-details').value.trim();
    
    // Save comments per accordion step
    state.formData.feedbackComments.admin = document.getElementById('comment-admin').value.trim();
    state.formData.feedbackComments.sales = document.getElementById('comment-sales').value.trim();
    state.formData.feedbackComments.tech = document.getElementById('comment-tech').value.trim();

    const isHappy = state.formData.overallMood === '😍' || state.formData.overallMood === '😊';
    
    const urlParams = new URLSearchParams(window.location.search);
    const fallbackId = urlParams.get('id') || state.formData.id || "-";
    
    // Setup payload structure
    const submission = {
        id: fallbackId,
        timestamp: new Date().toISOString(),
        
        // Customer Info (Not saved to sheet, fetched from Data sheet)
        customerInfo: {
            name: "",
            phone: "",
            siteType: "",
            installDate: "",
            filmModel: ""
        },
        
        // Film Result
        filmResult: [...state.formData.benefits],
        
        // Team Feedback
        teamFeedback: {
            adminScore: state.formData.ratings.admin,
            adminTags: [...state.formData.feedbackDetails.admin],
            salesScore: state.formData.ratings.sales,
            salesTags: [...state.formData.feedbackDetails.sales],
            technicianScore: state.formData.ratings.tech,
            technicianTags: [...state.formData.feedbackDetails.tech],
            mvpTeam: state.formData.mvp,
            customerComment: state.formData.mvpComment
        },
        
        // Overall
        overall: {
            overallMood: state.formData.overallMood,
            needFollowUp: isHappy ? 'No' : 'Yes',
            followUpIssue: [...state.formData.supportNeeds],
            followUpDetails: state.formData.supportDetails,
            googleReviewClicked: state.formData.googleMapsVisited ? 'Yes' : 'No',
            rewardEligible: 'Yes',
            submittedDate: new Date().toISOString()
        }
    };

    // Save to LocalStorage
    const list = JSON.parse(localStorage.getItem('goodfilm_submissions_v2') || '[]');
    list.unshift(submission);
    localStorage.setItem('goodfilm_submissions_v2', JSON.stringify(list));

    // Update Dashboard modal stats
    updateDashboardStats();

    // Toggle optional review card and reward on success page
    const happyPathContent = document.getElementById('happy-path-content');
    const unhappyPathContent = document.getElementById('unhappy-path-content');
    const tyHeader = document.getElementById('thankyou-header');
    const tyButtons = document.getElementById('thankyou-buttons');
    const tyTitle = document.getElementById('thankyou-title');
    const tyDesc = document.getElementById('thankyou-desc');
    const tyIconBox = document.getElementById('thankyou-icon-box');

    if (isHappy) {
        tyHeader.style.display = 'none';
        tyButtons.style.display = 'none';
        happyPathContent.style.display = 'block';
        unhappyPathContent.style.display = 'none';
    } else {
        tyHeader.style.display = 'none';
        tyButtons.style.display = 'none';
        happyPathContent.style.display = 'none';
        unhappyPathContent.style.display = 'block';
    }

    // Google Sheets apps script fetch integration
    const sheetsUrl = 'https://script.google.com/macros/s/AKfycbyhrQWxU2tQenMMoV1OaWZUKbDdPhrDIDl_T5XMHMFBIbFtIrVBZiwmFVfUP98-fpmKlw/exec';
    const submitBtn = document.getElementById('btn-submit-survey');
    
    if (sheetsUrl) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span style="display:inline-flex; align-items:center; gap:8px;"><i data-lucide="loader" class="spin-icon" style="animation: spin 1.2s linear infinite;"></i> กำลังบันทึกข้อมูล...</span>';
        lucide.createIcons();

        fetch(sheetsUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submission)
        })
        .then(() => {
            console.log('Submitted to Google Sheets successfully');
            changeScreen('screen-thankyou');
        })
        .catch(err => {
            console.error('Error submitting to Google Sheets:', err);
            changeScreen('screen-thankyou');
        });
    } else {
        changeScreen('screen-thankyou');
    }
}

// DASHBOARD MODALS
function openDashboard() {
    SoundFX.playClick();
    updateDashboardStats();
    
    // Populate Sheets URL from local storage
    const url = localStorage.getItem('google_sheets_apps_script_url') || '';
    document.getElementById('google-sheets-url').value = url;
    
    document.getElementById('admin-modal').style.display = 'flex';
}

function closeDashboard() {
    SoundFX.playClick();
    document.getElementById('admin-modal').style.display = 'none';
}

function saveSheetsUrl() {
    const url = document.getElementById('google-sheets-url').value.trim();
    localStorage.setItem('google_sheets_apps_script_url', url);
}

function showCareGuideModal() {
    SoundFX.playClick();
    document.getElementById('care-guide-modal').style.display = 'flex';
}

function closeCareGuideModal() {
    SoundFX.playClick();
    document.getElementById('care-guide-modal').style.display = 'none';
}

// Update dashboard modal stats
function updateDashboardStats() {
    const list = JSON.parse(localStorage.getItem('goodfilm_submissions_v2') || '[]');
    
    document.getElementById('stat-total').innerText = list.length;
    
    if (list.length === 0) {
        document.getElementById('stat-avg').innerText = '0/5';
        document.getElementById('stat-mvp').innerText = '-';
        document.getElementById('avg-admin').innerText = '0.0';
        document.getElementById('avg-sales').innerText = '0.0';
        document.getElementById('avg-tech').innerText = '0.0';
        document.getElementById('submissions-container').innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 20px;">ไม่มีข้อมูลแบบสอบถาม</div>';
        return;
    }

    let sumAdmin = 0, sumSales = 0, sumTech = 0;
    let mvpCounts = { admin: 0, sales: 0, tech: 0, all: 0, none: 0 };
    
    list.forEach(item => {
        const ratings = item.ratings || (item.teamFeedback ? {
            admin: item.teamFeedback.adminScore,
            sales: item.teamFeedback.salesScore,
            tech: item.teamFeedback.technicianScore
        } : { admin: 0, sales: 0, tech: 0 });

        sumAdmin += ratings.admin || 0;
        sumSales += ratings.sales || 0;
        sumTech += ratings.tech || 0;
        
        const mvp = item.mvp || (item.teamFeedback ? item.teamFeedback.mvpTeam : 'none');
        if (mvp) {
            mvpCounts[mvp] = (mvpCounts[mvp] || 0) + 1;
        }
    });

    const avgAdmin = sumAdmin / list.length;
    const avgSales = sumSales / list.length;
    const avgTech = sumTech / list.length;
    const totalAvg = (avgAdmin + avgSales + avgTech) / 3;

    document.getElementById('stat-avg').innerText = totalAvg.toFixed(1) + '/5';
    document.getElementById('avg-admin').innerText = avgAdmin.toFixed(1);
    document.getElementById('avg-sales').innerText = avgSales.toFixed(1);
    document.getElementById('avg-tech').innerText = avgTech.toFixed(1);

    // Calc highest MVP
    const candidates = [
        { key: 'แอดมิน 💬', val: mvpCounts.admin },
        { key: 'ฝ่ายขาย 🧭', val: mvpCounts.sales },
        { key: 'ทีมช่าง 🧰', val: mvpCounts.tech },
        { key: 'ทุกทีม 💙', val: mvpCounts.all }
    ];
    candidates.sort((a, b) => b.val - a.val);
    document.getElementById('stat-mvp').innerText = candidates[0].val > 0 ? candidates[0].key : 'ยังไม่มี';

    // Render list
    const container = document.getElementById('submissions-container');
    container.innerHTML = '';
    
    list.forEach(item => {
        const info = item.customerInfo || {
            name: item.name, phone: item.phone, siteType: item.siteType, installDate: item.installDate, filmModel: item.filmModel || '-'
        };
        const benefits = item.filmResult || item.benefits || [];
        const ratings = item.ratings || (item.teamFeedback ? {
            admin: item.teamFeedback.adminScore,
            sales: item.teamFeedback.salesScore,
            tech: item.teamFeedback.technicianScore
        } : { admin: 0, sales: 0, tech: 0 });
        
        const mvp = item.mvp || (item.teamFeedback ? item.teamFeedback.mvpTeam : 'none');
        const comment = item.mvpComment || (item.teamFeedback ? item.teamFeedback.customerComment : '');
        
        const overall = item.overall || {
            overallMood: item.overallMood || '😐',
            needFollowUp: item.supportNeeds && item.supportNeeds.length > 0 ? 'Yes' : 'No',
            followUpIssue: item.supportNeeds || [],
            followUpDetails: item.supportDetails || ''
        };

        const dateObj = new Date(item.timestamp || (item.overall ? item.overall.submittedDate : null) || new Date());
        const dateStr = dateObj.toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' });
        
        const isGood = overall.overallMood === '😍' || overall.overallMood === '😊';
        const itemNode = document.createElement('div');
        itemNode.className = 'submission-item';
        
        let supportHtml = '';
        if (overall.needFollowUp === 'Yes' && overall.followUpIssue && overall.followUpIssue.length > 0) {
            supportHtml = `<div style="margin-top: 6px; color: var(--danger); font-weight: 700;">🚨 ประสงค์ให้ดูแล: ${overall.followUpIssue.join(', ')}</div>`;
            if (overall.followUpDetails) {
                supportHtml += `<div style="background-color: #fffaf0; padding: 6px; border-radius: 6px; font-style: italic; margin-top: 4px; border: 1px solid #fee2e2;">"${overall.followUpDetails}"</div>`;
            }
        }

        itemNode.innerHTML = `
            <div class="submission-meta">
                <span>${info.name} (${info.siteType})</span>
                <span class="sub-tag ${isGood ? 'mood-good' : 'mood-bad'}">${overall.overallMood} | ${isGood ? 'พอใจ' : 'ต้องการดูแล'}</span>
            </div>
            <div class="submission-detail-row">📞 ${info.phone} | 📅 ติดตั้ง ${info.installDate} | 🎞️ รุ่น ${info.filmModel || '-'}</div>
            <div class="submission-detail-row">❄️ ผลลัพธ์ฟิล์ม: ${benefits.join(', ') || '-'}</div>
            <div class="submission-detail-row">⭐ คะแนน (แอดมิน: ${ratings.admin} | ฝ่ายขาย: ${ratings.sales} | ช่าง: ${ratings.tech})</div>
            <div class="submission-detail-row" style="color: var(--accent); font-weight: 700;">🏆 MVP: ${mvp === 'admin' ? 'แอดมิน' : mvp === 'sales' ? 'ฝ่ายขาย' : mvp === 'tech' ? 'ช่าง' : mvp === 'all' ? 'ทุกทีม' : 'ไม่มี'}</div>
            ${comment ? `<div style="background-color: #f7fafc; padding: 6px; border-radius: 6px; font-style: italic; margin-top: 4px;">"${comment}"</div>` : ''}
            ${supportHtml}
            <div style="font-size: 0.65rem; color: var(--text-muted); text-align: right; margin-top: 6px;">
                เวลาบันทึก: ${dateStr}
            </div>
        `;
        container.appendChild(itemNode);
    });
}

function exportData() {
    const list = localStorage.getItem('goodfilm_submissions_v2') || '[]';
    const blob = new Blob([list], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `goodfilm_feedback_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearDashboardData() {
    if (confirm('คุณต้องการลบข้อมูลประเมินทั้งหมดในระบบจำลองนี้ใช่หรือไม่?')) {
        localStorage.setItem('goodfilm_submissions_v2', '[]');
        updateDashboardStats();
        SoundFX.playClick();
    }
}

function fetchAndGenerateLinks() {
    const sheetsUrl = localStorage.getItem('google_sheets_apps_script_url');
    if (!sheetsUrl || sheetsUrl.trim() === '') {
        alert('⚠️ กรุณากรอก Google Sheets Web App URL ในหน้า Dashboard ก่อนกดดึงข้อมูลค่ะ');
        return;
    }

    const container = document.getElementById('links-generator-container');
    container.innerHTML = '<div style="text-align: center; font-size: 0.7rem; padding: 10px; color: var(--primary);"><i data-lucide="loader" class="spin-icon" style="width: 14px; height: 14px; margin-right: 6px;"></i>กำลังดึงข้อมูลรายชื่อลูกค้าจากชีต Data...</div>';
    lucide.createIcons();

    fetch(`${sheetsUrl}?action=getAllCustomers`)
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success' && data.data) {
                const customers = data.data;
                if (customers.length === 0) {
                    container.innerHTML = '<div style="text-align: center; font-size: 0.7rem; color: var(--text-muted); padding: 10px;">ไม่พบข้อมูลลูกค้าในชีต Data</div>';
                    return;
                }

                container.innerHTML = '';
                const baseUrl = window.location.origin + window.location.pathname;

                customers.forEach(c => {
                    const shortUrl = `${baseUrl}?id=${encodeURIComponent(c.id)}`;
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.justify = 'space-between';
                    row.style.alignItems = 'center';
                    row.style.backgroundColor = '#ffffff';
                    row.style.padding = '8px 10px';
                    row.style.borderRadius = '8px';
                    row.style.border = '1px solid #eef3f8';
                    row.style.fontSize = '0.75rem';

                    row.innerHTML = `
                        <div style="flex: 1; min-width: 0; padding-right: 10px; text-align: left;">
                            <strong style="color: var(--primary);">${c.name}</strong> 
                            <span style="color: var(--text-muted);">(${c.id})</span>
                            <div style="color: var(--secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; font-size: 0.68rem; margin-top: 2px;">${shortUrl}</div>
                        </div>
                        <button class="btn-primary" style="padding: 4px 10px; font-size: 0.65rem; width: auto; height: auto; border-radius: 6px; flex-shrink: 0;" onclick="copyToClipboard('${shortUrl}', this)">
                            คัดลอกลิงก์
                        </button>
                    `;
                    container.appendChild(row);
                });
            } else {
                container.innerHTML = `<div style="text-align: center; font-size: 0.7rem; color: var(--danger); padding: 10px;">❌ ดึงข้อมูลล้มเหลว: ${data.message}</div>`;
            }
        })
        .catch(err => {
            container.innerHTML = `<div style="text-align: center; font-size: 0.7rem; color: var(--danger); padding: 10px;">❌ เกิดข้อผิดพลาด: ${err.message}</div>`;
        });
}

function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const origText = btn.innerText;
        btn.innerText = '✓ คัดลอกแล้ว';
        btn.style.backgroundColor = 'var(--success)';
        btn.style.backgroundImage = 'none'; // remove linear gradient
        setTimeout(() => {
            btn.innerText = origText;
            btn.style.backgroundColor = '';
            btn.style.backgroundImage = '';
        }, 1500);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}



// Start Mission 3 linear sequence
window.openM3Step = function(step) {
    SoundFX.playClick();
    if (state.m3Completed) {
        // If already completed, don't allow re-entering from the hub unless we want to edit.
        // Let's just go to admin to allow editing if they want.
        state.historyStack.push('screen-m3');
        changeScreen('screen-m3-admin');
    } else {
        state.historyStack.push('screen-m3');
        changeScreen('screen-m3-admin');
    }
};

window.checkM3HubCompletion = function() {
    if (state.m3Completed) {
        // Show checkmarks
        document.getElementById('tp-menu-admin').classList.add('completed');
        document.getElementById('tp-menu-sales').classList.add('completed');
        document.getElementById('tp-menu-tech').classList.add('completed');
        
        document.querySelector('#tp-menu-admin .m3-check-circle').style.display = 'block';
        document.querySelector('#tp-menu-sales .m3-check-circle').style.display = 'block';
        document.querySelector('#tp-menu-tech .m3-check-circle').style.display = 'block';
        
        // Show next button
        document.getElementById('btn-next').style.display = 'flex';
        document.getElementById('btn-next').disabled = false;
    } else {
        document.getElementById('btn-next').style.display = 'none';
    }
};
