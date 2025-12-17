// --- Advanced Signature Logic & UI Interactions ---
window.pads = {};

// Helper: Haptic Feedback (Best Practice: feature check)
const vibrate = (pattern) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
};

function initSignaturePad(id, name) {
    const canvas = document.getElementById(id);
    const parent = canvas.parentElement;
    
    // 1. High-Performance Configuration
    // Enforce touch-action in JS for redundancy
    canvas.style.touchAction = 'none';
    
    const signaturePad = new SignaturePad(canvas, {
        minWidth: 1.0, 
        maxWidth: 4.0, 
        penColor: "#1e293b",
        throttle: 16, // 60Hz limit for performance
        minDistance: 5, // Filter out micro-noise
        velocityFilterWeight: 0.7, // Smooth curves
    });
    
    signaturePad.isErasing = false;
    window.pads[name] = signaturePad;

    // 2. Eraser Button Support (S-Pen / Surface Pen)
    canvas.addEventListener('pointerdown', (e) => {
        if (e.button === 5 || e.buttons === 32 || (e.pointerType === 'pen' && e.button === -1)) { 
            toggleEraser(name, true);
        }
    });
    
    canvas.addEventListener('pointerup', (e) => {
        if (signaturePad.isErasing && (e.button === 5 || e.button === -1)) {
           toggleEraser(name, false); 
        }
    });

    // 3. Retina/High-DPI Handling
    const resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const data = signaturePad.toData();
        canvas.width = parent.offsetWidth * ratio;
        canvas.height = parent.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear(); 
        signaturePad.fromData(data);
    };
    
    window.addEventListener("resize", resizeCanvas);
    setTimeout(resizeCanvas, 200);
}

window.toggleEraser = function(name, forceState = null) {
    const pad = window.pads[name];
    if (!pad) return;

    const newState = forceState !== null ? forceState : !pad.isErasing;
    pad.isErasing = newState;

    const btn = document.getElementById(`btn-erase-${name}`);
    
    if (pad.isErasing) {
        pad.compositeOperation = 'destination-out';
        btn?.classList.add('bg-teal-100', 'text-teal-700', 'border-teal-300');
        vibrate(10); // Haptic tick
    } else {
        pad.compositeOperation = 'source-over';
        btn?.classList.remove('bg-teal-100', 'text-teal-700', 'border-teal-300');
        vibrate(10);
    }
}

function clearPad(name) {
    if(window.pads[name]) {
        window.pads[name].clear();
        vibrate(15); // Slightly stronger tick
    }
}

// --- Parallax Effect ---
document.addEventListener('mousemove', (e) => {
    // Only apply if pointer is fine (mouse) and not during animations
    if (window.matchMedia('(hover: hover)').matches) {
        const container = document.getElementById('paper-container');
        // Disable parallax during complex animations to prevent conflicts
        if (container && 
            !container.classList.contains('magic-morph') && 
            !container.classList.contains('magic-reject') &&
            !container.classList.contains('magic-morph-reverse')) {
            
            // Calculate center offset
            const x = (e.clientX / window.innerWidth - 0.5) * 20; // Max 10px tilt
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            
            // Apply subtle transform
            container.style.transform = `translate(${x}px, ${y}px)`;
        }
    }
});

function triggerRejectAnimation() {
    const element = document.getElementById('paper-container');
    const btn = document.getElementById('submit-btn');
    
    // Haptic Error Feedback
    vibrate([50, 50, 50]);

    // Calculate Geometry
    const formRect = element.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    
    const formCenterX = formRect.left + formRect.width / 2;
    const formCenterY = formRect.top + formRect.height / 2;
    const btnCenterX = btnRect.left + btnRect.width / 2;
    const btnCenterY = btnRect.top + btnRect.height / 2;

    const tx = btnCenterX - formCenterX;
    const ty = btnCenterY - formCenterY;

    // Trigger Animation
    element.style.setProperty('--tx', `${tx}px`);
    element.style.setProperty('--ty', `${ty}px`);
    
    element.classList.remove('animate-bento'); 
    element.classList.remove('magic-reject');
    void element.offsetWidth; // Force Reflow
    element.classList.add('magic-reject');

    setTimeout(() => {
        element.classList.remove('magic-reject');
        // Reset transform from parallax if needed
        element.style.transform = ''; 
    }, 800);
}

async function submitToServer() {
    const studentName = document.getElementById('student-name').value.trim();
    const studentId = document.getElementById('student-id').value.trim();
    const parentName = document.getElementById('parent-name').value.trim();
    const sigStudent = window.pads['student'];
    const sigParent = window.pads['parent'];

    // Validation
    if (!studentName || !studentId || !parentName) {
        triggerRejectAnimation();
        showToast("⚠️ Missing Information", "Please fill in all name and ID fields.");
        return;
    }
    if (sigStudent.isEmpty() || sigParent.isEmpty()) {
        triggerRejectAnimation();
        showToast("⚠️ Missing Signatures", "Both Student and Parent must sign.");
        return;
    }

    const btn = document.getElementById('submit-btn');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-teal-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...`;

    try {
        const element = document.getElementById('paper-container');
        
        // Capture logic with DOM Replacement for perfect text rendering
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 1200, 
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.getElementById('paper-container');
                if (clonedElement) {
                    // Normalize for output
                    clonedElement.style.width = '800px';
                    clonedElement.style.maxWidth = '800px';
                    clonedElement.style.margin = '0';
                    clonedElement.style.transform = 'none';
                    clonedElement.style.animation = 'none';
                    clonedElement.style.boxShadow = 'none';
                    clonedElement.style.border = '2px solid #000';
                    
                    // Replace inputs with standard Divs
                    clonedDoc.querySelectorAll('input[type="text"]').forEach(input => {
                        const textDiv = clonedDoc.createElement('div');
                        textDiv.textContent = input.value;
                        
                        textDiv.style.display = 'block';
                        textDiv.style.width = '100%';
                        textDiv.style.borderBottom = '2px solid #333';
                        textDiv.style.padding = '24px 0 8px 0'; 
                        textDiv.style.fontSize = '18px';
                        textDiv.style.fontWeight = '500';
                        textDiv.style.fontFamily = 'Arial, sans-serif';
                        textDiv.style.color = '#000';
                        textDiv.style.background = 'transparent';
                        textDiv.style.lineHeight = '1.4';
                        textDiv.style.minHeight = '30px'; 
                        
                        input.parentNode.replaceChild(textDiv, input);
                    });

                    // Fix Labels
                    clonedDoc.querySelectorAll('.input-label').forEach(label => {
                        label.style.position = 'absolute';
                        label.style.top = '0';
                        label.style.left = '0';
                        label.style.color = '#475569';
                        label.style.fontSize = '12px';
                        label.style.fontWeight = 'bold';
                        label.style.transform = 'none';
                    });

                    // Hide unwanted UI
                     clonedDoc.querySelectorAll('button').forEach(b => b.style.display = 'none');
                     clonedDoc.querySelector('.absolute.bottom-2')?.remove(); // Remove screen watermark if duplicate
                }
            }
        });

        const base64Image = canvas.toDataURL("image/png");

        // --- TRIGGER MAGIC LAMP MORPH ---
        // Calculate Geometry
        const formRect = element.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const tx = (btnRect.left + btnRect.width/2) - (formRect.left + formRect.width/2);
        const ty = (btnRect.top + btnRect.height/2) - (formRect.top + formRect.height/2);

        // Animate
        element.style.setProperty('--tx', `${tx}px`);
        element.style.setProperty('--ty', `${ty}px`);
        element.classList.remove('animate-bento', 'magic-morph-reverse');
        element.classList.add('magic-morph');
        
        // Haptic Feedback for Morph start
        vibrate(20);

        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                image: base64Image, 
                studentName: studentName,
                studentId: studentId
            })
        });

        if (response.ok) {
            // --- SUCCESS JOURNEY ---
            vibrate([50, 100, 50]); // Success Haptics

            // Calculate Center Trajectory
            const finalBtnRect = btn.getBoundingClientRect();
            const txCenter = (window.innerWidth / 2) - (finalBtnRect.left + finalBtnRect.width/2);
            const tyCenter = (window.innerHeight / 2) - (finalBtnRect.top + finalBtnRect.height/2);

            btn.style.setProperty('--tx-center', `${txCenter}px`);
            btn.style.setProperty('--ty-center', `${tyCenter}px`);
            btn.classList.add('success-journey');
            btn.innerHTML = `<span class="flex items-center gap-2 font-bold text-xl">✨ Success!</span>`;

            // Sequence
            setTimeout(() => {
                // Return
                btn.classList.remove('success-journey');
                btn.classList.add('success-return');
                
                setTimeout(() => { btn.innerHTML = originalContent; }, 200);

                setTimeout(() => {
                    // Form Reappear
                    element.classList.remove('magic-morph');
                    element.classList.add('magic-morph-reverse');

                    setTimeout(() => { window.location.reload(); }, 1200); 
                }, 800);
            }, 3500); 

        } else {
            throw new Error('Server upload failed');
        }

    } catch (err) {
        console.error(err);
        triggerRejectAnimation(); // Use reject anim for server error too
        showToast("❌ Error", "Upload failed. Please try again.");
        
        // Reverse Morph if it happened
        const element = document.getElementById('paper-container');
        if(element.classList.contains('magic-morph')) {
            element.classList.remove('magic-morph');
            element.classList.add('magic-morph-reverse');
        }
        
        // Reset Button
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

function showToast(title, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast-enter bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex flex-col`;
    toast.innerHTML = `<span class="font-bold text-teal-400 text-sm mb-1">${title}</span><span class="text-sm text-gray-200">${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    initSignaturePad('canvas-student', 'student');
    initSignaturePad('canvas-parent', 'parent');
    
    const now = new Date();
    document.getElementById('auto-month').textContent = (now.getMonth() + 1).toString().padStart(2, '0');
    document.getElementById('auto-day').textContent = now.getDate().toString().padStart(2, '0');
});