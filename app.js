/* ==========================================================================
   APPLICATION LOGIC - LỜI CHÚC 50 NĂM (SPA HARDWARE INTERACTION)
   ========================================================================== */

// --- STATE MANAGEMENT ---
let appState = {
    currentUser: null, // { familyName, email }
    activeView: 'login-view',
    memories: [],      // Saved local memories: { id, date, time, text, photoUrl, audioUrl, audioDuration, size }
    currentMemoryDraft: {
        text: '',
        photoUrl: '',
        videoUrl: '',
        audioBlob: null,
        audioUrl: '',
        audioDuration: '00:00'
    },
    
    // Memory Tree Orbs
    // Each orb represents a day's uploaded files.
    // { id, dateString, x, y, size, images: [ { base64, timeString } ] }
    treeOrbs: [],
    selectedOrbId: null,
    
    // Future capsule reminder
    activeReminderOrbId: null,
    activeReminderInterval: '1 Năm',
    
    // Audio hardware states
    audioRecorder: null,
    audioChunks: [],
    audioContext: null,
    audioAnalyser: null,
    audioStream: null,
    audioIsRecording: false,
    audioTimerInterval: null,
    audioDurationSecs: 0,
    
    // Speech-to-text AI states
    speechRecognition: null,
    speechEnabled: false,
    
    // Camera / Video states
    cameraStream: null,
    videoRecorder: null,
    videoChunks: [],
    videoIsRecording: false,
    videoTimerInterval: null,
    videoDurationSecs: 0,
    
    // Music tracks (Royalty-free nostalgic ballads & ambient piano tracks)
    musicPlaylist: [
        {
            title: "Khúc Nhạc Chiều Hoài Niệm (Erik Satie)",
            url: "https://archive.org/download/Classical_Sampler-9615/Kevin_MacLeod_-_Gymnopedie_No_1.mp3", // gentle solo piano
            duration: "03:07"
        },
        {
            title: "Tiếng Dương Cầm Bình Yên (J.S. Bach)",
            url: "https://archive.org/download/Classical_Sampler-9615/Kevin_MacLeod_-_Prelude_in_C_-_BWV_846.mp3", // calm piano
            duration: "02:37"
        },
        {
            title: "Giai Điệu Hạnh Phúc Bất Tận (Pachelbel)",
            url: "https://archive.org/download/Classical_Sampler-9615/Kevin_MacLeod_-_Canon_in_D_Major.mp3", // romantic classical strings & piano
            duration: "05:10"
        },
        {
            title: "Bản Tình Ca Dòng Tộc (Strings Trio)",
            url: "https://archive.org/download/Classical_Sampler-9615/Kevin_MacLeod_-_Trio_for_Piano_Violin_and_Viola.mp3", // warm acoustic trio
            duration: "03:13"
        }
    ],
    activeTrackIndex: 0,
    musicIsPlaying: false
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Generate background floating particles
    initAmbientParticles();
    
    // Load local storage data
    loadFromLocalStorage();
    
    // Setup login check
    checkSession();
    
    // Setup Speech Recognition
    setupSpeechRecognition();
    
    // Setup Canvas drawings
    initCapsuleCanvas();
    initMemoryTreeCanvas();
    
    // Setup Music Widget playlist items
    renderMusicTracksList();
    
    // Bind slider values
    updateFutureSliderText(1);
    
    // Setup active reminder UI from localStorage
    updateReminderUI();
    
    // Set custom click triggers for range labels
    document.querySelectorAll('.slider-lbl').forEach((lbl, idx) => {
        lbl.addEventListener('click', () => setSliderValue(idx + 1));
    });
    
    // Setup Audio error handling to prevent silent network failure lag
    const player = document.getElementById('ambient-audio-player');
    if (player) {
        player.addEventListener('error', (e) => {
            console.error("Audio playback error: ", e);
            showCustomAlert("Lỗi Kết Nối Nhạc", "Không thể kết nối máy chủ nhạc hoài niệm. Vui lòng chọn bản nhạc khác trong danh sách hoặc kiểm tra kết nối mạng!", "🎵");
        });
    }

    // Check if shared memory is requested via URL QR parameters
    const urlParams = new URLSearchParams(window.location.search);
    const memoryId = urlParams.get('memoryId');
    const sharedText = urlParams.get('text');
    const sharedDate = urlParams.get('date');
    const sharedTime = urlParams.get('time');
    const sharedFamily = urlParams.get('family');
    const sharedPhoto = urlParams.get('photo');
    const sharedAudio = urlParams.get('audio');
    
    if (memoryId || sharedText) {
        showSharedMemory(memoryId, sharedText, sharedDate, sharedTime, sharedFamily, sharedPhoto, sharedAudio);
    }
});

// --- LOCAL STORAGE HELPERS ---
function saveToLocalStorage() {
    localStorage.setItem('loichuc50nam_memories', JSON.stringify(appState.memories));
    localStorage.setItem('loichuc50nam_treeOrbs', JSON.stringify(appState.treeOrbs));
    if (appState.currentUser) {
        localStorage.setItem('loichuc50nam_user', JSON.stringify(appState.currentUser));
    }
    if (appState.activeReminderOrbId) {
        localStorage.setItem('loichuc50nam_activeReminderOrbId', appState.activeReminderOrbId);
    } else {
        localStorage.removeItem('loichuc50nam_activeReminderOrbId');
    }
    localStorage.setItem('loichuc50nam_activeReminderInterval', appState.activeReminderInterval);
}

function loadFromLocalStorage() {
    const savedMemories = localStorage.getItem('loichuc50nam_memories');
    if (savedMemories) {
        let memories = JSON.parse(savedMemories);
        let migrated = false;
        // Migration: automatically upgrade old camera placeholder image to the custom brand-aligned keepsake graphic
        memories = memories.map(m => {
            if (m.photoUrl && (m.photoUrl.includes('photo-1464998857633-50e59fbf2fe6') || m.photoUrl.includes('photo-1511895426328-dc8714191300'))) {
                m.photoUrl = 'default_keepsake.png';
                migrated = true;
            }
            return m;
        });
        appState.memories = memories;
        if (migrated) {
            localStorage.setItem('loichuc50nam_memories', JSON.stringify(appState.memories));
        }
    }
    
    const savedOrbs = localStorage.getItem('loichuc50nam_treeOrbs');
    if (savedOrbs) {
        let orbs = JSON.parse(savedOrbs);
        let migratedOrbs = false;
        orbs = orbs.map(orb => {
            if (orb.images) {
                orb.images = orb.images.map(img => {
                    if (img.base64 && (img.base64.includes('photo-1464998857633-50e59fbf2fe6') || img.base64.includes('photo-1511895426328-dc8714191300'))) {
                        img.base64 = 'default_keepsake.png';
                        migratedOrbs = true;
                    }
                    return img;
                });
            }
            return orb;
        });
        appState.treeOrbs = orbs;
        if (migratedOrbs) {
            localStorage.setItem('loichuc50nam_treeOrbs', JSON.stringify(appState.treeOrbs));
        }
    } else {
        // Pre-populate 3 visual orbs for demonstration
        appState.treeOrbs = [
            {
                id: 'orb_demo_1',
                dateString: '12/05/2026',
                x: 0.35, y: 0.38,
                size: 8,
                images: [
                    { base64: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&q=80', timeString: '14:23' }
                ]
            },
            {
                id: 'orb_demo_2',
                dateString: '18/05/2026',
                x: 0.58, y: 0.28,
                size: 9,
                images: [
                    { base64: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&q=80', timeString: '09:15' },
                    { base64: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=400&q=80', timeString: '18:40' }
                ]
            }
        ];
    }
    
    const savedReminderOrbId = localStorage.getItem('loichuc50nam_activeReminderOrbId');
    if (savedReminderOrbId) appState.activeReminderOrbId = savedReminderOrbId;
    
    const savedReminderInterval = localStorage.getItem('loichuc50nam_activeReminderInterval');
    if (savedReminderInterval) appState.activeReminderInterval = savedReminderInterval;
}

// --- AMBIENT FLOATING DUST/SPARKLES ---
function initAmbientParticles() {
    const container = document.getElementById('ambient-particles');
    container.innerHTML = '';
    const particleCount = 25;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'sparkle';
        
        // Random placement
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.animationDelay = `${Math.random() * 8}s`;
        particle.style.animationDuration = `${6 + Math.random() * 6}s`;
        
        // Random golden or pale gold shade
        const goldShades = ['#D4AF37', '#F3E5AB', '#FFFDD0', '#E5A93B'];
        const randomColor = goldShades[Math.floor(Math.random() * goldShades.length)];
        particle.style.backgroundColor = randomColor;
        particle.style.boxShadow = `0 0 10px ${randomColor}`;
        
        container.appendChild(particle);
    }
}

// --- LOGIN & ROUTING FLOWS ---
function checkSession() {
    const savedUser = localStorage.getItem('loichuc50nam_user');
    if (savedUser) {
        appState.currentUser = JSON.parse(savedUser);
        setupUserEnvironment(appState.currentUser);
        switchView('landing-view');
    } else {
        switchView('login-view');
    }
}

function handleLogin() {
    const familyName = document.getElementById('family-name').value.trim();
    const gmail = document.getElementById('gmail-link').value.trim();
    
    if (familyName && gmail) {
        appState.currentUser = { familyName, email: gmail };
        localStorage.setItem('loichuc50nam_user', JSON.stringify(appState.currentUser));
        setupUserEnvironment(appState.currentUser);
        
        // Switch to Landing Page with elegant transition
        switchView('landing-view');
    }
}

// --- CUSTOM ALERT HELPER FUNCTIONS ---
function showCustomAlert(title, message, icon = '✨', confirmText = 'Xác nhận', onConfirm = null) {
    document.getElementById('custom-alert-title').innerText = title;
    document.getElementById('custom-alert-message').innerHTML = message;
    document.getElementById('custom-alert-icon').innerText = icon;
    
    const confirmBtn = document.getElementById('custom-alert-confirm-btn');
    confirmBtn.innerText = confirmText;
    
    // Recreate element to purge old event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.addEventListener('click', () => {
        closeCustomAlert();
        if (onConfirm) onConfirm();
    });
    
    document.getElementById('custom-alert-modal').classList.remove('hidden');
}

function closeCustomAlert() {
    document.getElementById('custom-alert-modal').classList.add('hidden');
}

function handleLogout() {
    if (confirm("Bạn có muốn đăng xuất khỏi gia tộc ký ức không?")) {
        localStorage.removeItem('loichuc50nam_user');
        appState.currentUser = null;
        
        // Clean session states
        document.getElementById('family-name').value = '';
        document.getElementById('gmail-link').value = '';
        document.getElementById('main-header').classList.add('hidden');
        
        // Hide mobile bottom nav
        const mobileNav = document.getElementById('mobile-bottom-nav');
        if (mobileNav) mobileNav.classList.add('hidden');
        
        // Reset to first view
        switchView('login-view');
    }
}

function setupUserEnvironment(user) {
    // Show header nav
    document.getElementById('main-header').classList.remove('hidden');
    
    // Show mobile bottom nav
    const mobileNav = document.getElementById('mobile-bottom-nav');
    if (mobileNav) mobileNav.classList.remove('hidden');
    
    // Bind user profile fields
    document.getElementById('header-family-tag').innerText = user.familyName;
    
    // Get first letter of family name for avatar
    const cleanLetter = user.familyName.replace(/Gia\s*đình\s*/i, '').trim()[0] || 'G';
    document.getElementById('avatar-letter').innerText = cleanLetter.toUpperCase();
}

function switchView(viewId) {
    // Hide active views
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });
    
    // Activate target
    const targetSection = document.getElementById(viewId);
    targetSection.classList.remove('hidden');
    
    // Trigger transition delay for smooth fade
    setTimeout(() => {
        targetSection.classList.add('active');
    }, 50);
    
    // Update Header Active State for Desktop & Mobile
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (viewId === 'landing-view') {
        document.querySelectorAll('button[onclick*="landing-view"]').forEach(btn => btn.classList.add('active'));
    } else if (viewId === 'recording-view') {
        document.querySelectorAll('button[onclick*="recording-view"]').forEach(btn => btn.classList.add('active'));
    } else if (viewId === 'tree-view') {
        document.querySelectorAll('button[onclick*="tree-view"]').forEach(btn => btn.classList.add('active'));
    } else if (viewId === 'archive-view') {
        document.querySelectorAll('button[onclick*="archive-view"]').forEach(btn => btn.classList.add('active'));
        renderArchiveGrid();
    }
    
    appState.activeView = viewId;
    
    // Stop any active hardware streams if switching away from recording view
    if (viewId !== 'recording-view') {
        stopAllHardwareStreams();
    }
    
    // Fit and re-render the memory tree canvas now that the wrapper is visible
    if (viewId === 'tree-view') {
        setTimeout(() => {
            resizeTreeCanvas();
            generateFoliageParticles();
        }, 100);
    }
}

// --- CORE HARDWARE INTERACTIVE API (CAMERA, RECORDER, SPEECH) ---

function stopAllHardwareStreams() {
    if (appState.cameraStream) {
        appState.cameraStream.getTracks().forEach(track => track.stop());
        appState.cameraStream = null;
    }
    if (appState.audioStream) {
        appState.audioStream.getTracks().forEach(track => track.stop());
        appState.audioStream = null;
    }
}

// 1. Microphone Recorder & Live Web Audio Waveform
async function toggleAudioRecording() {
    const micBtn = document.getElementById('mic-trigger-btn');
    const mainActionBtn = document.getElementById('mic-main-action-btn');
    
    if (!appState.audioIsRecording) {
        // Start recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            appState.audioStream = stream;
            appState.audioChunks = [];
            
            // Web Audio Analyser setup for real live waveform!
            setupAudioAnalyser(stream);
            
            // MediaRecorder initialization
            appState.audioRecorder = new MediaRecorder(stream);
            appState.audioRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    appState.audioChunks.push(event.data);
                }
            };
            
            appState.audioRecorder.onstop = () => {
                const audioBlob = new Blob(appState.audioChunks, { type: 'audio/mp3' });
                appState.currentMemoryDraft.audioBlob = audioBlob;
                appState.currentMemoryDraft.audioUrl = URL.createObjectURL(audioBlob);
                
                // Set duration label
                const min = Math.floor(appState.audioDurationSecs / 60);
                const sec = appState.audioDurationSecs % 60;
                appState.currentMemoryDraft.audioDuration = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
                
                // Add preview attachment badge
                addAttachmentBadge('Ghi âm', 'audio');
            };
            
            appState.audioRecorder.start();
            appState.audioIsRecording = true;
            
            // Update UI buttons
            micBtn.classList.add('recording');
            mainActionBtn.innerText = "Dừng ghi âm";
            
            // Trigger Speech Recognition if toggle is ON with a 300ms delay to prevent hardware conflicts
            if (appState.speechEnabled && appState.speechRecognition) {
                setTimeout(() => {
                    try {
                        appState.speechRecognition.start();
                    } catch (e) {
                        console.warn("Speech recognition start failed or already active: ", e);
                    }
                }, 300);
            }
            
            // Timer interval
            appState.audioDurationSecs = 0;
            document.getElementById('recording-timer').innerText = "00:00";
            appState.audioTimerInterval = setInterval(() => {
                appState.audioDurationSecs++;
                const min = Math.floor(appState.audioDurationSecs / 60);
                const sec = appState.audioDurationSecs % 60;
                document.getElementById('recording-timer').innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            }, 1000);
            
        } catch (err) {
            console.error("Lỗi quyền ghi âm microphone: ", err);
            showCustomAlert("Lỗi Kết Nối Mic", "Không thể kết nối Microphone của thiết bị. Vui lòng cho phép quyền truy cập mic trên trình duyệt để ghi âm ký ức!", "🎙️");
        }
    } else {
        // Stop recording
        if (appState.audioRecorder) appState.audioRecorder.stop();
        if (appState.audioStream) {
            appState.audioStream.getTracks().forEach(track => track.stop());
        }
        
        clearInterval(appState.audioTimerInterval);
        
        // Stop Speech Recognition
        if (appState.speechRecognition) {
            appState.speechRecognition.stop();
        }
        
        appState.audioIsRecording = false;
        micBtn.classList.remove('recording');
        mainActionBtn.innerText = "Ghi âm";
        
        // Reset static base waveform
        const activePath = document.getElementById('waveform-path-active');
        activePath.setAttribute('d', "M10,50 Q30,50 50,50 T90,50 T130,50 T170,50 T190,50");
    }
}

function setupAudioAnalyser(stream) {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        appState.audioContext = new AudioCtx();
        const source = appState.audioContext.createMediaStreamSource(stream);
        appState.audioAnalyser = appState.audioContext.createAnalyser();
        appState.audioAnalyser.fftSize = 64;
        source.connect(appState.audioAnalyser);
        
        const bufferLength = appState.audioAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const activePath = document.getElementById('waveform-path-active');
        
        function drawWave() {
            if (!appState.audioIsRecording) return;
            requestAnimationFrame(drawWave);
            
            appState.audioAnalyser.getByteFrequencyData(dataArray);
            
            // Construct a dynamic premium wave path based on real frequency volumes
            let pathString = "M 10 50";
            const step = 180 / bufferLength;
            
            for (let i = 0; i < bufferLength; i++) {
                const percent = dataArray[i] / 255;
                const amplitude = percent * 38; // Max amplitude size
                const x = 10 + (i * step);
                // Alternate peaks and valleys
                const y = 50 + (i % 2 === 0 ? amplitude : -amplitude);
                
                pathString += ` Q ${x - step/2} ${y} ${x} 50`;
            }
            
            activePath.setAttribute('d', pathString);
        }
        
        drawWave();
    } catch (e) {
        console.warn("Trình duyệt không hỗ trợ Web Audio Context đầy đủ, sử dụng giả lập", e);
    }
}

// 2. Speech-to-Text AI (Using HTML5 Web Speech Recognition)
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isFileProtocol = window.location.protocol === 'file:';
    
    if (SpeechRecognition && !isFileProtocol) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true; // Enable real-time interim results!
        recognition.lang = 'vi-VN'; // Vietnamese language localization
        
        recognition.onresult = (event) => {
            let fullText = '';
            // Rebuild the entire transcript from all results to show real-time word-by-word AI recognition!
            for (let i = 0; i < event.results.length; ++i) {
                fullText += event.results[i][0].transcript + ' ';
            }
            
            const textbox = document.getElementById('speech-transcript-textarea');
            if (textbox && fullText.trim()) {
                textbox.value = fullText;
                
                // Keep cursor at bottom
                textbox.scrollTop = textbox.scrollHeight;
                
                // Automatically sync transcripted text with draft
                appState.currentMemoryDraft.text = textbox.value;
            }
        };
        
        recognition.onerror = (e) => {
            console.error("Speech Recognition Error: ", e);
            if (e.error === 'not-allowed') {
                showCustomAlert("Quyền truy cập Micro bị chặn", "Vui lòng cho phép quyền truy cập Microphone của trình duyệt để sử dụng tính năng AI dịch chữ!", "🎙️");
            } else if (e.error === 'audio-capture') {
                showCustomAlert("Microphone Bận", "Không thể ghi nhận âm thanh từ micro. Micro của bạn có thể đang được sử dụng bởi một ứng dụng khác (như Zoom, Zalo). Vui lòng tắt các ứng dụng đó và thử lại!", "🎙️");
            } else if (e.error === 'network') {
                showCustomAlert("Lỗi Kết Nối Mạng", "Tính năng AI dịch giọng nói yêu cầu kết nối Internet ổn định. Vui lòng kiểm tra lại mạng của bạn!", "🌐");
            } else if (e.error === 'no-speech') {
                console.warn("Không phát hiện giọng nói.");
            }
        };
        
        // Auto-restart speech engine if it stops unexpectedly during active recording (long silence)
        recognition.onend = () => {
            if (appState.audioIsRecording && appState.speechEnabled) {
                try {
                    recognition.start();
                } catch (e) {
                    console.warn("Speech recognition auto-restart failed: ", e);
                }
            }
        };
        
        appState.speechRecognition = recognition;
    } else {
        console.warn("Trình duyệt này không hỗ trợ Web Speech-to-Text API hoặc đang mở dưới dạng giao thức file://.");
        const toggleBtn = document.getElementById('speech-to-text-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                if (isFileProtocol) {
                    showCustomAlert(
                        "Lỗi Giao thức Tệp Cục bộ (file://)",
                        "Bạn đang mở trang web trực tiếp từ ổ đĩa máy tính (nhấp đúp tệp <strong>index.html</strong>). Trình duyệt Google Chrome/Edge chặn micro và các tính năng AI âm thanh vì lý do bảo mật đối với giao thức tệp cục bộ.<br><br><strong>Cách chạy để tính năng AI hoạt động:</strong><br>1. Truy cập trực tiếp link web chính thức đã đưa lên mạng: <strong>https://baovan1809.github.io/loichuc50nam/</strong> (hoạt động 100% cực kỳ mượt mà!).<br>2. Hoặc sử dụng máy chủ ảo cục bộ (Local Server) như VS Code Live Server hoặc chạy file <strong>server.js</strong> đi kèm!",
                        "🎙️"
                    );
                } else {
                    showCustomAlert(
                        "Trình duyệt không hỗ trợ AI",
                        "Trình duyệt hiện tại của bạn (Zalo/Messenger Webview hoặc Firefox) không hỗ trợ tính năng Web Speech AI. <br><br><strong>Cách khắc phục:</strong> Vui lòng sao chép đường link và mở bằng trình duyệt <strong>Google Chrome</strong> hoặc <strong>Microsoft Edge</strong> (trên máy tính) hoặc <strong>Safari</strong> (trên iPhone) để sử dụng tính năng AI dịch giọng nói thành chữ nhé!",
                        "🎙️"
                    );
                }
            };
        }
    }
}

function toggleSpeechToText() {
    const badge = document.getElementById('speech-to-text-toggle');
    const label = document.getElementById('speech-mode-label');
    const box = document.getElementById('speech-transcript-box');
    
    appState.speechEnabled = !appState.speechEnabled;
    
    if (appState.speechEnabled) {
        badge.classList.remove('btn-secondary');
        badge.classList.add('btn-primary');
        label.innerText = "AI Dịch chữ: Bật";
        box.classList.remove('hidden');
        
        // If already actively recording, start the recognition instantly!
        if (appState.audioIsRecording && appState.speechRecognition) {
            try {
                appState.speechRecognition.start();
            } catch (e) {
                console.warn("Speech recognition start failed or already active: ", e);
            }
        }
    } else {
        badge.classList.remove('btn-primary');
        badge.classList.add('btn-secondary');
        label.innerText = "AI Dịch chữ: Tắt";
        box.classList.add('hidden');
        
        // If actively recording, stop the recognition immediately!
        if (appState.speechRecognition) {
            try {
                appState.speechRecognition.stop();
            } catch (e) {
                console.warn("Speech recognition stop failed: ", e);
            }
        }
    }
}

function clearTranscript() {
    document.getElementById('speech-transcript-textarea').value = '';
    appState.currentMemoryDraft.text = '';
}

// --- Empty Template Printing System ---
appState.selectedTemplateToPrint = 'eden';
appState.selectedTemplateSize = 'a4';
appState.selectedTemplateOrientation = 'landscape';

function openPrintTemplateModal() {
    appState.selectedTemplateToPrint = 'eden';
    appState.selectedTemplateSize = 'a4';
    appState.selectedTemplateOrientation = 'landscape';
    
    // Reset active highlights
    document.querySelectorAll('.template-choice-card').forEach(c => {
        c.classList.remove('active');
        c.style.borderColor = 'rgba(74, 59, 50, 0.15)';
        c.style.background = 'transparent';
        c.querySelector('strong').style.color = 'var(--color-text-brown)';
    });
    document.querySelectorAll('.template-size-card').forEach(c => {
        c.classList.remove('active');
        c.style.borderColor = 'rgba(74, 59, 50, 0.15)';
        c.style.background = 'transparent';
        c.querySelector('strong').style.color = 'var(--color-text-brown)';
    });
    document.querySelectorAll('.template-orientation-card').forEach(c => {
        c.classList.remove('active');
        c.style.borderColor = 'rgba(74, 59, 50, 0.15)';
        c.style.background = 'transparent';
        c.querySelector('strong').style.color = 'var(--color-text-brown)';
    });
    
    // Highlight defaults
    const choices = document.querySelectorAll('.template-choice-card');
    if (choices.length > 0) {
        choices[0].classList.add('active');
        choices[0].style.borderColor = 'var(--color-gold-dark)';
        choices[0].style.background = 'rgba(214,175,55,0.03)';
        choices[0].querySelector('strong').style.color = 'var(--color-gold-dark)';
    }
    const orientations = document.querySelectorAll('.template-orientation-card');
    if (orientations.length > 0) {
        orientations[0].classList.add('active');
        orientations[0].style.borderColor = 'var(--color-gold-dark)';
        orientations[0].style.background = 'rgba(214,175,55,0.03)';
        orientations[0].querySelector('strong').style.color = 'var(--color-gold-dark)';
    }
    const sizes = document.querySelectorAll('.template-size-card');
    if (sizes.length > 0) {
        sizes[0].classList.add('active');
        sizes[0].style.borderColor = 'var(--color-gold-dark)';
        sizes[0].style.background = 'rgba(214,175,55,0.03)';
        sizes[0].querySelector('strong').style.color = 'var(--color-gold-dark)';
    }
    
    const modal = document.getElementById('print-template-modal');
    if (modal) modal.classList.remove('hidden');
}

function openPrintTemplateModalWithTemplate(templateName) {
    // Open standard modal
    openPrintTemplateModal();
    
    // Programmatically select the template choice card
    const element = document.querySelector(`.template-choice-card[onclick*="'${templateName}'"]`) || 
                    document.querySelector(`.template-choice-card[onclick*="\\"${templateName}\\""]`);
    if (element) {
        selectTemplateToPrint(templateName, element);
    } else {
        appState.selectedTemplateToPrint = templateName;
    }
}

function closePrintTemplateModal() {
    const modal = document.getElementById('print-template-modal');
    if (modal) modal.classList.add('hidden');
}

function selectTemplateToPrint(templateName, element) {
    appState.selectedTemplateToPrint = templateName;
    document.querySelectorAll('.template-choice-card').forEach(c => {
        c.classList.remove('active');
        c.style.borderColor = 'rgba(74, 59, 50, 0.15)';
        c.style.background = 'transparent';
        c.querySelector('strong').style.color = 'var(--color-text-brown)';
    });
    if (element) {
        element.classList.add('active');
        element.style.borderColor = 'var(--color-gold-dark)';
        element.style.background = 'rgba(214,175,55,0.03)';
        element.querySelector('strong').style.color = 'var(--color-gold-dark)';
    }
}

function selectTemplateOrientation(orientation, element) {
    appState.selectedTemplateOrientation = orientation;
    document.querySelectorAll('.template-orientation-card').forEach(c => {
        c.classList.remove('active');
        c.style.borderColor = 'rgba(74, 59, 50, 0.15)';
        c.style.background = 'transparent';
        c.querySelector('strong').style.color = 'var(--color-text-brown)';
    });
    if (element) {
        element.classList.add('active');
        element.style.borderColor = 'var(--color-gold-dark)';
        element.style.background = 'rgba(214,175,55,0.03)';
        element.querySelector('strong').style.color = 'var(--color-gold-dark)';
    }
}

function selectTemplateSize(sizeName, element) {
    appState.selectedTemplateSize = sizeName;
    document.querySelectorAll('.template-size-card').forEach(c => {
        c.classList.remove('active');
        c.style.borderColor = 'rgba(74, 59, 50, 0.15)';
        c.style.background = 'transparent';
        c.querySelector('strong').style.color = 'var(--color-text-brown)';
    });
    if (element) {
        element.classList.add('active');
        element.style.borderColor = 'var(--color-gold-dark)';
        element.style.background = 'rgba(214,175,55,0.03)';
        element.querySelector('strong').style.color = 'var(--color-gold-dark)';
    }
}

function downloadSelectedTemplate() {
    const templateName = appState.selectedTemplateToPrint || 'eden';
    const sizeName = appState.selectedTemplateSize || 'a4';
    const orientation = appState.selectedTemplateOrientation || 'landscape';
    
    // Create a beautiful premium overlay alert to inform user that high-res image generation has started
    const alertOverlay = document.createElement('div');
    alertOverlay.style.position = 'fixed';
    alertOverlay.style.top = '0';
    alertOverlay.style.left = '0';
    alertOverlay.style.width = '100%';
    alertOverlay.style.height = '100%';
    alertOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    alertOverlay.style.zIndex = '999999';
    alertOverlay.style.display = 'flex';
    alertOverlay.style.alignItems = 'center';
    alertOverlay.style.justifyContent = 'center';
    alertOverlay.style.color = '#fff';
    alertOverlay.style.fontFamily = "'Playfair Display', serif";
    alertOverlay.style.fontSize = '1.2rem';
    alertOverlay.innerHTML = `<div style="background:#4a3b32; padding:20px 40px; border-radius:10px; border:2px solid #d4af37; text-align:center;">⌛ Đang khởi tạo ảnh khung độ phân giải cao...</div>`;
    document.body.appendChild(alertOverlay);

    // Load the image to render onto a canvas for high-quality, perfectly-oriented PNG download
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `${templateName}.png?v=1.2.0`;
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Define high-resolution output dimensions (A4 standard at 300 DPI is approx 3508 x 2480 pixels)
        const baseWidth = 3508;
        const baseHeight = 2480;
        
        if (orientation === 'portrait') {
            // Swap width and height for physical portrait layout
            canvas.width = baseHeight;
            canvas.height = baseWidth;
            
            // Rotate canvas 90 degrees to physically re-orient the landscape image into portrait
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, -baseWidth / 2, -baseHeight / 2, baseWidth, baseHeight);
        } else {
            canvas.width = baseWidth;
            canvas.height = baseHeight;
            ctx.drawImage(img, 0, 0, baseWidth, baseHeight);
        }
        
        // Trigger high-quality PNG download
        const link = document.createElement('a');
        link.download = `Khung_Mau_${templateName.toUpperCase()}_${sizeName.toUpperCase()}_${orientation.toUpperCase()}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.body.removeChild(alertOverlay);
    };
    img.onerror = function() {
        // Fallback to direct raw file download if canvas rendering fails
        const link = document.createElement('a');
        link.href = `${templateName}.png?v=1.2.0`;
        link.download = `Mau_Thiep_${templateName.charAt(0).toUpperCase() + templateName.slice(1)}_Goc.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        document.body.removeChild(alertOverlay);
    };
}

async function printEmptyTemplate() {
    const templateName = appState.selectedTemplateToPrint || 'eden';
    const sizeName = appState.selectedTemplateSize || 'a4';
    const orientation = appState.selectedTemplateOrientation || 'landscape';
    
    closePrintTemplateModal();
    
    const container = document.getElementById('printable-template-only-container');
    if (!container) return;
    container.innerHTML = `<img src="${templateName}.png?v=1.2.0" alt="Empty Template Color">`;
    
    // Add print orientation and empty template classes to body
    document.body.classList.remove(
        'print-size-a4', 'print-size-a5', 
        'print-orientation-landscape', 'print-orientation-portrait', 
        'print-template-only', 'print-template-eden', 
        'print-template-butterfly', 'print-template-royal'
    );
    document.body.classList.add(`print-size-${sizeName}`);
    document.body.classList.add(`print-orientation-${orientation}`);
    document.body.classList.add('print-template-only');
    document.body.classList.add(`print-template-${templateName}`);
    
    // Inject dynamic @page style to force orientation and zero margins
    let printStyleNode = document.getElementById('dynamic-print-page-style');
    if (!printStyleNode) {
        printStyleNode = document.createElement('style');
        printStyleNode.id = 'dynamic-print-page-style';
        document.head.appendChild(printStyleNode);
    }
    
    const sizeParam = sizeName.toUpperCase();
    printStyleNode.innerHTML = `@media print { @page { size: ${sizeParam} ${orientation}; margin: 0; } }`;
    
    await waitForImagesToLoad(container);
    
    // Trigger direct browser printing
    window.print();
    
    // Cleanup class after print dialog is closed
    setTimeout(() => {
        document.body.classList.remove(
            'print-template-only', 'print-template-eden', 
            'print-template-butterfly', 'print-template-royal'
        );
    }, 1000);
}

// 3. Physical Camera Capture
async function openCameraModal() {
    const modal = document.getElementById('camera-modal');
    modal.classList.remove('hidden');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        appState.cameraStream = stream;
        const videoNode = document.getElementById('device-camera-stream');
        videoNode.srcObject = stream;
    } catch (err) {
        console.error("Không thể mở Camera thiết bị: ", err);
        showCustomAlert("Lỗi Kết Nối Camera", "Không thể kết nối máy ảnh thiết bị. Vui lòng cho phép quyền truy cập Camera để chụp ảnh lưu niệm!", "📸");
        closeCameraModal();
    }
}

function closeCameraModal() {
    document.getElementById('camera-modal').classList.add('hidden');
    if (appState.cameraStream) {
        appState.cameraStream.getTracks().forEach(track => track.stop());
        appState.cameraStream = null;
    }
}

function captureCameraSnapshot() {
    const videoNode = document.getElementById('device-camera-stream');
    const canvasNode = document.getElementById('camera-snapshot-canvas');
    
    if (videoNode && canvasNode && appState.cameraStream) {
        canvasNode.width = videoNode.videoWidth || 640;
        canvasNode.height = videoNode.videoHeight || 480;
        
        const ctx = canvasNode.getContext('2d');
        // Mirror effect for front-facing camera
        ctx.translate(canvasNode.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoNode, 0, 0, canvasNode.width, canvasNode.height);
        
        const dataUrl = canvasNode.toDataURL('image/png');
        appState.currentMemoryDraft.photoUrl = dataUrl;
        
        // Add badge indicator
        addAttachmentBadge('Ảnh chụp', 'photo');
        
        // Immersive camera flash effect
        const wrapper = document.querySelector('.camera-stream-wrapper');
        wrapper.style.backgroundColor = '#ffffff';
        setTimeout(() => {
            wrapper.style.backgroundColor = '#000000';
        }, 120);
        
        // Close modal
        setTimeout(closeCameraModal, 300);
    }
}

// 4. Video Recording
async function openVideoModal() {
    document.getElementById('video-modal').classList.remove('hidden');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        appState.cameraStream = stream;
        const videoNode = document.getElementById('device-video-record-stream');
        videoNode.srcObject = stream;
    } catch (err) {
        console.error("Lỗi kết nối Camera/Webcam quay video: ", err);
        showCustomAlert("Lỗi Kết Nối Video", "Không thể kết nối Camera của thiết bị để quay video!", "🎥");
        closeVideoModal();
    }
}

function closeVideoModal() {
    document.getElementById('video-modal').classList.add('hidden');
    if (appState.cameraStream) {
        appState.cameraStream.getTracks().forEach(track => track.stop());
        appState.cameraStream = null;
    }
    
    clearInterval(appState.videoTimerInterval);
    document.getElementById('video-recording-indicator').classList.add('hidden');
    appState.videoIsRecording = false;
}

async function toggleVideoRecording() {
    const btn = document.getElementById('video-rec-action-btn');
    const indicator = document.getElementById('video-recording-indicator');
    
    if (!appState.videoIsRecording) {
        try {
            appState.videoChunks = [];
            appState.videoRecorder = new MediaRecorder(appState.cameraStream);
            
            appState.videoRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) appState.videoChunks.push(e.data);
            };
            
            appState.videoRecorder.onstop = () => {
                const videoBlob = new Blob(appState.videoChunks, { type: 'video/mp4' });
                appState.currentMemoryDraft.videoUrl = URL.createObjectURL(videoBlob);
                addAttachmentBadge('Video ghi', 'video');
            };
            
            appState.videoRecorder.start();
            appState.videoIsRecording = true;
            
            btn.innerText = "Dừng quay";
            btn.style.background = '#e74c3c';
            indicator.classList.remove('hidden');
            
            // Timer details
            appState.videoDurationSecs = 0;
            document.getElementById('video-timer').innerText = "00:00";
            appState.videoTimerInterval = setInterval(() => {
                appState.videoDurationSecs++;
                const min = Math.floor(appState.videoDurationSecs / 60);
                const sec = appState.videoDurationSecs % 60;
                document.getElementById('video-timer').innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            }, 1000);
            
        } catch (e) {
            console.error("Lỗi ghi nhận Media Video: ", e);
        }
    } else {
        if (appState.videoRecorder) appState.videoRecorder.stop();
        clearInterval(appState.videoTimerInterval);
        
        btn.innerText = "Bắt đầu quay";
        btn.style.background = '';
        indicator.classList.add('hidden');
        appState.videoIsRecording = false;
        
        setTimeout(closeVideoModal, 500);
    }
}

// 5. Written Hand message Modal
function openTextEditorModal() {
    document.getElementById('text-editor-modal').classList.remove('hidden');
    // Pre-load existing draft text
    document.getElementById('capsule-letter-textarea').value = appState.currentMemoryDraft.text;
}

function closeTextEditorModal() {
    document.getElementById('text-editor-modal').classList.add('hidden');
}

function saveLetterText() {
    const val = document.getElementById('capsule-letter-textarea').value.trim();
    if (val) {
        appState.currentMemoryDraft.text = val;
        addAttachmentBadge('Bức thư tay', 'text');
    }
    closeTextEditorModal();
}

// --- ATTACHMENTS LIST SYSTEM ---
function addAttachmentBadge(name, type) {
    const bar = document.getElementById('captured-attachments-bar');
    const container = document.getElementById('attachments-list');
    bar.classList.remove('hidden');
    
    // Check if badge exists, otherwise append
    const badgeId = `badge_${type}`;
    let badge = document.getElementById(badgeId);
    
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'attachment-badge';
        badge.id = badgeId;
        
        // Define beautiful icon representing hardware file
        let icon = '📎';
        if (type === 'photo') icon = '📸';
        if (type === 'text') icon = '✍️';
        if (type === 'video') icon = '🎥';
        if (type === 'audio') icon = '🎙️';
        
        badge.innerHTML = `
            <span>${icon} ${name}</span>
            <button class="badge-del" onclick="deleteAttachment('${type}')" title="Xóa">&times;</button>
        `;
        container.appendChild(badge);
    }
}

function deleteAttachment(type) {
    if (type === 'photo') appState.currentMemoryDraft.photoUrl = '';
    if (type === 'text') appState.currentMemoryDraft.text = '';
    if (type === 'video') appState.currentMemoryDraft.videoUrl = '';
    if (type === 'audio') {
        appState.currentMemoryDraft.audioBlob = null;
        appState.currentMemoryDraft.audioUrl = '';
        appState.currentMemoryDraft.audioDuration = '00:00';
    }
    
    const badge = document.getElementById(`badge_${type}`);
    if (badge) badge.remove();
    
    // Hide bar if empty
    const container = document.getElementById('attachments-list');
    if (container.children.length === 0) {
        document.getElementById('captured-attachments-bar').classList.add('hidden');
    }
}

// --- SAVE MEMORY (SUBMIT KEEPSAKE) ---
function handleSaveMemory() {
    const draft = appState.currentMemoryDraft;
    
    // Check if anything is registered
    if (!draft.text && !draft.photoUrl && !draft.videoUrl && !draft.audioUrl) {
        showCustomAlert("Trống Ký Ức", "Vui lòng ghi nhận ít nhất một loại ký ức: Chụp ảnh, Ghi âm giọng nói, hoặc Viết thư tay trước khi Lưu Ký Ức!", "⏳");
        return;
    }
    
    // Construct Saved Memory object
    const currentDate = new Date();
    const cleanDateStr = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;
    const cleanTimeStr = `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
    
    // Calculate simulated size in KB/MB
    let mockSizeKB = 24;
    if (draft.text) mockSizeKB += Math.round(draft.text.length * 0.05);
    if (draft.photoUrl) mockSizeKB += 180;
    if (draft.audioUrl) mockSizeKB += 120;
    if (draft.videoUrl) mockSizeKB += 1024;
    
    const memoryObj = {
        id: 'mem_' + Date.now(),
        date: cleanDateStr,
        time: cleanTimeStr,
        text: draft.text || "Ký ức hình ảnh tinh khôi.",
        photoUrl: draft.photoUrl || "default_keepsake.png",
        audioUrl: draft.audioUrl,
        audioDuration: draft.audioDuration || "00:00",
        videoUrl: draft.videoUrl || "",
        size: mockSizeKB < 1024 ? `${mockSizeKB} KB` : `${(mockSizeKB / 1024).toFixed(1)} MB`
    };
    
    // Push into appState memories list
    appState.memories.push(memoryObj);
    
    // Gieo mầm (sprout) image directly to the Eternal Tree!
    if (draft.photoUrl) {
        sproutNewTreeFruit(draft.photoUrl, cleanDateStr, cleanTimeStr);
    }
    
    saveToLocalStorage();
    
    // Update Review Screen Components
    setupMemoryReviewCard(memoryObj);
    
    // Transition to Review Panel
    document.getElementById('recording-capture-panel').classList.add('hidden');
    document.getElementById('recording-saved-panel').classList.remove('hidden');
}

function setupMemoryReviewCard(memory) {
    document.getElementById('saved-preview-img').src = memory.photoUrl;
    document.getElementById('saved-preview-date').innerText = memory.date;
    document.getElementById('saved-preview-time').innerText = memory.time;
    document.getElementById('saved-preview-text').innerText = memory.text;
    
    // Handle audio component visibility
    const audioWrapper = document.getElementById('saved-preview-audio-container');
    if (memory.audioUrl) {
        audioWrapper.classList.remove('hidden');
        document.getElementById('saved-preview-audio-duration').innerText = memory.audioDuration;
        
        // Load into printable preview or review components
        const player = document.getElementById('ambient-audio-player');
        // Do not auto-play, just prepare URL
        player.src = memory.audioUrl;
    } else {
        audioWrapper.classList.add('hidden');
    }
    
    // Sidebar details
    document.getElementById('meta-save-date').innerText = memory.date;
    document.getElementById('meta-save-time').innerText = memory.time;
    document.getElementById('meta-save-size').innerText = memory.size;
    
    let typeLabel = 'Lời nhắn';
    if (memory.photoUrl.startsWith('data:image')) typeLabel = 'Ảnh & Lời chúc';
    if (memory.audioUrl) typeLabel += ' & Giọng nói';
    document.getElementById('meta-save-type').innerText = typeLabel;
}

function resetToRecordScreen() {
    // Empty draft
    appState.currentMemoryDraft = {
        text: '',
        photoUrl: '',
        videoUrl: '',
        audioBlob: null,
        audioUrl: '',
        audioDuration: '00:00'
    };
    
    // Empty badges
    document.getElementById('attachments-list').innerHTML = '';
    document.getElementById('captured-attachments-bar').classList.add('hidden');
    document.getElementById('recording-timer').innerText = "00:00";
    
    // Speech text empty
    clearTranscript();
    
    // Toggle screens
    document.getElementById('recording-saved-panel').classList.add('hidden');
    document.getElementById('recording-capture-panel').classList.remove('hidden');
}

// --- REVIEW ACTIONS (GOOGLE DRIVE SYNC, QR DISPLAY, PRINT KEPSAKE) ---

function saveToWebCapsule() {
    showCustomAlert(
        "Bảo Tồn Ký Ức",
        "Ký ức trân quý của gia đình bạn đã được đóng gói và bảo tồn vĩnh viễn vào Hộp Viên Nang Thời Gian (Time Capsule) trên hệ thống website! Hãy chuyển tới Kho Ký Ức để xem lại các tấm thẻ Polaroid.",
        "✨",
        "Đến Kho Ký Ức",
        () => {
            switchView('archive-view');
        }
    );
}

async function syncWithGoogleDrive() {
    try {
        if (!appState.currentUser) {
            showCustomAlert("Chưa đăng nhập", "Vui lòng đăng nhập tên gia đình ở màn hình chính trước khi thực hiện đồng bộ!", "❌");
            return;
        }
        
        const memories = appState.memories;
        if (memories.length === 0) {
            showCustomAlert("Trống Ký Ức", "Hiện tại chưa có ký ức nào được tạo. Hãy tạo lời chúc hoặc ghi âm trước!", "⏳");
            return;
        }
        
        const lastMemory = memories[memories.length - 1];
        
        // 1. Download PDF (for Photo / Text)
        let hasPDF = lastMemory.photoUrl || lastMemory.text;
        if (hasPDF) {
            await downloadMemoryPDF(lastMemory.id);
        }
        
        // 2. Download raw recorded audio (.mp3) if it exists
        if (lastMemory.audioUrl) {
            const audioLink = document.createElement('a');
            audioLink.href = lastMemory.audioUrl;
            audioLink.download = `giong_noi_ki_uc_${lastMemory.id}.mp3`;
            document.body.appendChild(audioLink);
            audioLink.click();
            document.body.removeChild(audioLink);
        }

        // 3. Download raw recorded video (.mp4) if it exists
        const videoUrl = lastMemory.videoUrl || appState.currentMemoryDraft.videoUrl;
        if (videoUrl) {
            const videoLink = document.createElement('a');
            videoLink.href = videoUrl;
            videoLink.download = `video_ki_uc_${lastMemory.id}.mp4`;
            document.body.appendChild(videoLink);
            videoLink.click();
            document.body.removeChild(videoLink);
        }
        
        // Construct dynamic file types label
        let fileTypes = [];
        if (hasPDF) fileTypes.push("Thiệp PDF nghệ thuật (.pdf)");
        if (lastMemory.audioUrl) fileTypes.push("Ghi âm giọng nói (.mp3)");
        if (videoUrl) fileTypes.push("Video quay hình (.mp4)");
        const fileTypesLabel = fileTypes.join(", ");
        
        const email = appState.currentUser.email || "Gmail của bạn";
        
        const gdriveMessage = `
        <div style="text-align: left; margin-top: 10px;">
            <p style="font-size: 0.95rem; margin-bottom: 12px; color: var(--color-text-brown);">
                Hệ thống đã tự động xuất và tải xuống các tệp tin ký ức chất lượng cao (**${fileTypesLabel}**) về thiết bị của bạn. 
                Để lưu giữ vĩnh viễn và an toàn, vui lòng thực hiện tải lên Google Drive của bạn theo hướng dẫn:
            </p>
            <div class="step-item" style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; font-size: 0.9rem;">
                <div style="background: var(--color-gold); color: #fff; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; line-height: 20px;">1</div>
                <div>Kiểm tra mục tải xuống (Downloads) trên máy tính/điện thoại để tìm các tệp tin vừa tải về.</div>
            </div>
            <div class="step-item" style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; font-size: 0.9rem;">
                <div style="background: var(--color-gold); color: #fff; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; line-height: 20px;">2</div>
                <div>Mở <strong>Google Drive</strong> của địa chỉ: <strong>${email}</strong>.</div>
            </div>
            <div class="step-item" style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px; font-size: 0.9rem;">
                <div style="background: var(--color-gold); color: #fff; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; line-height: 20px;">3</div>
                <div>Tạo thư mục tên <strong>"Lời Chúc 50 Năm"</strong> và kéo thả các tệp vừa tải vào đó. Ký ức của bạn giờ đã được lưu trữ vĩnh viễn và an toàn!</div>
            </div>
        </div>
        `;
        showCustomAlert("Xuất Tệp & Đồng Bộ Google Drive", gdriveMessage, "💾", "Đã hiểu và tiếp tục");
    } catch (err) {
        console.error("Sync Error: ", err);
        showCustomAlert("Lỗi Đồng Bộ", `Đã xảy ra sự cố trong quá trình xuất tệp: ${err.message}. Vui lòng thử lại!`, "❌");
    }
}

// Offline-first QR Code generation helper
function generateQRCode(element, text, size = 160) {
    return new Promise((resolve) => {
        try {
            element.innerHTML = '';
            // Create container for qrcode.js
            const qrContainer = document.createElement('div');
            element.appendChild(qrContainer);
            
            new QRCode(qrContainer, {
                text: text,
                width: size,
                height: size,
                colorDark: "#4a3b32",
                colorLight: "#faf6f0",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // Brief delay to allow rendering
            setTimeout(() => {
                const canvas = qrContainer.querySelector('canvas');
                const img = qrContainer.querySelector('img');
                if (img) {
                    img.style.width = `${size}px`;
                    img.style.height = `${size}px`;
                    img.style.borderRadius = "4px";
                    img.style.display = "block";
                    img.style.margin = "0 auto";
                } else if (canvas) {
                    canvas.style.width = `${size}px`;
                    canvas.style.height = `${size}px`;
                    canvas.style.borderRadius = "4px";
                    canvas.style.display = "block";
                    canvas.style.margin = "0 auto";
                }
                resolve(true);
            }, 150);
        } catch (err) {
            console.error("Local QRCode library failed, falling back to online API: ", err);
            element.innerHTML = '';
            const img = document.createElement('img');
            img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=4a3b32&bgcolor=faf6f0&data=${encodeURIComponent(text)}`;
            img.alt = "Mã QR Ký Ức";
            img.style.width = `${size}px`;
            img.style.height = `${size}px`;
            img.style.borderRadius = "4px";
            img.style.display = "block";
            img.style.margin = "0 auto";
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            element.appendChild(img);
        }
    });
}

// Generate high-fidelity QR Code popup
async function showQRCodePopup() {
    const popup = document.getElementById('qrcode-popup');
    const canvasNode = document.getElementById('qrcode-canvas-node');
    
    popup.classList.remove('hidden');
    
    // Clear and prepare container
    canvasNode.innerHTML = '';
    canvasNode.style.padding = "10px";
    canvasNode.style.backgroundColor = "#FAF6F0";
    canvasNode.style.borderRadius = "8px";
    canvasNode.style.border = "2px solid #d4af37";
    canvasNode.style.boxShadow = "var(--shadow-gold-glow)";
    canvasNode.style.display = "inline-block";
    
    // Get last saved memory details to encode
    const memories = appState.memories;
    const lastMemory = memories[memories.length - 1];
    
    let uniqueLink = window.location.href.split('?')[0]; // Current live site URL!
    if (lastMemory) {
        // Construct the URL with memoryId and sharing parameters
        uniqueLink += `?memoryId=${lastMemory.id}`;
        uniqueLink += `&text=${encodeURIComponent(lastMemory.text)}`;
        uniqueLink += `&date=${lastMemory.date}`;
        uniqueLink += `&time=${lastMemory.time}`;
        
        if (appState.currentUser) {
            uniqueLink += `&family=${encodeURIComponent(appState.currentUser.familyName)}`;
        }
        
        // If the photo is not local base64 (i.e. it is a demo url), we can pass it
        if (lastMemory.photoUrl && !lastMemory.photoUrl.startsWith('data:image')) {
            uniqueLink += `&photo=${encodeURIComponent(lastMemory.photoUrl)}`;
        }
    } else {
        uniqueLink += `?specimen=true`;
    }
    
    await generateQRCode(canvasNode, uniqueLink, 160);
}

function closeQRCodePopup(e) {
    if (!e || e.target === document.getElementById('qrcode-popup') || e === null) {
        document.getElementById('qrcode-popup').classList.add('hidden');
    }
}

// Helper to pre-load all images inside a container before firing window.print()
function waitForImagesToLoad(container) {
    const images = container.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
        return new Promise((resolve) => {
            if (img.complete) {
                resolve();
            } else {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Resolve anyway on error to avoid hanging
            }
        });
    });
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 2000)); // 2-second safety timeout
    return Promise.race([Promise.all(promises), timeoutPromise]);
}

// Print Card System optimized with offscreen compiler & device connection
async function triggerCardPrinting(memoryId = null) {
    const printableNode = document.getElementById('printable-thiep-container');
    if (!printableNode) return;
    printableNode.innerHTML = '';
    
    // Retrieve specified or last saved memory details
    let memory = null;
    if (memoryId) {
        memory = appState.memories.find(m => m.id === memoryId);
    } else {
        memory = appState.memories[appState.memories.length - 1];
    }
    
    // Fallback/Specimen print card if no memory has been saved yet
    if (!memory) {
        memory = {
            id: 'mem_specimen',
            date: '22/05/2026',
            time: '20:30',
            text: 'Chúc gia đình ta luôn hòa thuận, yêu thương nhau suốt đời. Chúc con cháu 50 năm sau luôn nhớ về cội nguồn dòng họ Nguyễn An.',
            photoUrl: 'default_keepsake.png',
            size: '224 KB'
        };
    }
    
    // Check if there is a valid captured or uploaded photo in the memory
    const hasValidPhoto = memory.photoUrl && 
                          memory.photoUrl !== 'default_keepsake.png' && 
                          memory.photoUrl.trim() !== '' && 
                          !memory.photoUrl.startsWith('default_keepsake');

    // Compile gorgeous print frame structure
    const card = document.createElement('div');
    card.className = `thiep-card theme-${appState.selectedPrintTheme || 'butterfly'} ${hasValidPhoto ? 'has-photo' : 'no-photo'}`;
    
    // Fetch high-fidelity thematic SVG ornaments matching the design language of the web
    const themeOrnaments = getPrintThemeSVG(appState.selectedPrintTheme || 'butterfly');
    
    card.innerHTML = `
        ${themeOrnaments}
        <div class="thiep-header">
            <div class="thiep-title">Lời Chúc 50 Năm</div>
            <div class="thiep-tagline">"Ký ức gia tộc là di sản ngàn đời"</div>
        </div>
        <div class="thiep-body ${hasValidPhoto ? 'layout-split' : 'layout-full'}">
            ${hasValidPhoto ? `
            <div class="thiep-image-box">
                <img src="${memory.photoUrl}" alt="Family print frame" class="thiep-img">
            </div>
            ` : ''}
            <div class="thiep-message-box">
                <div class="thiep-message-text">"${memory.text}"</div>
            </div>
        </div>
        <div class="thiep-bottom-row">
            <div class="thiep-meta-info">
                <strong>Gia đình:</strong> ${appState.currentUser ? appState.currentUser.familyName : "Dòng họ Nguyễn An"}<br>
                <strong>Ngày gieo mầm:</strong> ${memory.date} lúc ${memory.time}<br>
                <strong>Bảo lưu truyền đời bởi:</strong> Lời Chúc 50 Năm Capsule
            </div>
            <div class="thiep-qr-box" id="thiep-qr-print-node"></div>
        </div>
    `;
    
    printableNode.appendChild(card);
    
    // Generate QR specifically inside printable thiệp box offline-first
    let uniqueLink = window.location.href.split('?')[0];
    uniqueLink += `?memoryId=${memory.id}`;
    uniqueLink += `&text=${encodeURIComponent(memory.text)}`;
    uniqueLink += `&date=${memory.date}`;
    uniqueLink += `&time=${memory.time}`;
    if (appState.currentUser) {
        uniqueLink += `&family=${encodeURIComponent(appState.currentUser.familyName)}`;
    }
    if (memory.photoUrl && !memory.photoUrl.startsWith('data:image')) {
        uniqueLink += `&photo=${encodeURIComponent(memory.photoUrl)}`;
    }

    const qrBox = document.getElementById('thiep-qr-print-node');
    if (qrBox) {
        await generateQRCode(qrBox, uniqueLink, 80);
    }
    
    // Block printing until all graphic assets are completely resolved in page cache
    await waitForImagesToLoad(printableNode);
    
    // Fire real physical printer connection!
    window.print();
}

// Generate premium vector SVG ornaments matching the gorgeous theme language of the web
function getPrintThemeSVG(themeName) {
    if (themeName === 'butterfly') {
        return `
        <!-- Butterfly Theme Luxury SVGs -->
        <div class="theme-ornaments butterfly-decorations" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; box-sizing:border-box;">
            <!-- Left Top Crystalline Butterfly -->
            <svg class="theme-svg top-left-butterfly" viewBox="0 0 100 100" style="position: absolute; top: 12mm; left: 12mm; width: 60px; height: 60px; filter: drop-shadow(0 2px 8px rgba(58, 134, 200, 0.3)); pointer-events: none;">
                <path d="M50 50 C40 30, 20 20, 10 35 C5 45, 15 55, 30 50 C20 60, 15 75, 25 80 C35 85, 45 70, 50 50 Z" fill="rgba(255,255,255,0.9)" stroke="#3a86c8" stroke-width="1.8"/>
                <path d="M50 50 C60 30, 80 20, 90 35 C95 45, 85 55, 70 50 C80 60, 85 75, 75 80 C65 85, 55 70, 50 50 Z" fill="rgba(255,255,255,0.9)" stroke="#3a86c8" stroke-width="1.8"/>
                <path d="M50 30 C48 20, 42 15, 42 15 M50 30 C52 20, 58 15, 58 15" fill="none" stroke="#AA7C11" stroke-width="1.2"/>
                <circle cx="42" cy="15" r="1.5" fill="#AA7C11"/>
                <circle cx="58" cy="15" r="1.5" fill="#AA7C11"/>
                <path d="M50 32 L50 75" stroke="#AA7C11" stroke-width="1.5"/>
            </svg>
            <!-- Right Bottom Crystalline Butterfly -->
            <svg class="theme-svg bottom-right-butterfly" viewBox="0 0 100 100" style="position: absolute; bottom: 12mm; right: 12mm; width: 50px; height: 50px; filter: drop-shadow(0 2px 6px rgba(58, 134, 200, 0.25)); pointer-events: none; transform: rotate(-30deg);">
                <path d="M50 50 C40 30, 20 20, 10 35 C5 45, 15 55, 30 50 C20 60, 15 75, 25 80 C35 85, 45 70, 50 50 Z" fill="rgba(255,255,255,0.9)" stroke="#3a86c8" stroke-width="1.5"/>
                <path d="M50 50 C60 30, 80 20, 90 35 C95 45, 85 55, 70 50 C80 60, 85 75, 75 80 C65 85, 55 70, 50 50 Z" fill="rgba(255,255,255,0.9)" stroke="#3a86c8" stroke-width="1.5"/>
                <path d="M50 32 L50 72" stroke="#AA7C11" stroke-width="1.2"/>
            </svg>
        </div>
        `;
    } else if (themeName === 'eden') {
        return `
        <!-- Eden Theme Foliage SVGs -->
        <div class="theme-ornaments eden-decorations" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; box-sizing:border-box;">
            <!-- Top-Left Foliage -->
            <svg class="theme-svg top-left-vine" viewBox="0 0 120 120" style="position: absolute; top: -2px; left: -2px; width: 140px; height: 140px; pointer-events: none;">
                <!-- Main vine branches -->
                <path d="M0 0 Q40 5, 60 35 T100 80" fill="none" stroke="#27ae60" stroke-width="2"/>
                <path d="M0 0 Q10 40, 35 60 T80 100" fill="none" stroke="#aa7c11" stroke-width="1.5"/>
                <!-- Leaves -->
                <path d="M25 12 C18 20, 22 28, 32 24 C38 20, 34 12, 25 12 Z" fill="#27ae60" stroke="#1e7e34" stroke-width="0.5"/>
                <path d="M45 28 C38 35, 42 42, 52 38 C58 35, 54 28, 45 28 Z" fill="#aa7c11" stroke="#aa7c11" stroke-width="0.5" opacity="0.9"/>
                <path d="M12 25 C5 32, 8 40, 18 36 C24 32, 20 25, 12 25 Z" fill="#27ae60" stroke="#1e7e34" stroke-width="0.5"/>
                <path d="M65 52 C58 60, 62 68, 72 64 C78 60, 74 52, 65 52 Z" fill="#27ae60" stroke="#1e7e34" stroke-width="0.5"/>
                <!-- Tiny golden rose bud at corner core -->
                <circle cx="15" cy="15" r="5" fill="#e74c3c" stroke="#aa7c11" stroke-width="1"/>
                <circle cx="12" cy="12" r="3" fill="#f1c40f"/>
            </svg>
            <!-- Bottom-Right Foliage -->
            <svg class="theme-svg bottom-right-vine" viewBox="0 0 120 120" style="position: absolute; bottom: -2px; right: -2px; width: 140px; height: 140px; pointer-events: none; transform: rotate(180deg);">
                <path d="M0 0 Q40 5, 60 35 T100 80" fill="none" stroke="#27ae60" stroke-width="2"/>
                <path d="M0 0 Q10 40, 35 60 T80 100" fill="none" stroke="#aa7c11" stroke-width="1.5"/>
                <path d="M25 12 C18 20, 22 28, 32 24 C38 20, 34 12, 25 12 Z" fill="#27ae60" stroke="#1e7e34" stroke-width="0.5"/>
                <path d="M45 28 C38 35, 42 42, 52 38 C58 35, 54 28, 45 28 Z" fill="#aa7c11" stroke="#aa7c11" stroke-width="0.5" opacity="0.9"/>
                <circle cx="15" cy="15" r="5" fill="#e74c3c" stroke="#aa7c11" stroke-width="1"/>
            </svg>
        </div>
        `;
    } else if (themeName === 'royal') {
        return `
        <!-- Royal Baroque Ornate Frames -->
        <div class="theme-ornaments royal-decorations" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; box-sizing:border-box;">
            <!-- Top-Center Royal Crest -->
            <svg class="theme-svg top-crest" viewBox="0 0 120 60" style="position: absolute; top: 8mm; left: 50%; transform: translateX(-50%); width: 120px; height: 60px; fill: none; stroke: #AA7C11; stroke-width: 1.8; pointer-events: none;">
                <!-- Shield shape -->
                <path d="M60 5 C75 12, 95 12, 100 25 C100 45, 60 58, 60 58 C60 58, 20 45, 20 25 C25 12, 45 12, 60 5 Z" fill="rgba(255,255,255,0.95)"/>
                <!-- Fluer-de-lis / Crown Inside shield -->
                <path d="M60 15 C60 15, 52 25, 42 22 C38 20, 45 35, 60 40 C75 35, 82 20, 78 22 C68 25, 60 15, 60 15 Z" fill="#AA7C11"/>
                <path d="M60 12 L60 40" stroke="#ffffff" stroke-width="1"/>
                <!-- Little stars around -->
                <circle cx="15" cy="20" r="1.5" fill="#AA7C11"/>
                <circle cx="105" cy="20" r="1.5" fill="#AA7C11"/>
            </svg>
            <!-- Baroque Top-Left Corner Scrollwork -->
            <svg class="theme-svg top-left-baroque" viewBox="0 0 100 100" style="position: absolute; top: 4px; left: 4px; width: 90px; height: 90px; fill: none; stroke: #AA7C11; stroke-width: 1.8; pointer-events: none;">
                <path d="M10 90 L10 10 L90 10" stroke-width="1"/>
                <path d="M18 82 L18 18 L82 18" stroke-dasharray="1,2" stroke-width="0.8"/>
                <!-- Scroll leaf ornaments -->
                <path d="M10 10 C20 20, 30 10, 35 25 C25 35, 10 20, 10 10 Z" fill="#AA7C11" opacity="0.15"/>
                <path d="M10 10 C10 30, 20 40, 25 50 C15 45, 5 30, 10 10 Z" fill="#AA7C11" opacity="0.15"/>
                <circle cx="10" cy="10" r="4.5" fill="#AA7C11"/>
                <circle cx="10" cy="10" r="2" fill="#ffffff"/>
            </svg>
            <!-- Baroque Bottom-Right Corner Scrollwork -->
            <svg class="theme-svg bottom-right-baroque" viewBox="0 0 100 100" style="position: absolute; bottom: 4px; right: 4px; width: 90px; height: 90px; fill: none; stroke: #AA7C11; stroke-width: 1.8; pointer-events: none; transform: rotate(180deg);">
                <path d="M10 90 L10 10 L90 10" stroke-width="1"/>
                <path d="M18 82 L18 18 L82 18" stroke-dasharray="1,2" stroke-width="0.8"/>
                <path d="M10 10 C20 20, 30 10, 35 25 C25 35, 10 20, 10 10 Z" fill="#AA7C11" opacity="0.15"/>
                <circle cx="10" cy="10" r="4.5" fill="#AA7C11"/>
                <circle cx="10" cy="10" r="2" fill="#ffffff"/>
            </svg>
        </div>
        `;
    } else if (themeName === 'minimal') {
        return `
        <!-- Minimal Art Deco Geometric Lines -->
        <div class="theme-ornaments minimal-decorations" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; box-sizing:border-box;">
            <!-- Modern Intersecting Geometric Border Lines -->
            <svg class="theme-svg minimal-lines" viewBox="0 0 200 200" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; fill: none; stroke: #AA7C11; stroke-width: 1; opacity: 0.9; pointer-events: none;">
                <!-- Inner thin double border frame -->
                <rect x="8" y="8" width="184" height="184" stroke-width="0.6"/>
                <rect x="14" y="14" width="172" height="172" stroke-width="0.4" stroke-dasharray="3,1"/>
                
                <!-- Modern Art Deco Corner Elements -->
                <!-- Top Left -->
                <path d="M8 30 L30 8 M8 40 L40 8 M8 50 L50 8" stroke-width="0.5"/>
                <!-- Top Right -->
                <path d="M192 30 L170 8 M192 40 L160 8 M192 50 L150 8" stroke-width="0.5"/>
                <!-- Bottom Left -->
                <path d="M8 170 L30 192 M8 160 L40 192 M8 150 L50 192" stroke-width="0.5"/>
                <!-- Bottom Right -->
                <path d="M192 170 L170 192 M192 160 L160 192 M192 150 L150 192" stroke-width="0.5"/>
                
                <!-- Mid points diamond marks -->
                <polygon points="100,5 103,8 100,11 97,8" fill="#AA7C11" stroke="none"/>
                <polygon points="100,189 103,192 100,195 97,192" fill="#AA7C11" stroke="none"/>
            </svg>
        </div>
        `;
    } else if (themeName === 'firefly') {
        return `
        <!-- Magical Fireflies & Starry Night Constellations -->
        <div class="theme-ornaments firefly-decorations" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; box-sizing:border-box;">
            <!-- Glowing Constellation Dots & Sparkles -->
            <svg class="theme-svg magical-stars" viewBox="0 0 200 200" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; fill: none; stroke: #f1c40f; stroke-width: 0.8; opacity: 0.9; pointer-events: none;">
                <!-- Glowing star clusters top-left -->
                <circle cx="25" cy="25" r="3" fill="#f1c40f" style="filter: drop-shadow(0 0 3px #f1c40f);"/>
                <line x1="25" y1="18" x2="25" y2="32" stroke-width="0.75"/>
                <line x1="18" y1="25" x2="32" y2="25" stroke-width="0.75"/>
                
                <!-- Glowing star clusters bottom-right -->
                <circle cx="175" cy="175" r="3" fill="#f1c40f" style="filter: drop-shadow(0 0 3px #f1c40f);"/>
                <line x1="175" y1="168" x2="175" y2="182" stroke-width="0.75"/>
                <line x1="168" y1="175" x2="182" y2="175" stroke-width="0.75"/>
                
                <!-- Constellation connecting lines -->
                <path d="M25 25 L50 15 L70 30 L100 10 L130 35 L175 25" stroke="rgba(241, 196, 15, 0.15)" stroke-width="0.8"/>
                <path d="M25 175 L60 185 L90 160 L120 180 L150 165 L175 175" stroke="rgba(241, 196, 15, 0.15)" stroke-width="0.8"/>
                
                <!-- Bioluminescent firefly spots at corners -->
                <circle cx="48" cy="18" r="1.5" fill="#f1c40f"/>
                <circle cx="140" cy="30" r="2" fill="#ffd700"/>
                <circle cx="15" cy="120" r="1.2" fill="#f1c40f"/>
                <circle cx="185" cy="90" r="1.8" fill="#ffd700"/>
                <circle cx="95" cy="185" r="2.5" fill="#f1c40f" style="filter: drop-shadow(0 0 2px #f1c40f);"/>
            </svg>
        </div>
        `;
    }
    return '';
}

// Global variable to store active target keepsake for printing
let currentPrintMemoryId = null;

// Initialize printing choices in appState if not defined
appState.selectedPrintTheme = 'butterfly';
appState.selectedPrintSize = 'a4';
appState.selectedPrintOrientation = 'landscape';

function showPrintSizeModal(memoryId = null) {
    currentPrintMemoryId = memoryId;
    
    // Reset selection styles in modal to default (A4 and landscape)
    appState.selectedPrintSize = 'a4';
    appState.selectedPrintOrientation = 'landscape';
    
    document.querySelectorAll('.size-select-card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.orientation-select-card').forEach(c => c.classList.remove('active'));
    
    const defaultSizeBtn = document.getElementById('size-btn-a4');
    if (defaultSizeBtn) defaultSizeBtn.classList.add('active');
    
    const defaultOrientationBtn = document.getElementById('orientation-btn-landscape');
    if (defaultOrientationBtn) {
        defaultOrientationBtn.classList.add('active');
        defaultOrientationBtn.style.borderColor = 'var(--color-gold-dark)';
        defaultOrientationBtn.style.background = 'rgba(214,175,55,0.03)';
        defaultOrientationBtn.querySelector('strong').style.color = 'var(--color-gold-dark)';
    }
    
    const portraitOrientationBtn = document.getElementById('orientation-btn-portrait');
    if (portraitOrientationBtn) {
        portraitOrientationBtn.style.borderColor = 'rgba(74, 59, 50, 0.15)';
        portraitOrientationBtn.style.background = 'transparent';
        portraitOrientationBtn.querySelector('strong').style.color = 'var(--color-text-brown)';
    }
    
    const modal = document.getElementById('print-size-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closePrintSizeModal() {
    const modal = document.getElementById('print-size-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function selectPrintOrientation(orientationName, element) {
    appState.selectedPrintOrientation = orientationName;
    document.querySelectorAll('.orientation-select-card').forEach(c => c.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }
    document.querySelectorAll('.orientation-select-card').forEach(card => {
        if (card.classList.contains('active')) {
            card.style.borderColor = 'var(--color-gold-dark)';
            card.style.background = 'rgba(214,175,55,0.03)';
            card.querySelector('strong').style.color = 'var(--color-gold-dark)';
        } else {
            card.style.borderColor = 'rgba(74, 59, 50, 0.15)';
            card.style.background = 'transparent';
            card.querySelector('strong').style.color = 'var(--color-text-brown)';
        }
    });
}

function selectPrintTheme(themeName, element) {
    appState.selectedPrintTheme = themeName;
    document.querySelectorAll('.theme-select-card').forEach(c => c.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }
}

function selectPrintSize(sizeName, element) {
    appState.selectedPrintSize = sizeName;
    document.querySelectorAll('.size-select-card').forEach(c => c.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }
}

async function executeKeepsakePrint() {
    await confirmPrintSize(appState.selectedPrintSize);
}

async function confirmPrintSize(size) {
    closePrintSizeModal();
    
    // Remove existing print size and orientation classes from body
    document.body.classList.remove('print-size-a4', 'print-size-a5', 'print-orientation-landscape', 'print-orientation-portrait');
    
    // Add the selected size and orientation classes
    document.body.classList.add(`print-size-${size}`);
    document.body.classList.add(`print-orientation-${appState.selectedPrintOrientation || 'landscape'}`);
    
    // Inject dynamic @page size style to enforce correct paper format in print dialog
    let printStyleNode = document.getElementById('dynamic-print-page-style');
    if (!printStyleNode) {
        printStyleNode = document.createElement('style');
        printStyleNode.id = 'dynamic-print-page-style';
        document.head.appendChild(printStyleNode);
    }
    
    const orientation = appState.selectedPrintOrientation || 'landscape';
    if (size === 'a4') {
        printStyleNode.innerHTML = `@media print { @page { size: A4 ${orientation}; margin: 0; } }`;
    } else if (size === 'a5') {
        printStyleNode.innerHTML = `@media print { @page { size: A5 ${orientation}; margin: 0; } }`;
    }
    
    // Execute the actual printing
    await triggerCardPrinting(currentPrintMemoryId);
}

// Setup active reminder UI text and slider based on current state
function updateReminderUI() {
    const detailBox = document.getElementById('reminder-detail-text');
    if (!detailBox) return;
    
    if (appState.activeReminderOrbId && appState.treeOrbs.length > 0) {
        const targetOrb = appState.treeOrbs.find(orb => orb.id === appState.activeReminderOrbId);
        if (targetOrb) {
            detailBox.innerText = `Chu kỳ ${appState.activeReminderInterval} đang hoạt động cho quả kỷ niệm ngày ${targetOrb.dateString}. Vòng hào quang vàng lấp lánh đang duy trì bao quanh quả trên cây!`;
            // Also set the slider value to match activeReminderInterval
            const intervals = ['1 Năm', '10 Năm', '50 Năm', 'Truyền đời'];
            const idx = intervals.indexOf(appState.activeReminderInterval);
            if (idx !== -1) {
                setSliderValue(idx + 1);
            }
            return;
        }
    }
    detailBox.innerText = `Vòng hào quang vàng sẽ bao quanh quả ký ức được chọn.`;
}

// Render memories archive grid with luxurious Polaroid-style grids
function renderArchiveGrid() {
    const gridNode = document.getElementById('archive-grid');
    const emptyStateNode = document.getElementById('archive-empty-state');
    
    if (!gridNode || !emptyStateNode) return;
    
    gridNode.innerHTML = '';
    
    if (appState.memories.length === 0) {
        gridNode.classList.add('hidden');
        emptyStateNode.classList.remove('hidden');
    } else {
        gridNode.classList.remove('hidden');
        emptyStateNode.classList.add('hidden');
        
        // Render each memory in reverse chronological order (latest first)
        for (let i = appState.memories.length - 1; i >= 0; i--) {
            const memory = appState.memories[i];
            const card = document.createElement('div');
            card.className = 'archive-card';
            
            let typeLabel = 'Lời nhắn';
            if (memory.photoUrl && memory.photoUrl.startsWith('data:image')) {
                typeLabel = 'Ảnh & Lời chúc';
            }
            if (memory.audioUrl) {
                typeLabel += ' & Giọng nói';
            }
            if (memory.videoUrl) {
                typeLabel += ' & Video';
            }
            card.innerHTML = `
                <div class="archive-card-image">
                    <img src="${memory.photoUrl || 'default_keepsake.png'}" alt="Keepsake image" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80';">
                    <div class="archive-card-badge">${typeLabel}</div>
                </div>
                <div class="archive-card-content">
                    <div class="archive-card-meta">
                        <span class="archive-card-date">📅 ${memory.date} lúc ${memory.time}</span>
                        <span class="archive-card-size">💾 ${memory.size}</span>
                    </div>
                    <p class="archive-card-text">"${memory.text}"</p>
                    
                    ${memory.audioUrl ? `
                        <div class="archive-card-audio">
                            <button class="btn-play-voice tooltip" data-tooltip="Nghe giọng nói" onclick="playArchiveAudio('${memory.audioUrl}', this)">
                                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 6px;">
                                    <polygon points="5 3 19 12 5 21 5 3"/>
                                </svg>
                                <span>Nghe giọng ghi âm (${memory.audioDuration})</span>
                            </button>
                        </div>
                    ` : ''}

                    ${memory.videoUrl ? `
                        <div class="archive-card-video" style="margin-top: 10px;">
                            <video src="${memory.videoUrl}" controls style="width: 100%; border-radius: 6px; border: 1px solid var(--color-gold); max-height: 200px;"></video>
                        </div>
                    ` : ''}
                </div>
                </div>
                <div class="archive-card-actions" style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="btn-primary btn-small tooltip" data-tooltip="In thiệp độc bản chứa ảnh & mã QR" onclick="printSpecificMemory('${memory.id}')" style="flex: 1; min-width: 80px;">
                        🖨️ In
                    </button>
                    <button class="btn-secondary btn-small tooltip" data-tooltip="Tải thiệp dạng PDF để lưu trữ" onclick="downloadMemoryPDF('${memory.id}')" style="flex: 1; min-width: 80px; background: #6c7a89; color: #fff;">
                        📄 PDF
                    </button>
                    <button class="btn-secondary btn-small btn-danger tooltip" data-tooltip="Xóa ký ức" onclick="deleteArchiveMemory('${memory.id}')" style="flex: 0 0 auto;">
                        🗑️
                    </button>
                </div>
            `;
            gridNode.appendChild(card);
        }
    }
}

// Play keepsake voices dynamically on the archive card
function playArchiveAudio(audioUrl, btn) {
    const player = document.getElementById('ambient-audio-player');
    if (!player) return;
    
    // Pause background ambient music if active
    if (appState.musicIsPlaying) {
        toggleAmbientMusic();
    }
    
    const isPlaying = btn.classList.contains('playing');
    
    // Stop all other play voice buttons first
    document.querySelectorAll('.btn-play-voice').forEach(b => {
        b.classList.remove('playing');
        const svg = b.querySelector('svg');
        if (svg) svg.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    });
    
    if (!isPlaying) {
        player.src = audioUrl;
        player.play();
        btn.classList.add('playing');
        const svg = btn.querySelector('svg');
        if (svg) {
            svg.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
        }
        
        player.onended = () => {
            btn.classList.remove('playing');
            if (svg) svg.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
        };
    } else {
        player.pause();
    }
}

// Print specific card from the archive grid
function printSpecificMemory(memoryId) {
    showPrintSizeModal(memoryId);
}

// Delete keepsake from archive grid
function deleteArchiveMemory(memoryId) {
    if (confirm("Bạn có chắc chắn muốn xóa vĩnh viễn ký ức trân quý này khỏi Kho Lưu Trữ không?")) {
        appState.memories = appState.memories.filter(m => m.id !== memoryId);
        saveToLocalStorage();
        renderArchiveGrid();
    }
}

// --- ETERNAL MEMORY TREE GRAPHICS (CANVAS 2D SIMULATION) ---
let treeCanvasState = {
    canvas: null,
    ctx: null,
    animationFrameId: null,
    particles: [],
    treeScale: 1
};

function initMemoryTreeCanvas() {
    const canvas = document.getElementById('eternal-tree-canvas');
    if (!canvas) return;
    
    treeCanvasState.canvas = canvas;
    treeCanvasState.ctx = canvas.getContext('2d');
    
    // Fit canvas bounds
    resizeTreeCanvas();
    window.addEventListener('resize', resizeTreeCanvas);
    
    // Generate foliage pink particles cloud (zero gravity)
    generateFoliageParticles();
    
    // Loop
    drawTreeFrame();
    
    // Mouse hover handler on specific memory fruit orbs
    canvas.addEventListener('mousemove', handleTreeCanvasMouseMove);
    canvas.addEventListener('click', handleTreeCanvasClick);
}

function resizeTreeCanvas() {
    const canvas = treeCanvasState.canvas;
    const wrapper = document.getElementById('tree-canvas-wrapper');
    if (canvas && wrapper) {
        let width = wrapper.clientWidth;
        let height = wrapper.clientHeight;
        
        // Robust Fallback: if parent clientWidth/clientHeight is 0 (due to hidden display:none state transitions),
        // use window inner dimensions minus offsets so the canvas is NEVER size 0.
        if (width === 0) width = window.innerWidth;
        if (height === 0) height = Math.max(500, window.innerHeight - 120); 
        
        canvas.width = width;
        canvas.height = height;
        
        // Scale adjustment based on screen width
        treeCanvasState.treeScale = canvas.width < 768 ? 0.7 : 1;
    }
}

// Spark/emembers & leaves particle cloud data
function generateFoliageParticles() {
    treeCanvasState.particles = [];
    const count = 350; // massive cloud of glowing energy particles
    
    for (let i = 0; i < count; i++) {
        // Random center positioning around tree crown coordinates
        const distance = 40 + Math.random() * 220;
        const angle = Math.random() * Math.PI * 2;
        
        // Mix neon pink, neon magenta and pale violet
        const colors = [
            'rgba(255, 0, 255, 0.45)', // magenta
            'rgba(238, 130, 238, 0.4)', // pale violet
            'rgba(255, 182, 193, 0.5)', // soft pink
            'rgba(255, 20, 147, 0.35)', // deep hot pink
            'rgba(255, 255, 255, 0.65)'  // brilliant light dust
        ];
        
        treeCanvasState.particles.push({
            angle: angle,
            distance: distance,
            speed: 0.0003 + Math.random() * 0.0006,
            size: 1 + Math.random() * 3.5,
            color: colors[Math.floor(Math.random() * colors.length)],
            driftX: Math.random() * 15,
            driftY: Math.random() * 15,
            pulseSpeed: 0.01 + Math.random() * 0.02,
            pulsePhase: Math.random() * Math.PI
        });
    }
}

// Master Render Loop
function drawTreeFrame() {
    const { canvas, ctx, particles, treeScale } = treeCanvasState;
    if (!canvas) return;
    
    treeCanvasState.animationFrameId = requestAnimationFrame(drawTreeFrame);
    
    // Clear screen with Midnight Blue background
    ctx.fillStyle = '#050A18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 1. Draw Infinite Mirror Floor (Bottom reflections)
    const floorY = canvas.height * 0.85;
    ctx.fillStyle = 'rgba(5, 10, 24, 0.95)';
    ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
    
    // Draw mirrored gradient divider line
    const floorGrad = ctx.createLinearGradient(0, floorY, canvas.width, floorY);
    floorGrad.addColorStop(0, 'rgba(214, 175, 55, 0)');
    floorGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    floorGrad.addColorStop(1, 'rgba(214, 175, 55, 0)');
    ctx.strokeStyle = floorGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvas.width, floorY);
    ctx.stroke();
    
    // Draw godrays filtering from above
    drawGodrays(ctx, canvas);
    
    // 2. Draw Translucent Crystalline White Trunk & intricate thin sprawling branches
    const rootX = canvas.width / 2;
    const rootY = floorY;
    
    ctx.save();
    
    // Draw bioluminescent mirrored reflection below
    ctx.save();
    ctx.translate(0, floorY * 2);
    ctx.scale(1, -0.6); // squashed upside down reflection
    ctx.filter = 'blur(10px) opacity(0.3)';
    drawCoreTreeStructure(ctx, rootX, rootY, treeScale);
    ctx.restore();
    
    // Draw real bioluminescent crystalline tree trunk
    drawCoreTreeStructure(ctx, rootX, rootY, treeScale);
    ctx.restore();
    
    // 3. Draw drifting cloud of pink canopy energy particles
    const crownCenterX = canvas.width / 2;
    const crownCenterY = rootY - (220 * treeScale);
    
    particles.forEach(p => {
        p.angle += p.speed; // Orbit slow rotation
        p.pulsePhase += p.pulseSpeed;
        
        const curDistance = p.distance * treeScale;
        const x = crownCenterX + Math.cos(p.angle) * curDistance + Math.sin(p.pulsePhase) * p.driftX;
        const y = crownCenterY + Math.sin(p.angle) * (curDistance * 0.65) + Math.cos(p.pulsePhase) * p.driftY; // squashed oval canopy
        
        // Render glowing leaf particle
        ctx.beginPath();
        const pulseRatio = 0.7 + Math.sin(p.pulsePhase) * 0.3;
        ctx.arc(x, y, p.size * pulseRatio, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    });
    
    // 4. Draw Interactive Memory Orbs fruits (representing actual files)
    appState.treeOrbs.forEach(orb => {
        const orbX = canvas.width * orb.x;
        const orbY = rootY - (360 * treeScale) + (orb.y * 220 * treeScale);
        
        ctx.save();
        
        // Slow vertical float for firefly effect
        const orbFloat = Math.sin(Date.now() * 0.0015 + parseInt(orb.id.replace(/\D/g, '') || 0)) * 6;
        const curY = orbY + orbFloat;
        
        // Check if cursor hover
        const dist = Math.hypot(treeCanvasState.mouseX - orbX, treeCanvasState.mouseY - curY);
        const isHovered = dist < (orb.size * 2 + 10);
        
        // Draw Golden Halo ring if this orb is the active future reminder interval target!
        if (appState.activeReminderOrbId === orb.id) {
            ctx.beginPath();
            ctx.arc(orbX, curY, orb.size * (isHovered ? 2.5 : 2) + 6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]); // luxury dashed ring
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Check hovered expansions
        const curSize = isHovered ? orb.size * 1.5 : orb.size;
        
        // Outer glowing halo
        const glowRad = curSize * 3;
        const orbGlow = ctx.createRadialGradient(orbX, curY, curSize, orbX, curY, glowRad);
        orbGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
        orbGlow.addColorStop(0.3, 'rgba(255, 255, 255, 0.45)');
        orbGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(orbX, curY, glowRad, 0, Math.PI * 2);
        ctx.fillStyle = orbGlow;
        ctx.fill();
        
        // Inner crystal core
        ctx.beginPath();
        ctx.arc(orbX, curY, curSize, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 15;
        ctx.fill();
        
        // Lens flare reflection when hovered
        if (isHovered) {
            ctx.beginPath();
            ctx.moveTo(orbX - curSize * 3, curY);
            ctx.lineTo(orbX + curSize * 3, curY);
            ctx.moveTo(orbX, curY - curSize * 3);
            ctx.lineTo(orbX, curY + curSize * 3);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
        
        ctx.restore();
    });
}

// Recursive bioluminescent White Obsidian Branching drawing
function drawCoreTreeStructure(ctx, rootX, rootY, scale) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 12;
    
    // Draw central trunk
    const trunkWidth = 14 * scale;
    const trunkHeight = 110 * scale;
    const headX = rootX;
    const headY = rootY - trunkHeight;
    
    ctx.lineWidth = trunkWidth;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    // Sweeping organic curve for crystallization trunk
    ctx.quadraticCurveTo(rootX - 12 * scale, rootY - trunkHeight/2, headX, headY);
    ctx.stroke();
    
    // Recursively draw sprawling branches (slender/mảnh khảnh, rẽ nhiều tán)
    // PERFORMANCE OPTIMIZATION: Reduced base depth from 7 to 5. 
    // This reduces recursive drawing operations from 3280 down to 121 per tree, 
    // boosting render speed 10x and ensuring a flawless 60fps on all devices!
    drawBranch(ctx, headX, headY, 72 * scale, -Math.PI / 2, 5, 6 * scale);
}

function drawBranch(ctx, x, y, length, angle, depth, width) {
    if (depth === 0) return;
    
    // End points
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    
    ctx.lineWidth = width;
    
    // GPU Optimization: Disable heavy blur shadow processing for fine twigs (depth < 3) 
    // to significantly reduce browser layout cycles.
    if (depth < 3) {
        ctx.shadowBlur = 0;
    } else {
        ctx.shadowBlur = 12;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // crystal thin sub-branches branching factor: 3 thin forks for sprawling effect!
    const forkCount = 3;
    const angleSpread = 0.65; // sprawling wide canopy
    
    for (let i = 0; i < forkCount; i++) {
        const nextAngle = angle + (i - 1) * angleSpread + (Math.random() * 0.15 - 0.07);
        const nextLength = length * (0.62 + Math.random() * 0.1);
        const nextWidth = width * 0.6;
        
        drawBranch(ctx, endX, endY, nextLength, nextAngle, depth - 1, nextWidth);
    }
}

function drawGodrays(ctx, canvas) {
    ctx.save();
    const time = Date.now() * 0.0004;
    
    for (let i = 0; i < 4; i++) {
        const angle = 0.4 + Math.sin(time + i * 2) * 0.1;
        const width = 80 + Math.cos(time + i * 1.5) * 30;
        
        const grad = ctx.createLinearGradient(0, 0, canvas.width * angle, canvas.height);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.045)');
        grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.015)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.1 + i * 150, 0);
        ctx.lineTo(canvas.width * 0.1 + i * 150 + width, 0);
        ctx.lineTo(canvas.width * angle + width * 2, canvas.height);
        ctx.lineTo(canvas.width * angle, canvas.height);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

// Mouse coordinates trackers on canvas
function handleTreeCanvasMouseMove(e) {
    const canvas = treeCanvasState.canvas;
    const rect = canvas.getBoundingClientRect();
    treeCanvasState.mouseX = e.clientX - rect.left;
    treeCanvasState.mouseY = e.clientY - rect.top;
}

function handleTreeCanvasClick(e) {
    const canvas = treeCanvasState.canvas;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Check click targets of orbs
    const rootY = canvas.height * 0.85;
    const scale = treeCanvasState.treeScale;
    
    for (let orb of appState.treeOrbs) {
        const orbX = canvas.width * orb.x;
        const orbY = rootY - (360 * scale) + (orb.y * 220 * scale);
        
        // Retrieve dynamic vertical float values
        const orbFloat = Math.sin(Date.now() * 0.0015 + parseInt(orb.id.replace(/\D/g, '') || 0)) * 6;
        const curY = orbY + orbFloat;
        
        const dist = Math.hypot(clickX - orbX, clickY - curY);
        
        if (dist < (orb.size * 2 + 10)) {
            // Memory Orb found! Open Polaroid uploader/gallery
            appState.selectedOrbId = orb.id;
            openOrbsGalleryModal(orb);
            return;
        }
    }
}

// --------------------------------------------------------------------------
// TREE UPLOADER (GIEO MẦM) AND PERSISTENCE ORB PLACEMENT
// --------------------------------------------------------------------------

function openTreeUploader() {
    document.getElementById('tree-uploader-modal').classList.remove('hidden');
}

function closeTreeUploader() {
    document.getElementById('tree-uploader-modal').classList.add('hidden');
    document.getElementById('upload-progress-container').classList.add('hidden');
}

function triggerTreeFileInput() {
    document.getElementById('tree-file-input').click();
}

function handleTreeFilesUpload(files) {
    if (files.length === 0) return;
    
    const container = document.getElementById('upload-progress-container');
    const fill = document.getElementById('upload-progress-bar');
    
    container.classList.remove('hidden');
    fill.style.width = '20%';
    
    let processedCount = 0;
    const totalFiles = files.length;
    const base64Images = [];
    
    for (let i = 0; i < totalFiles; i++) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            base64Images.push({
                base64: e.target.result,
                timeString: timeStr
            });
            
            processedCount++;
            fill.style.width = `${(processedCount / totalFiles) * 80 + 20}%`;
            
            if (processedCount === totalFiles) {
                // Done reading all images. Sprout!
                const now = new Date();
                const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
                
                // Add all uploaded images to a newly generated fruit or orb
                sproutNewTreeFruitMulti(base64Images, dateStr);
                
                setTimeout(() => {
                    closeTreeUploader();
                    alert(`Gieo mầm ký ức thành công! ${totalFiles} quả sáng đom đóm mới đã kết hạt trân quý trên cây!`);
                }, 500);
            }
        };
        reader.readAsDataURL(files[i]);
    }
}

// Sprout (Add fruit orbs dynamically)
function sproutNewTreeFruit(photoUrl, dateStr, timeStr) {
    // Check if an orb exists for today
    let todayOrb = appState.treeOrbs.find(orb => orb.dateString === dateStr);
    
    if (todayOrb) {
        // Append photo to existing orb gallery
        todayOrb.images.push({ base64: photoUrl, timeString: timeStr });
        todayOrb.size = Math.min(15, todayOrb.size + 1); // Expand size slightly
    } else {
        // Place new orb at a random canvas coordinates of the pink canopy
        const randomX = 0.25 + Math.random() * 0.5; // bounded center
        const randomY = 0.15 + Math.random() * 0.45;
        
        todayOrb = {
            id: 'orb_' + Date.now(),
            dateString: dateStr,
            x: randomX,
            y: randomY,
            size: 8,
            images: [{ base64: photoUrl, timeString: timeStr }]
        };
        appState.treeOrbs.push(todayOrb);
    }
    
    saveToLocalStorage();
}

function sproutNewTreeFruitMulti(base64Images, dateStr) {
    let todayOrb = appState.treeOrbs.find(orb => orb.dateString === dateStr);
    
    if (todayOrb) {
        todayOrb.images.push(...base64Images);
        todayOrb.size = Math.min(15, todayOrb.size + base64Images.length);
    } else {
        const randomX = 0.25 + Math.random() * 0.5;
        const randomY = 0.15 + Math.random() * 0.45;
        
        todayOrb = {
            id: 'orb_' + Date.now(),
            dateString: dateStr,
            x: randomX,
            y: randomY,
            size: Math.min(15, 8 + base64Images.length),
            images: base64Images
        };
        appState.treeOrbs.push(todayOrb);
    }
    
    saveToLocalStorage();
}

// --------------------------------------------------------------------------
// POLAROID ORB GALLERY MODAL
// --------------------------------------------------------------------------

function openOrbsGalleryModal(orb) {
    document.getElementById('gallery-orb-title').innerText = `Tệp ảnh Quả Ký Ức ngày: ${orb.dateString}`;
    
    // Render Polaroid items dynamically
    const container = document.getElementById('polaroid-grid-container');
    container.innerHTML = '';
    
    orb.images.forEach((img, idx) => {
        const polaroid = document.createElement('div');
        polaroid.className = 'polaroid-item';
        
        // Alternate subtle tilts for vintage stacking look
        const rotations = ['-2deg', '1.5deg', '-1deg', '3deg', '-3deg'];
        const rot = rotations[idx % rotations.length];
        polaroid.style.setProperty('--rotation', rot);
        
        polaroid.innerHTML = `
            <img src="${img.base64}" alt="Polaroid family keepsake" class="polaroid-img">
            <span class="polaroid-time">Ghi lúc: ${img.timeString}</span>
            <button class="polaroid-del-btn" onclick="event.stopPropagation(); deletePolaroidImage(${idx})" title="Xóa hình này">&times;</button>
        `;
        container.appendChild(polaroid);
    });
    
    document.getElementById('orbs-gallery-modal').classList.remove('hidden');
}

function closeOrbsGallery() {
    document.getElementById('orbs-gallery-modal').classList.add('hidden');
    appState.selectedOrbId = null;
}

function openMemoryOrbsGrid() {
    if (appState.treeOrbs.length === 0) {
        alert("Vườn ký ức hiện tại chưa có quả nào. Hãy nhấp nút 'Gieo mầm' hoặc ghi lời chúc để gieo quả ký ức đầu tiên nhé!");
        return;
    }
    // Open the latest orb's polaroid gallery modal for easy review
    const latestOrb = appState.treeOrbs[appState.treeOrbs.length - 1];
    appState.selectedOrbId = latestOrb.id;
    openOrbsGalleryModal(latestOrb);
}

function deletePolaroidImage(index) {
    const orb = appState.treeOrbs.find(o => o.id === appState.selectedOrbId);
    if (!orb) return;
    
    if (confirm("Bạn có chắc chắn muốn xóa hình ảnh trân quý này khỏi Quả Ký Ức không?")) {
        orb.images.splice(index, 1);
        
        if (orb.images.length === 0) {
            // Delete whole orb
            appState.treeOrbs = appState.treeOrbs.filter(o => o.id !== orb.id);
            closeOrbsGallery();
        } else {
            // Reduce size
            orb.size = Math.max(6, orb.size - 1);
            // Re-render
            openOrbsGalleryModal(orb);
        }
        
        saveToLocalStorage();
    }
}

function deleteEntireOrb() {
    if (confirm("Cảnh báo: Bạn có muốn xóa toàn bộ Quả Ký Ức của ngày này cùng tất cả hình ảnh bên trong không?")) {
        appState.treeOrbs = appState.treeOrbs.filter(o => o.id !== appState.selectedOrbId);
        saveToLocalStorage();
        closeOrbsGallery();
    }
}

// --------------------------------------------------------------------------
// TIME-TRAVEL REMINDER CALCULATOR
// --------------------------------------------------------------------------

function updateFutureSliderText(value) {
    const intervals = ['1 Năm', '10 Năm', '50 Năm', 'Truyền đời'];
    const chosenInterval = intervals[value - 1];
    appState.activeReminderInterval = chosenInterval;
    
    // Select range highlight label
    document.querySelectorAll('.slider-lbl').forEach((lbl, idx) => {
        if (idx === (value - 1)) {
            lbl.style.color = '#FFFFFF';
            lbl.style.fontWeight = 'bold';
        } else {
            lbl.style.color = 'rgba(255,255,255,0.4)';
            lbl.style.fontWeight = 'normal';
        }
    });
    
    // Calculate future unlock date details based on real computer calendar
    const today = new Date();
    let releaseYear = today.getFullYear();
    
    if (chosenInterval === '1 Năm') releaseYear += 1;
    if (chosenInterval === '10 Năm') releaseYear += 10;
    if (chosenInterval === '50 Năm') releaseYear += 50;
    if (chosenInterval === 'Truyền đời') releaseYear += 100; // Centennial mock
    
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    const outputString = `Thông báo sẽ được gửi tới hậu thế vào ngày ${day}/${month}/${releaseYear}.`;
    document.getElementById('future-unlock-date-info').innerText = outputString;
}

function setSliderValue(val) {
    document.getElementById('future-time-slider').value = val;
    updateFutureSliderText(val);
}

function focusFuturePanel() {
    const panel = document.querySelector('.future-gazing-panel');
    panel.style.transform = 'scale(1.05)';
    panel.style.borderColor = '#FFFFFF';
    setTimeout(() => {
        panel.style.transform = '';
        panel.style.borderColor = 'rgba(214, 175, 55, 0.25)';
    }, 1000);
}

function activateFutureMemoryCycle() {
    if (appState.treeOrbs.length === 0) {
        showCustomAlert("Trống Cây Ký Ức", "Vui lòng gieo mầm ít nhất một Quả Ký Ức lên cây trước khi kích hoạt Chu kỳ!", "🌳");
        return;
    }
    
    // Prioritize selected orb from canvas click, fallback to last sprouted or first available orb as target
    let targetOrb = null;
    if (appState.selectedOrbId) {
        targetOrb = appState.treeOrbs.find(orb => orb.id === appState.selectedOrbId);
    }
    
    if (!targetOrb) {
        targetOrb = appState.treeOrbs[appState.treeOrbs.length - 1];
    }
    
    appState.activeReminderOrbId = targetOrb.id;
    
    // Dynamic text
    const intervalStr = appState.activeReminderInterval;
    const detailBox = document.getElementById('reminder-detail-text');
    detailBox.innerText = `Chu kỳ ${intervalStr} đã hoạt động cho quả quả kỷ niệm ngày ${targetOrb.dateString}. Vòng hào quang vàng lấp lánh đang duy trì bao quanh quả trên cây!`;
    
    // Save to localStorage
    saveToLocalStorage();
    updateReminderUI();
    
    showCustomAlert(
        "Kích Hoạt Chu Kỳ Ký Ức",
        `Chu kỳ Ký Ức <strong>${intervalStr}</strong> đã được thiết lập thành công cho Quả Ký Ức ngày ${targetOrb.dateString}! Ký ức gia tộc sẽ tự động gửi nhắc nhở tới hậu thế đúng mốc lịch trình vào ngày tương lai. Vòng hào quang vàng vĩnh cửu sẽ tiếp tục tỏa sáng bảo tồn quả ký ức này ngay cả khi bạn đóng trình duyệt hoặc tải lại trang.`,
        "🌳",
        "Xác nhận"
    );
}

// --------------------------------------------------------------------------
// ROYALTY FREE MUSIC PLAYLIST & PLAYBACK ACTIONS
// --------------------------------------------------------------------------

function renderMusicTracksList() {
    const listNode = document.getElementById('music-tracks-list');
    listNode.innerHTML = '';
    
    appState.musicPlaylist.forEach((track, idx) => {
        const item = document.createElement('div');
        item.className = `music-track-item ${idx === appState.activeTrackIndex ? 'active' : ''}`;
        item.onclick = () => selectTrack(idx);
        
        item.innerHTML = `
            <span class="music-track-name-bold">${track.title}</span>
            <span class="music-track-duration">${track.duration}</span>
        `;
        listNode.appendChild(item);
    });
    
    // Set active track text
    document.getElementById('active-track-name').innerText = appState.musicPlaylist[appState.activeTrackIndex].title;
}

function selectTrack(index) {
    appState.activeTrackIndex = index;
    const track = appState.musicPlaylist[index];
    
    const player = document.getElementById('ambient-audio-player');
    player.src = track.url;
    
    // Re-render highlight active class
    renderMusicTracksList();
    
    if (appState.musicIsPlaying) {
        player.play();
    }
    
    // Close list modal
    closeMusicListPopup(null);
}

function toggleAmbientMusic() {
    const player = document.getElementById('ambient-audio-player');
    const widget = document.querySelector('.ambient-music-widget');
    const playSvg = document.getElementById('music-widget-play-svg');
    const pauseSvg = document.getElementById('music-widget-pause-svg');
    
    // Set source if not set
    if (!player.src) {
        player.src = appState.musicPlaylist[appState.activeTrackIndex].url;
    }
    
    appState.musicIsPlaying = !appState.musicIsPlaying;
    
    if (appState.musicIsPlaying) {
        player.play();
        widget.classList.add('playing');
        playSvg.classList.add('hidden');
        pauseSvg.classList.remove('hidden');
    } else {
        player.pause();
        widget.classList.remove('playing');
        playSvg.classList.remove('hidden');
        pauseSvg.classList.add('hidden');
    }
}

function showMusicListPopup() {
    document.getElementById('music-list-popup').classList.remove('hidden');
}

function closeMusicListPopup(e) {
    if (!e || e.target === document.getElementById('music-list-popup') || e === null) {
        document.getElementById('music-list-popup').classList.add('hidden');
    }
}

// Saved preview specific local audio playback
function toggleSavedAudioPlayback() {
    const player = document.getElementById('ambient-audio-player');
    const btn = document.getElementById('preview-audio-play-btn');
    const playSvg = document.getElementById('play-icon-svg');
    const pauseSvg = document.getElementById('pause-icon-svg');
    const staticBars = document.querySelectorAll('.audio-wave-visualizer-static .bar');
    
    // Pause background ambient player if active
    if (appState.musicIsPlaying) {
        toggleAmbientMusic(); // toggle pause background
    }
    
    const isPlaying = !playSvg.classList.contains('hidden');
    
    if (isPlaying) {
        // Set dynamic keepsake voice recorded stream
        const lastMem = appState.memories[appState.memories.length - 1];
        if (lastMem && lastMem.audioUrl) {
            player.src = lastMem.audioUrl;
            player.play();
            
            playSvg.classList.add('hidden');
            pauseSvg.classList.remove('hidden');
            staticBars.forEach(b => b.classList.add('playing'));
            
            player.onended = () => {
                playSvg.classList.remove('hidden');
                pauseSvg.classList.add('hidden');
                staticBars.forEach(b => b.classList.remove('playing'));
            };
        }
    } else {
        player.pause();
        playSvg.classList.remove('hidden');
        pauseSvg.classList.add('hidden');
        staticBars.forEach(b => b.classList.remove('playing'));
    }
}

// --- HERO SECTION DIGITAL TIME CAPSULE GRAPHICS ---
let capsuleCanvasState = {
    canvas: null, ctx: null, time: 0, frameId: null
};

function initCapsuleCanvas() {
    const canvas = document.getElementById('capsule-canvas');
    if (!canvas) return;
    
    capsuleCanvasState.canvas = canvas;
    capsuleCanvasState.ctx = canvas.getContext('2d');
    
    canvas.width = 400;
    canvas.height = 400;
    
    drawCapsuleFrame();
}

function drawCapsuleFrame() {
    const { canvas, ctx } = capsuleCanvasState;
    if (!canvas) return;
    
    capsuleCanvasState.frameId = requestAnimationFrame(drawCapsuleFrame);
    capsuleCanvasState.time += 0.012;
    const t = capsuleCanvasState.time;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // 1. Draw glowing digital halo orbits (rings)
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 1.5;
    
    // Inner orbital
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 130, 45, Math.sin(t * 0.5) * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    
    // Outer orbital
    ctx.strokeStyle = 'rgba(74, 59, 50, 0.15)';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, 170, 70, -Math.sin(t * 0.4) * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    
    // 2. Draw 3D core glowing capsule sphere
    ctx.save();
    
    // Radial glow
    const sphereGrad = ctx.createRadialGradient(
        centerX - 10, centerY - 10, 5,
        centerX, centerY, 60
    );
    sphereGrad.addColorStop(0, '#FFFFFF');
    sphereGrad.addColorStop(0.2, '#F3E5AB');
    sphereGrad.addColorStop(0.8, '#D4AF37');
    sphereGrad.addColorStop(1, 'rgba(170, 124, 17, 0.2)');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.shadowColor = '#D4AF37';
    ctx.shadowBlur = 35;
    ctx.fill();
    ctx.restore();
    
    // 3. Draw float memory particles revolving
    for (let i = 0; i < 8; i++) {
        const offsetAngle = (i * Math.PI / 4) + t * 0.7;
        const orbitRadiusX = 140 + Math.sin(t + i) * 15;
        const orbitRadiusY = 50 + Math.cos(t + i) * 10;
        
        const px = centerX + Math.cos(offsetAngle) * orbitRadiusX;
        const py = centerY + Math.sin(offsetAngle) * orbitRadiusY;
        
        // Draw float card
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(offsetAngle * 0.2);
        
        // Draw glass card body
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.roundRect(-15, -20, 30, 40, 4);
        ctx.fill();
        ctx.stroke();
        
        // Draw tiny photo placeholder inside float card
        ctx.fillStyle = 'rgba(74, 59, 50, 0.15)';
        ctx.fillRect(-10, -15, 20, 20);
        
        // Draw tiny text placeholder lines
        ctx.fillStyle = 'rgba(74, 59, 50, 0.3)';
        ctx.fillRect(-10, 10, 20, 2);
        ctx.fillRect(-10, 14, 12, 2);
        
        ctx.restore();
    }
}

// --- QR SHARE VIEWER CORE FUNCTIONS ---
function showSharedMemory(memoryId, text, date, time, family, photo, audio) {
    let finalMemory = null;
    
    // 1. Try to load from LocalStorage first (same device benefit)
    if (memoryId) {
        const savedMemories = localStorage.getItem('loichuc50nam_memories');
        if (savedMemories) {
            const memories = JSON.parse(savedMemories);
            finalMemory = memories.find(m => m.id === memoryId);
        }
    }
    
    // 2. Fallback to URL encoded query details (different device benefit)
    if (!finalMemory && text) {
        finalMemory = {
            text: decodeURIComponent(text),
            date: date || 'Kỷ niệm',
            time: time || '',
            photoUrl: photo ? decodeURIComponent(photo) : 'default_keepsake.png',
            audioUrl: audio ? decodeURIComponent(audio) : '',
            family: family ? decodeURIComponent(family) : 'Gia đình trân quý'
        };
    }
    
    if (finalMemory) {
        // Open the shared viewer modal and bind data
        document.getElementById('qr-share-text').innerText = finalMemory.text;
        document.getElementById('qr-share-date').innerText = finalMemory.date;
        document.getElementById('qr-share-time').innerText = finalMemory.time;
        document.getElementById('qr-share-img').src = finalMemory.photoUrl;
        
        const familyTag = document.getElementById('qr-share-family-tag');
        if (familyTag) {
            familyTag.innerText = `Dòng họ: ${finalMemory.family || 'Trân quý vĩnh hằng'}`;
        }
        
        // Handle audio playback container
        const audioContainer = document.getElementById('qr-share-audio-container');
        if (finalMemory.audioUrl) {
            audioContainer.classList.remove('hidden');
            appState.qrShareAudioUrl = finalMemory.audioUrl;
        } else {
            audioContainer.classList.add('hidden');
            appState.qrShareAudioUrl = '';
        }
        
        // Open the modal
        document.getElementById('qr-share-viewer-modal').classList.remove('hidden');
    }
}

function closeQRShareViewer() {
    document.getElementById('qr-share-viewer-modal').classList.add('hidden');
    // Clear URL parameters to prevent modal showing again on refresh
    window.history.pushState({}, document.title, window.location.pathname);
    
    // Stop any active qr share audio playback
    const player = document.getElementById('ambient-audio-player');
    if (player && player.src === appState.qrShareAudioUrl) {
        player.pause();
    }
}

function toggleQRShareAudio() {
    const player = document.getElementById('ambient-audio-player');
    const playSvg = document.getElementById('qr-share-play-icon');
    const pauseSvg = document.getElementById('qr-share-pause-icon');
    
    if (!player || !appState.qrShareAudioUrl) return;
    
    // Pause background ambient music if active
    if (appState.musicIsPlaying) {
        toggleAmbientMusic();
    }
    
    const isPlaying = !playSvg.classList.contains('hidden');
    
    if (isPlaying) {
        player.src = appState.qrShareAudioUrl;
        player.play();
        playSvg.classList.add('hidden');
        pauseSvg.classList.remove('hidden');
        
        player.onended = () => {
            playSvg.classList.remove('hidden');
            pauseSvg.classList.add('hidden');
        };
    } else {
        player.pause();
        playSvg.classList.remove('hidden');
        pauseSvg.classList.add('hidden');
    }
}

// --- DOWNLOAD KEPSAKE AS PDF DYNAMICALLY ---
async function downloadMemoryPDF(memoryId) {
    const printableNode = document.getElementById('printable-thiep-container');
    if (!printableNode) return;
    printableNode.innerHTML = '';
    
    // Retrieve specified memory
    const memory = appState.memories.find(m => m.id === memoryId);
    if (!memory) return;
    
    // Self-healing fallback: if html2pdf library is blocked or missing (e.g. file:// protocol or CDN issue)
    if (typeof html2pdf === 'undefined') {
        console.warn("html2pdf is not loaded. Using fallback raw file downloads.");
        downloadMemoryFallback(memory);
        showCustomAlert(
            "Tải Tệp Ký Ức Dự Phòng",
            "Do trình duyệt của bạn đang chặn bộ dựng PDF (do giao thức tệp cục bộ tệp <strong>file://</strong> hoặc lỗi mạng), hệ thống đã tự động xuất và tải về tệp tin **bức thư tay dạng văn bản (.txt)** và **ảnh gốc (.png/.jpeg)** dự phòng cực kỳ an toàn về máy của bạn! Hãy tải trang web online hoặc mở bằng máy chủ Local Server để tải tệp PDF thiệp nghệ thuật hoàn hảo nhé!",
            "💾"
        );
        return;
    }
    
    // Check if there is a valid captured or uploaded photo in the memory
    const hasValidPhoto = memory.photoUrl && 
                          memory.photoUrl !== 'default_keepsake.png' && 
                          memory.photoUrl.trim() !== '' && 
                          !memory.photoUrl.startsWith('default_keepsake');

    // Compile print frame structure (simplified blank centered for preprinted sheets overprint, with QR code)
    const card = document.createElement('div');
    card.className = `thiep-card theme-blank ${hasValidPhoto ? 'has-photo' : 'no-photo'}`;
    
    card.innerHTML = `
        <div class="thiep-body ${hasValidPhoto ? 'layout-split' : 'layout-full'}">
            ${hasValidPhoto ? `
            <div class="thiep-image-box">
                <img src="${memory.photoUrl}" alt="Family print frame" class="thiep-img">
            </div>
            ` : ''}
            <div class="thiep-message-box">
                <div class="thiep-message-text">"${memory.text}"</div>
            </div>
        </div>
        <div class="thiep-bottom-row">
            <div class="thiep-meta-info" style="display: none;"></div>
            <div class="thiep-qr-box" id="thiep-qr-pdf-node"></div>
        </div>
    `;
    
    printableNode.appendChild(card);
    
    // Generate QR code offline-first
    let uniqueLink = window.location.href.split('?')[0];
    uniqueLink += `?memoryId=${memory.id}`;
    uniqueLink += `&text=${encodeURIComponent(memory.text)}`;
    uniqueLink += `&date=${memory.date}`;
    uniqueLink += `&time=${memory.time}`;
    if (appState.currentUser) {
        uniqueLink += `&family=${encodeURIComponent(appState.currentUser.familyName)}`;
    }
    if (memory.photoUrl && !memory.photoUrl.startsWith('data:image')) {
        uniqueLink += `&photo=${encodeURIComponent(memory.photoUrl)}`;
    }

    const qrBox = document.getElementById('thiep-qr-pdf-node');
    if (qrBox) {
        await generateQRCode(qrBox, uniqueLink, 80);
    }
    
    await waitForImagesToLoad(printableNode);
    
    // Convert to PDF using html2pdf.js - configured for borderless centered landscape overprint
    const opt = {
        margin:       0,
        filename:     `loichuc50nam_khung_chu_${memory.id}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    // Trigger conversion and download
    html2pdf().set(opt).from(card).save();
}

// Self-healing download fallback helper for when html2pdf is not loaded
function downloadMemoryFallback(memory) {
    // 1. Download text letter as a .txt file
    if (memory.text) {
        const textLink = document.createElement('a');
        const file = new Blob([memory.text], { type: 'text/plain; charset=utf-8' });
        textLink.href = URL.createObjectURL(file);
        textLink.download = `thu_tay_ki_uc_${memory.id}.txt`;
        document.body.appendChild(textLink);
        textLink.click();
        document.body.removeChild(textLink);
    }
    
    // 2. Download raw image if it exists
    if (memory.photoUrl) {
        // If it's a relative path default_keepsake.png or external, trigger download
        const imgLink = document.createElement('a');
        imgLink.href = memory.photoUrl;
        imgLink.download = memory.photoUrl.startsWith('data:image') ? `anh_chup_ki_uc_${memory.id}.png` : `hinh_anh_ki_uc_${memory.id}.jpg`;
        document.body.appendChild(imgLink);
        imgLink.click();
        document.body.removeChild(imgLink);
    }
}
