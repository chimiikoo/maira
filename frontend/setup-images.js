const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'assets');
const sourceFiles = [
    {
        src: 'C:/Users/Пользователь/.gemini/antigravity/brain/586ad45d-e05e-427b-a624-86c5a41f6f09/hero_manicure_luxury_1776096687007.png',
        dest: 'hero.png'
    },
    {
        src: 'C:/Users/Пользователь/.gemini/antigravity/brain/586ad45d-e05e-427b-a624-86c5a41f6f09/salon_interior_luxury_1776096781656.png',
        dest: 'interior.png'
    },
    {
        src: 'C:/Users/Пользователь/.gemini/antigravity/brain/586ad45d-e05e-427b-a624-86c5a41f6f09/pedicure_luxury_1776096847817.png',
        dest: 'pedicure.png'
    }
];

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
    console.log('✅ Created assets directory.');
}

sourceFiles.forEach(file => {
    const destination = path.join(targetDir, file.dest);
    try {
        fs.copyFileSync(file.src, destination);
        console.log(`✅ Successfully copied ${file.dest}`);
    } catch (err) {
        console.error(`❌ Failed to copy ${file.dest}:`, err.message);
    }
});

console.log('🎉 All images are ready for Netlify!');
