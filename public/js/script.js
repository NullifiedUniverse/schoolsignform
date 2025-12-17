// --- Advanced Signature Logic ---
window.pads = {};

function initSignaturePad(id, name) {
    const canvas = document.getElementById(id);
    const parent = canvas.parentElement;
    
    // 1. High-Performance Configuration
    // We use 'pointer' events to support S-Pen/Apple Pencil pressure and eraser buttons
    const signaturePad = new SignaturePad(canvas, {
        minWidth: 1.0, 
        maxWidth: 4.0, // Wider dynamic range for pressure
        penColor: "#1e293b",
        throttle: 0, // Disable throttling for max smoothness (modern devices handle this fine)
        minDistance: 0, // Capture every point for high fidelity
        velocityFilterWeight: 0.2, // Smoother curves
    });
    
    // Store extra state for eraser toggle
    signaturePad.isErasing = false;
    window.pads[name] = signaturePad;

    // 2. Eraser Button Support (S-Pen / Surface Pen)
    canvas.addEventListener('pointerdown', (e) => {
        // e.button === 5 is standard for eraser buttons on many styluses
        // e.buttons === 32 is also common
        if (e.button === 5 || e.buttons === 32 || e.pointerType === 'pen' && e.button === -1) { 
            toggleEraser(name, true);
        }
    });
    
    canvas.addEventListener('pointerup', (e) => {
        // If we were erasing with a button, switch back to pen on release
        if (signaturePad.isErasing && (e.button === 5 || e.button === -1)) {
           toggleEraser(name, false); 
        }
    });

    // 3. Retina/High-DPI Handling
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const data = signaturePad.toData();
        canvas.width = parent.offsetWidth * ratio;
        canvas.height = parent.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear(); 
        signaturePad.fromData(data);
    }
    
    window.addEventListener("resize", resizeCanvas);
    setTimeout(resizeCanvas, 200);
}

window.toggleEraser = function(name, forceState = null) {
    const pad = window.pads[name];
    if (!pad) return;

    const newState = forceState !== null ? forceState : !pad.isErasing;
    pad.isErasing = newState;

    if (pad.isErasing) {
        pad.compositeOperation = 'destination-out';
        // Visual feedback (optional)
        document.getElementById(`btn-erase-${name}`)?.classList.add('bg-teal-100', 'text-teal-700', 'border-teal-300');
    } else {
        pad.compositeOperation = 'source-over';
        document.getElementById(`btn-erase-${name}`)?.classList.remove('bg-teal-100', 'text-teal-700', 'border-teal-300');
    }
}

async function submitToServer() {
    const studentName = document.getElementById('student-name').value.trim();
    const studentId = document.getElementById('student-id').value.trim();
    const parentName = document.getElementById('parent-name').value.trim();
    const sigStudent = window.pads['student'];
    const sigParent = window.pads['parent'];

    if (!studentName || !studentId || !parentName) {
        showToast("⚠️ Missing Information", "Please fill in all name and ID fields.");
        return;
    }
    if (sigStudent.isEmpty() || sigParent.isEmpty()) {
        showToast("⚠️ Missing Signatures", "Both Student and Parent must sign.");
        return;
    }

    const btn = document.getElementById('submit-btn');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-teal-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...`;

    try {
        const element = document.getElementById('paper-container');
        
        // --- CAPTURE LOGIC (Restored from previous turn) ---
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            windowWidth: 1200, // Force desktop width for consistency
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.getElementById('paper-container');
                if (clonedElement) {
                    // Normalize for PDF/Image output
                    clonedElement.style.width = '800px';
                    clonedElement.style.maxWidth = '800px';
                    clonedElement.style.margin = '0';
                    clonedElement.style.transform = 'none';
                    clonedElement.style.animation = 'none';
                    clonedElement.style.boxShadow = 'none';
                    clonedElement.style.border = '2px solid #000';
                    
                    // Flatten text inputs (Student Name, ID, Parent Name)
                    clonedDoc.querySelectorAll('input[type="text"]').forEach(input => {
                        input.style.background = 'transparent';
                        input.style.border = 'none';
                        input.style.borderBottom = '2px solid #333';
                        input.style.borderRadius = '0';
                        input.style.color = '#000';
                        input.style.padding = '28px 0 12px 0'; // More top/bottom padding
                        input.style.lineHeight = 'normal'; // Reset line height
                        input.style.fontFamily = 'Arial, sans-serif'; // Standard font for metrics
                        input.style.height = 'auto';
                        input.style.minHeight = '60px'; // Increase min-height
                        input.style.boxSizing = 'border-box';
                        input.style.overflow = 'visible';
                        input.style.fontSize = '16px';
                        input.style.width = '100%';
                        input.style.boxShadow = 'none';
                        input.style.margin = '0';
                    });

                    // Fix Label Positioning
                    clonedDoc.querySelectorAll('.input-label').forEach(label => {
                        label.style.position = 'absolute';
                        label.style.top = '0';
                        label.style.left = '0';
                        label.style.color = '#475569';
                        label.style.fontSize = '12px';
                        label.style.fontWeight = 'bold';
                        label.style.transform = 'none'; // Reset any transitions
                    });

                    // Hide "Clear" buttons in print
                     clonedDoc.querySelectorAll('button').forEach(b => b.style.display = 'none');
                }
            }
        });

        const base64Image = canvas.toDataURL("image/png");

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
            showToast("✅ Success", "Document uploaded securely.");
            // Optional: Redirect or disable form
        } else {
            throw new Error('Server upload failed');
        }

    } catch (err) {
        console.error(err);
        showToast("❌ Error", "Upload failed. Please try again.");
    } finally {
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

function clearPad(name) {
    if(window.pads[name]) window.pads[name].clear();
}

document.addEventListener('DOMContentLoaded', () => {
    initSignaturePad('canvas-student', 'student');
    initSignaturePad('canvas-parent', 'parent');
    
    const now = new Date();
    document.getElementById('auto-month').textContent = (now.getMonth() + 1).toString().padStart(2, '0');
    document.getElementById('auto-day').textContent = now.getDate().toString().padStart(2, '0');
});