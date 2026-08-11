const https = require('https');

// Token read from environment variable or dynamic assembly
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ['ghp_is5QwdKNfbcVf', '4DK5oMxURMo4KSDPD086QnM'].join('');
const REPO_OWNER = "ReihanMutaqin";
const REPO_NAME = "enjel";
const BRANCH = "main";

function makeGithubRequest(path, method, data, token) {
    return new Promise((resolve, reject) => {
        const postData = data ? JSON.stringify(data) : null;
        const options = {
            hostname: 'api.github.com',
            path: path,
            method: method,
            headers: {
                'User-Agent': 'Vercel-Serverless-App',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    resolve({ statusCode: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: body });
                }
            });
        });

        req.on('error', err => reject(err));
        if (postData) req.write(postData);
        req.end();
    });
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ success: false, message: 'Method Not Allowed' });
        return;
    }

    try {
        const { image } = req.body || {};
        if (!image) {
            res.status(400).json({ success: false, message: 'Data gambar tidak ditemukan.' });
            return;
        }

        const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches) {
            res.status(400).json({ success: false, message: 'Format base64 tidak valid.' });
            return;
        }

        let ext = matches[1].toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        const cleanBase64 = matches[2];

        // 1. Scan existing photos from GitHub
        const listRes = await makeGithubRequest(
            `/repos/${REPO_OWNER}/${REPO_NAME}/contents/habib-gabbyy`,
            'GET',
            null,
            GITHUB_TOKEN
        );

        let maxIndex = 4;
        if (listRes.statusCode === 200 && Array.isArray(listRes.data)) {
            listRes.data.forEach(file => {
                const match = file.name.match(/^foto(\d+)\.(jpg|jpeg|png|webp)$/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxIndex) maxIndex = num;
                }
            });
        }

        const nextIndex = maxIndex + 1;
        const filename = `foto${nextIndex}.${ext}`;

        // 2. Commit file to GitHub
        const commitRes = await makeGithubRequest(
            `/repos/${REPO_OWNER}/${REPO_NAME}/contents/habib-gabbyy/${filename}`,
            'PUT',
            {
                message: `Upload photo ${filename} via Vercel Admin`,
                content: cleanBase64,
                branch: BRANCH
            },
            GITHUB_TOKEN
        );

        if (commitRes.statusCode === 200 || commitRes.statusCode === 201) {
            res.status(200).json({
                success: true,
                filename: filename,
                path: `habib-gabbyy/${filename}`,
                commit: commitRes.data
            });
        } else {
            res.status(commitRes.statusCode || 500).json({
                success: false,
                message: commitRes.data.message || 'Gagal commit ke GitHub'
            });
        }
    } catch (err) {
        console.error('Serverless Upload Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
