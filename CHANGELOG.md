# 🚀 Changelog

All notable changes to the **Signature System** project will be documented in this file.

## [Unreleased]

## [1.2.0] - 2025-12-17
### ✨ Features & UI Overhaul
-   **Premium "Bento" Design**: completely redesigned the UI with a modern, card-based layout featuring glassmorphism (`backdrop-blur`), spring-physics animations (`bentoBounce`), and deep teal accents.
-   **Advanced Signature Pad**: 
    -   Implemented high-fidelity pointer event handling for smoother curves.
    -   Added **Pressure Sensitivity** support (simulated width variation).
    -   Added native **Eraser Support** for S-Pen/Surface Pen (tail button).
    -   Included a manual UI Eraser tool for standard users.
-   **Responsive & Touch-Ready**: Optimized for mobile devices with `touch-action` handling and dynamic canvas resizing for high-DPI (Retina) displays.

### 🛠 Fixes & Improvements
-   **Saved Image Perfection**: 
    -   Fixed text cutoff issues in generated images by adjusting input padding and line heights.
    -   Solved label overlapping/misalignment in the final output.
    -   Standardized export width to `800px` for consistent PDF/printing results.
-   **Codebase Refactor**:
    -   📦 Extracted styles to `public/css/style.css`.
    -   ⚡️ Moved logic to `public/js/script.js`.
    -   Cleaned up `index.html` for better readability.

### 🐛 Bug Fixes
-   Fixed layout shifts during `html2canvas` capture.
-   Resolved issues with mobile input scaling.

---

## [1.1.0] - 2025-12-10
### Added
-   Initial server setup with Express.js.
-   Cloudinary integration for secure image storage.
-   Basic signature capture functionality.
