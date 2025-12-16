const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load environment variables
const cloudinary = require('cloudinary').v2;

const app = express();
const port = process.env.PORT || 3000; // Use PORT from env (required for Render)

// Security: Limit payload size to prevent DOS
app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

// Configure Cloudinary (if credentials exist)
const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
if (useCloudinary) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log("✅ Cloudinary Configured for Production Storage");
} else {
    console.log("⚠️ Cloudinary credentials missing. Using local storage (files will be lost on server restart).");
}

// Ensure uploads directory exists (for local fallback)
const uploadDir = path.join(__dirname, 'uploads');
if (!useCloudinary && !fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

app.post('/api/upload', async (req, res) => {
    const { image, studentName, studentId } = req.body;

    // 1. Validate Input Presence
    if (!image || !studentName || !studentId) {
        return res.status(400).send('Missing required fields');
    }

    // 2. Validate Image Data
    if (!image.startsWith('data:image/png;base64,')) {
        return res.status(400).send('Invalid image format. Only PNG is allowed.');
    }

    // 3. Sanitize Filename
    const safeName = studentName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').slice(0, 20);
    const safeId = studentId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
    const timestamp = Date.now();
    const finalFilename = `${safeName}_${safeId}_${timestamp}`; // No extension for Cloudinary public_id

    try {
        if (useCloudinary) {
            // --- CLOUD STORAGE (Production) ---
            // Create a date-based subfolder (e.g., "kcis-signatures/2023-10-27")
            const today = new Date().toISOString().split('T')[0];
            
            const uploadResult = await cloudinary.uploader.upload(image, {
                folder: `kcis-signatures/${today}`,
                public_id: finalFilename,
                resource_type: "image"
            });
            console.log(`[CLOUD UPLOAD] Saved: ${uploadResult.secure_url}`);
            return res.status(200).send({ success: true, filename: finalFilename, url: uploadResult.secure_url });

        } else {
            // --- LOCAL STORAGE (Development) ---
            const localFilename = `${finalFilename}.png`;
            const filePath = path.join(uploadDir, localFilename);
            const base64Data = image.replace(/^data:image\/png;base64,/, "");

            fs.writeFile(filePath, base64Data, 'base64', (err) => {
                if (err) {
                    console.error('Write Error:', err);
                    return res.status(500).send('Server internal error');
                }
                console.log(`[LOCAL UPLOAD] Saved: ${localFilename}`);
                res.status(200).send({ success: true, filename: localFilename });
            });
        }
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).send("Upload failed");
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});