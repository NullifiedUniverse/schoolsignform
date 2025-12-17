/**
 * Signature System - Core Application Logic
 * Powered by GSAP for High-Fidelity Motion Design
 */

const AppConfig = {
    anim: {
        successHold: 3500, 
    },
    haptics: {
        tap: 10,
        success: [50, 100, 50],
        error: [50, 50, 50],
    }
};

class SignatureApp {
    constructor() {
        this.pads = {};
        this.ui = {
            container: document.getElementById('paper-container'),
            submitBtn: document.getElementById('submit-btn'),
            inputs: {
                studentName: document.getElementById('student-name'),
                studentId: document.getElementById('student-id'),
                parentName: document.getElementById('parent-name')
            }
        };
        
        this.init();
    }

    init() {
        this.setupSignaturePads();
        this.setupParallax();
        
        // GSAP Defaults
        gsap.defaults({ ease: "power2.out", duration: 0.5 });

        // Expose globals
        window.submitToServer = () => this.handleSubmit();
        window.toggleEraser = (name, force) => this.toggleEraser(name, force);
        window.clearPad = (name) => this.clearPad(name);
        
        this.setAutoDate();
    }

    // --- Signature Pad Management ---
    setupSignaturePads() {
        ['student', 'parent'].forEach(role => {
            const canvas = document.getElementById(`canvas-${role}`);
            if (!canvas) return;
            canvas.style.touchAction = 'none';

            const pad = new SignaturePad(canvas, {
                minWidth: 1.0, maxWidth: 4.0, penColor: "#1e293b",
                throttle: 16, minDistance: 5, velocityFilterWeight: 0.7
            });

            pad.isErasing = false;
            this.pads[role] = pad;

            canvas.addEventListener('pointerdown', (e) => {
                if (e.button === 5 || e.buttons === 32 || (e.pointerType === 'pen' && e.button === -1)) {
                    this.toggleEraser(role, true);
                }
            });

            canvas.addEventListener('pointerup', (e) => {
                if (pad.isErasing && (e.button === 5 || e.button === -1)) {
                    this.toggleEraser(role, false);
                }
            });
        });

        const resizeObserver = new ResizeObserver(() => this.resizePads());
        resizeObserver.observe(this.ui.container);
    }

    resizePads() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        Object.keys(this.pads).forEach(role => {
            const pad = this.pads[role];
            if(pad.canvas.width === pad.canvas.parentElement.offsetWidth * ratio) return;
            const data = pad.toData();
            pad.canvas.width = pad.canvas.parentElement.offsetWidth * ratio;
            pad.canvas.height = pad.canvas.parentElement.offsetHeight * ratio;
            pad.canvas.getContext("2d").scale(ratio, ratio);
            pad.clear();
            pad.fromData(data);
        });
    }

    toggleEraser(role, forceState = null) {
        const pad = this.pads[role];
        if (!pad) return;
        const newState = forceState !== null ? forceState : !pad.isErasing;
        pad.isErasing = newState;
        pad.compositeOperation = newState ? 'destination-out' : 'source-over';
        
        const btn = document.getElementById(`btn-erase-${role}`);
        if (btn) {
            if (newState) btn.classList.add('bg-teal-100', 'text-teal-700', 'border-teal-300');
            else btn.classList.remove('bg-teal-100', 'text-teal-700', 'border-teal-300');
        }
        this.vibrate(AppConfig.haptics.tap);
    }

    clearPad(role) {
        if (this.pads[role]) {
            this.pads[role].clear();
            this.vibrate(AppConfig.haptics.tap);
        }
    }

    // --- UI Effects ---
    setupParallax() {
        // Simple GSAP Parallax
        this.ui.container.addEventListener('mousemove', (e) => {
            if (!window.matchMedia('(hover: hover)').matches) return;
            // Skip if animating (we check if GSAP tween is active on container)
            if (gsap.isTweening(this.ui.container)) return;

            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            
            gsap.to(this.ui.container, {
                x: x, y: y, 
                duration: 0.5, 
                ease: "power1.out",
                overwrite: "auto"
            });
        });
        
        // Reset on mouse leave
        this.ui.container.addEventListener('mouseleave', () => {
             if (gsap.isTweening(this.ui.container)) return;
             gsap.to(this.ui.container, { x: 0, y: 0, duration: 0.5 });
        });
    }

    vibrate(pattern) {
        if (navigator.vibrate) navigator.vibrate(pattern);
    }

    setAutoDate() {
        const now = new Date();
        document.getElementById('auto-month').textContent = (now.getMonth() + 1).toString().padStart(2, '0');
        document.getElementById('auto-day').textContent = now.getDate().toString().padStart(2, '0');
    }

    showToast(title, message) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        // Initial state for GSAP
        toast.className = `bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 flex flex-col`;
        toast.innerHTML = `<span class="font-bold text-teal-400 text-sm mb-1">${title}</span><span class="text-sm text-gray-200">${message}</span>`;
        container.appendChild(toast);

        // GSAP Toast Animation
        gsap.fromTo(toast, 
            { y: -50, opacity: 0, scale: 0.9 },
            { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
        );

        setTimeout(() => {
            gsap.to(toast, {
                y: -20, opacity: 0, duration: 0.3, 
                onComplete: () => toast.remove()
            });
        }, 3000);
    }

    // --- Advanced GSAP Animations ---

    // 1. Validation Shake
    animateReject() {
        this.vibrate(AppConfig.haptics.error);
        const tl = gsap.timeline();
        
        // Calculate vector to button
        const formRect = this.ui.container.getBoundingClientRect();
        const btnRect = this.ui.submitBtn.getBoundingClientRect();
        const tx = (btnRect.left + btnRect.width/2) - (formRect.left + formRect.width/2);
        const ty = (btnRect.top + btnRect.height/2) - (formRect.top + formRect.height/2);

        // Shake + Move slightly towards button + Red Glow
        tl.to(this.ui.container, {
            x: tx * 0.15, 
            y: ty * 0.15, 
            rotation: -2,
            boxShadow: "0 0 40px rgba(239, 68, 68, 0.6)",
            borderColor: "rgba(239, 68, 68, 0.8)",
            duration: 0.2,
            ease: "power2.out"
        })
        .to(this.ui.container, {
            x: "+=5", rotation: 2, duration: 0.1, yoyo: true, repeat: 3
        })
        .to(this.ui.container, {
            x: 0, y: 0, rotation: 0,
            boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
            borderColor: "rgba(255, 255, 255, 0.5)",
            duration: 0.4,
            ease: "elastic.out(1, 0.5)"
        });
    }

    // 2. The Genie Morph (Form -> Button)
    animateMorph() {
        this.vibrate(AppConfig.haptics.tap);
        
        const formRect = this.ui.container.getBoundingClientRect();
        const btnRect = this.ui.submitBtn.getBoundingClientRect();
        
        // Delta from Form Center to Button Center
        const tx = (btnRect.left + btnRect.width/2) - (formRect.left + formRect.width/2);
        const ty = (btnRect.top + btnRect.height/2) - (formRect.top + formRect.height/2);

        const tl = gsap.timeline();

        // Step 1: Anticipation (Squash)
        tl.to(this.ui.container, {
            scaleY: 0.95, scaleX: 1.05, y: 20,
            duration: 0.2, ease: "power2.inOut"
        })
        // Step 2: The SUCK (Stretch & Move)
        .to(this.ui.container, {
            x: tx, y: ty,
            scaleX: 0.05, scaleY: 0.05,
            opacity: 0,
            borderRadius: "50%",
            backgroundColor: "#0f172a", // Match button color
            rotation: 45,
            filter: "blur(10px)",
            duration: 0.6,
            ease: "expo.in" // Accelerate into the button
        }, ">")
        // Parallel Stretch Effect (The "Noodle")
        .to(this.ui.container, {
            scaleX: 0.1, scaleY: 1.5, // Extreme thin stretch
            rotation: 15,
            duration: 0.3,
            ease: "power1.in",
        }, "<") // Start at same time as move
        .to(this.ui.container, {
            scaleX: 0.05, scaleY: 0.05, // Snap back to point
            duration: 0.3,
            ease: "power1.out"
        }, ">-0.3"); // Overlap end
    }

    // 3. Success Journey (Button -> Toast)
    animateSuccess() {
        this.vibrate(AppConfig.haptics.success);
        const btn = this.ui.submitBtn;
        
        // Calculate center of screen relative to button's current position
        const btnRect = btn.getBoundingClientRect();
        const tx = (window.innerWidth / 2) - (btnRect.left + btnRect.width/2);
        const ty = (window.innerHeight / 2) - (btnRect.top + btnRect.height/2);

        // Timeline for Button
        const tl = gsap.timeline();

        tl.to(btn, {
            x: tx, y: ty,
            width: Math.min(window.innerWidth * 0.9, 380), // Dynamic width
            height: 72,
            borderRadius: 16,
            backgroundColor: "#0f766e", // Teal
            scale: 1.2,
            boxShadow: "0 25px 60px -12px rgba(15, 118, 110, 0.6)",
            duration: 0.8,
            ease: "elastic.out(1, 0.75)",
            onStart: () => {
                // Smooth Text Swap
                gsap.to(btn.querySelector('svg'), { opacity: 0, duration: 0.2 });
                gsap.to(btn.querySelector('span'), { opacity: 0, duration: 0.2, onComplete: () => {
                    btn.innerHTML = `<span class="flex items-center gap-2 font-bold text-xl whitespace-nowrap opacity-0">✨ Success!</span>`;
                    gsap.to(btn.querySelector('span'), { opacity: 1, duration: 0.3 });
                }});
            }
        });

        // Return Sequence
        setTimeout(() => {
            const tlReturn = gsap.timeline();
            
            // Text Swap Back
            tlReturn.to(btn.querySelector('span'), { opacity: 0, duration: 0.2, onComplete: () => {
                 this.resetState(); // Trigger full reset logic which handles HTML rebuild
            }});
            
            // Move Back
            tlReturn.to(btn, {
                x: 0, y: 0,
                width: "", // Revert to auto/css
                height: "",
                scale: 1,
                borderRadius: "9999px",
                backgroundColor: "#0f172a", // Dark Slate
                boxShadow: "none",
                duration: 0.6,
                ease: "power2.inOut"
            }, "<");

        }, AppConfig.anim.successHold);
    }

    // 4. Reset
    resetState() {
        const btn = this.ui.submitBtn;
        
        // Clear Data
        Object.values(this.ui.inputs).forEach(input => input.value = '');
        Object.values(this.pads).forEach(pad => pad.clear());

        // Rebuild Button Content
        btn.innerHTML = `<div class="absolute inset-0 bg-teal-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity blur-lg"></div><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg><span class="font-sans font-bold tracking-wide">Submit Document</span>`;
        btn.disabled = false;

        // Form Reappear Animation
        gsap.fromTo(this.ui.container, 
            { scale: 0.05, opacity: 0, y: 50 },
            { scale: 1, opacity: 1, y: 0, x: 0, rotation: 0, filter: "blur(0px)", borderRadius: "1.5rem", backgroundColor: "#f1f5f9", duration: 0.8, ease: "back.out(1.2)" }
        );
        
        this.showToast("✨ Ready", "Form reset for next student.");
    }

    // --- Main Logic ---
    validate() {
        const { studentName, studentId, parentName } = this.ui.inputs;
        if (!studentName.value.trim() || !studentId.value.trim() || !parentName.value.trim()) return "Please fill in all fields.";
        if (this.pads['student'].isEmpty() || this.pads['parent'].isEmpty()) return "Signatures required.";
        return null;
    }

    async handleSubmit() {
        const error = this.validate();
        if (error) {
            this.animateReject();
            this.showToast("⚠️ Check Fields", error);
            return;
        }

        const btn = this.ui.submitBtn;
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        // Loading Spinner
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-teal-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...`;

        try {
            const base64Image = await this.captureForm();
            
            // Start Morph
            this.animateMorph();

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    image: base64Image, 
                    studentName: this.ui.inputs.studentName.value,
                    studentId: this.ui.inputs.studentId.value
                })
            });

            if (response.ok) {
                this.animateSuccess();
            } else {
                throw new Error('Server upload failed');
            }

        } catch (err) {
            console.error(err);
            this.showToast("❌ Error", "Upload failed.");
            
            // Revert Morph on Error
            gsap.to(this.ui.container, {
                scale: 1, opacity: 1, x: 0, y: 0, rotation: 0, filter: "blur(0px)",
                duration: 0.5, ease: "power2.out"
            });
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    }

    async captureForm() {
        const canvas = await html2canvas(this.ui.container, {
            scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: 1200,
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById('paper-container');
                if (!el) return;
                el.style.width = '800px'; el.style.maxWidth = '800px'; el.style.margin = '0';
                el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.border = '2px solid #000';
                
                clonedDoc.querySelectorAll('input[type="text"]').forEach(input => {
                    const div = clonedDoc.createElement('div');
                    div.textContent = input.value;
                    Object.assign(div.style, {
                        display: 'block', width: '100%', borderBottom: '2px solid #333',
                        padding: '24px 0 8px 0', fontSize: '18px', fontFamily: 'Arial', color: '#000'
                    });
                    input.parentNode.replaceChild(div, input);
                });
                clonedDoc.querySelectorAll('.input-label').forEach(l => {
                    Object.assign(l.style, { position: 'absolute', top: '0', left: '0', color: '#475569', fontSize: '12px' });
                });
                clonedDoc.querySelectorAll('button').forEach(b => b.style.display = 'none');
            }
        });
        return canvas.toDataURL("image/png");
    }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new SignatureApp(); });