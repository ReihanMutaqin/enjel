const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const PHOTOS_DIR = path.join(PUBLIC_DIR, 'habib-gabbyy');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.otf': 'font/otf'
};

function runGitCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd: PUBLIC_DIR }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Git Command Error (${cmd}):`, stderr || error.message);
                resolve({ success: false, output: stderr || error.message });
            } else {
                console.log(`Git Command Output (${cmd}):`, stdout);
                resolve({ success: true, output: stdout.trim() });
            }
        });
    });
}

function getNextPhotoNumber() {
    try {
        if (!fs.existsSync(PHOTOS_DIR)) {
            fs.mkdirSync(PHOTOS_DIR, { recursive: true });
        }
        const files = fs.readdirSync(PHOTOS_DIR);
        let maxIndex = 4; // Default starting index is 4 (since foto1-4 are template defaults)
        files.forEach(file => {
            const match = file.match(/^foto(\d+)\.(jpg|jpeg|png|webp)$/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxIndex) maxIndex = num;
            }
        });
        return maxIndex + 1;
    } catch (err) {
        console.error('Error scanning photos dir:', err);
        return 5;
    }
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // API: List Photos in habib-gabbyy/
    if (pathname === '/api/photos' && req.method === 'GET') {
        try {
            const files = fs.readdirSync(PHOTOS_DIR);
            const photoList = files.filter(file => /^foto\d+\.(jpg|jpeg|png|webp)$/i.test(file));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, photos: photoList }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    // API: Upload Photo and Auto Push to Git
    if (pathname === '/api/upload-photo' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                if (!data.image) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Data gambar tidak ditemukan.' }));
                    return;
                }

                // Extract base64 image data
                const matches = data.image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
                if (!matches) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Format base64 gambar tidak valid.' }));
                    return;
                }

                let ext = matches[1].toLowerCase();
                if (ext === 'jpeg') ext = 'jpg';
                const base64Data = matches[2];
                const buffer = Buffer.from(base64Data, 'base64');

                const photoNumber = getNextPhotoNumber();
                const filename = `foto${photoNumber}.${ext}`;
                const filePath = path.join(PHOTOS_DIR, filename);

                // Save file to habib-gabbyy/
                fs.writeFileSync(filePath, buffer);
                console.log(`Foto berhasil disimpan: ${filePath}`);

                // Auto Git Add, Commit & Push
                const gitAdd = await runGitCommand(`git add "habib-gabbyy/${filename}"`);
                const gitCommit = await runGitCommand(`git commit -m "Upload foto ${filename} ke galeri"`);
                const gitPush = await runGitCommand('git push origin main');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    filename: filename,
                    path: `habib-gabbyy/${filename}`,
                    git: {
                        add: gitAdd,
                        commit: gitCommit,
                        push: gitPush
                    }
                }));
            } catch (err) {
                console.error('Error handling photo upload:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: err.message }));
            }
        });
        return;
    }

    // API: Manual Git Push All
    if (pathname === '/api/git-push' && req.method === 'POST') {
        (async () => {
            try {
                const gitAdd = await runGitCommand('git add .');
                const gitCommit = await runGitCommand('git commit -m "Update otomatis dari dashboard admin"');
                const gitPush = await runGitCommand('git push origin main');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, gitAdd, gitCommit, gitPush }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        })();
        return;
    }

    // Static File Serving
    let reqPath = decodeURIComponent(pathname);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    if (reqPath === '/edit') reqPath = '/edit.html';

    let safePath = path.normalize(path.join(PUBLIC_DIR, reqPath));
    if (!safePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) {
        safePath = path.join(safePath, 'index.html');
    }

    fs.stat(safePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(safePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stats.size
        });

        const readStream = fs.createReadStream(safePath);
        readStream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Undangan Enjel Local Server Running!`);
    console.log(` Undangan: http://localhost:${PORT}/`);
    console.log(` Editor & Auto-Git Upload: http://localhost:${PORT}/edit`);
    console.log(`====================================================`);
});
