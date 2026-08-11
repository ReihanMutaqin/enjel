const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = __dirname;
const PHOTOS_DIR = path.join(PROJECT_DIR, 'habib-gabbyy');

console.log("=========================================");
console.log(" 📸 Syncing & Uploading Photos to Git...");
console.log("=========================================");

try {
    const gitStatus = execSync('git status --porcelain habib-gabbyy/', { cwd: PROJECT_DIR, encoding: 'utf-8' });
    if (!gitStatus.trim()) {
        console.log("ℹ️ Tidak ada foto baru di folder habib-gabbyy/.");
    } else {
        console.log("➕ Menambahkan foto baru ke Git...");
        execSync('git add habib-gabbyy/', { cwd: PROJECT_DIR, stdio: 'inherit' });
        
        console.log("📝 Membuat Commit Git...");
        execSync('git commit -m "Upload foto galeri baru ke folder habib-gabbyy/"', { cwd: PROJECT_DIR, stdio: 'inherit' });
    }

    console.log("🚀 Pushing ke GitHub (https://github.com/ReihanMutaqin/enjel.git)...");
    execSync('git push origin main', { cwd: PROJECT_DIR, stdio: 'inherit' });
    
    console.log("=========================================");
    console.log(" ✅ BERHASIL! Foto telah diupload ke Git & Vercel!");
    console.log("=========================================");
} catch (err) {
    console.error("❌ Terjadi kesalahan saat upload ke Git:", err.message);
}
