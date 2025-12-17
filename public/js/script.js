// --- Core Application Logic ---

// State & Config
const APP = {
    pads: {},
    isSubmitting: false,
};

// Utils
const vibrate = (pattern) => { if (navigator.vibrate) navigator.vibrate(pattern); };
const getEl = (id) => document.getElementById(id);

// --- Signature Pad Initialization ---
function initSignaturePad(id, name) {
    const canvas = getEl(id);
    if (!canvas) return;
    
    const signaturePad = new SignaturePad(canvas, {
        minWidth: 1.0, maxWidth: 4.0, penColor: "#1e293b",
        throttle: 16, minDistance: 5, velocityFilterWeight: 0.7
    });
    
    APP.pads[name] = signaturePad;

    // Resize Handler
    const resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const parent = canvas.parentElement;
        if(canvas.width === parent.offsetWidth * ratio) return;
        
        const data = signaturePad.toData();
        canvas.width = parent.offsetWidth * ratio;
        canvas.height = parent.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
        signaturePad.fromData(data);
    };
    
    window.addEventListener("resize", resizeCanvas);
    setTimeout(resizeCanvas, 100);

    // Eraser Logic
    canvas.addEventListener('pointerdown', (e) => {
        if (e.button === 5 || e.buttons === 32) toggleEraser(name, true);
    });
    canvas.addEventListener('pointerup', (e) => {
        if (signaturePad.isErasing && (e.button === 5 || e.button === -1)) toggleEraser(name, false);
    });
}

window.toggleEraser = function(name, force) {
    const pad = APP.pads[name];
    if (!pad) return;
    
    pad.isErasing = force !== undefined ? force : !pad.isErasing;
    pad.compositeOperation = pad.isErasing ? 'destination-out' : 'source-over';
    
    const btn = getEl(`btn-erase-${name}`);
    if (btn) btn.classList.toggle('bg-teal-100', pad.isErasing);
    vibrate(10);
};

window.clearPad = function(name) {
    APP.pads[name]?.clear();
    vibrate(15);
};

// --- Animations & Transitions ---

function triggerReject() {
    const form = getEl('paper-container');
    const btn = getEl('submit-btn');
    vibrate([50, 50, 50]);
    
    // Calculate Vector for Fakeout Direction
    const fRect = form.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const tx = (bRect.left + bRect.width/2) - (fRect.left + fRect.width/2);
    const ty = (bRect.top + bRect.height/2) - (fRect.top + fRect.height/2);
    
    form.style.setProperty('--tx', `${tx}px`);
    form.style.setProperty('--ty', `${ty}px`);
    
    form.classList.remove('animate-bento', 'magic-morph', 'magic-reject');
    void form.offsetWidth; // Force Reflow
    form.classList.add('magic-reject');
    
    setTimeout(() => {
        form.classList.remove('magic-reject');
    }, 900);
}

function resetFormState() {
    // Clear Data
    getEl('student-name').value = '';
    getEl('student-id').value = '';
    getEl('parent-name').value = '';
    Object.values(APP.pads).forEach(p => p.clear());
    
    // Reset UI Classes
    const form = getEl('paper-container');
    form.classList.remove('magic-morph', 'magic-morph-reverse', 'magic-reject');
    form.style.opacity = '1';
    form.style.transform = 'none';

    // Reset Button
    const btn = getEl('submit-btn');
    btn.disabled = false;
    btn.classList.remove('success-journey', 'success-return');
    btn.innerHTML = `<div class="absolute inset-0 bg-teal-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity blur-lg"></div><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg><span class="font-sans font-bold tracking-wide">Submit Document</span>`;
    
    showToast("✨ Ready", "Form reset.");
    APP.isSubmitting = false;
}

// --- Submission Pipeline ---

async function captureSnapshot(element) {
    // Optimizing capture: simpler clone process
    return html2canvas(element, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
        onclone: (doc) => {
            const el = doc.getElementById('paper-container');
            if (el) {
                // Flatten styles for cleaner capture
                el.style.width = '800px'; el.style.maxWidth = '800px';
                el.style.transform = 'none'; el.style.margin = '0';
                el.style.boxShadow = 'none'; el.style.border = '2px solid #000';
                
                // Inputs to Text
                doc.querySelectorAll('input[type="text"]').forEach(input => {
                    const d = doc.createElement('div');
                    d.textContent = input.value;
                    Object.assign(d.style, {
                        width:'100%', borderBottom:'2px solid #333', padding:'24px 0 8px 0',
                        fontSize:'18px', fontWeight:'500', fontFamily:'Arial', color:'#000', display:'block'
                    });
                    input.parentNode.replaceChild(d, input);
                });
                // Remove UI Elements
                doc.querySelectorAll('button').forEach(b => b.style.display = 'none');
                doc.querySelector('.absolute.bottom-2')?.remove(); // Watermark
            }
        }
    }).then(c => c.toDataURL("image/png"));
}

window.submitToServer = async function() {
    if (APP.isSubmitting) return;
    
    // 1. Validation
    const name = getEl('student-name').value.trim();
    const id = getEl('student-id').value.trim();
    const parent = getEl('parent-name').value.trim();
    
    if (!name || !id || !parent || APP.pads['student'].isEmpty() || APP.pads['parent'].isEmpty()) {
        triggerReject();
        showToast("⚠️ Incomplete", "Please fill all fields and sign.");
        return;
    }

    APP.isSubmitting = true;
    const btn = getEl('submit-btn');
    const originalBtn = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-teal-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...`;

    try {
        const form = getEl('paper-container');
        
        // 2. Capture
        const base64 = await captureSnapshot(form);
        
        // 3. Calculate Geometry for Genie Effect
        const fRect = form.getBoundingClientRect();
        const bRect = btn.getBoundingClientRect();
        
        const tx = (bRect.left + bRect.width/2) - (fRect.left + fRect.width/2);
        const ty = (bRect.top + bRect.height/2) - (fRect.top + fRect.height/2);
        
        form.style.setProperty('--tx', `${tx}px`);
        form.style.setProperty('--ty', `${ty}px`);
        
        // 4. Trigger Genie Animation
        form.classList.remove('animate-bento', 'magic-morph-reverse');
        form.classList.add('magic-morph');
        vibrate(20);

        // 5. Upload
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, studentName: name, studentId: id })
        });

        if (!res.ok) throw new Error('Upload failed');

        // SLIGHT PAUSE requested by user
        await new Promise(r => setTimeout(r, 400));

        // 6. Success Animation
        vibrate([50, 100, 50]);
        
        // Setup Button Morph
        const finalRect = btn.getBoundingClientRect();
        const cx = (window.innerWidth/2) - (finalRect.left + finalRect.width/2);
        const cy = (window.innerHeight/2) - (finalRect.top + finalRect.height/2);
        
        btn.style.setProperty('--btn-w', `${finalRect.width}px`);
        btn.style.setProperty('--btn-h', `${finalRect.height}px`);
        btn.style.setProperty('--tx-center', `${cx}px`);
        btn.style.setProperty('--ty-center', `${cy}px`);
        
        btn.classList.add('success-journey');
        
        // Text Swap
        setTimeout(() => {
             btn.innerHTML = `<span class="flex items-center gap-2 font-bold text-xl whitespace-nowrap">✨ Success!</span>`;
        }, 150);

        // 7. Reset Sequence
        setTimeout(() => {
            // Return Button
            btn.classList.remove('success-journey');
            btn.classList.add('success-return');
            
            // Re-appear Form
            setTimeout(() => {
                form.classList.remove('magic-morph');
                form.classList.add('magic-morph-reverse');
                
                // Final State Reset
                setTimeout(resetFormState, 800);
            }, 500);
            
        }, 3000);

    } catch (err) {
        console.error(err);
        triggerReject(); // Trigger the bounce-back animation
        showToast("❌ Error", "Upload failed.");
        
        // Recover UI
        const form = getEl('paper-container');
        // If we failed mid-morph, ensure we reset properly after the bounce finishes
        setTimeout(() => {
             form.classList.remove('magic-morph');
             form.style.opacity = '1';
             form.style.transform = 'none';
        }, 800);
        
        btn.disabled = false;
        btn.innerHTML = originalBtn;
        APP.isSubmitting = false;
    }
};

function showToast(title, msg) {
    const c = getEl('toast-container');
    const t = document.createElement('div');
    t.className = `toast-enter fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex flex-col`;
    t.innerHTML = `<span class="font-bold text-teal-400 text-sm mb-1">${title}</span><span class="text-sm text-gray-200">${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translate(-50%, -20px)';
        t.style.transition = 'all 0.3s ease';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    initSignaturePad('canvas-student', 'student');
    initSignaturePad('canvas-parent', 'parent');
    
    const d = new Date();
    getEl('auto-month').textContent = (d.getMonth() + 1).toString().padStart(2, '0');
    getEl('auto-day').textContent = d.getDate().toString().padStart(2, '0');
});