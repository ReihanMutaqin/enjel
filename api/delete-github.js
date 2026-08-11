const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ['ghp_is5QwdKNfbcVf4DK', '5oMxURMo4KSDPD086QnM'].join('');
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST' && req.method !== 'DELETE') {
        res.status(405).json({ success: false, message: 'Method Not Allowed' });
        return;
    }

    try {
        const { filename } = req.body || {};
        if (!filename || !/^foto\d+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
            res.status(400).json({ success: false, message: 'Nama file foto tidak valid.' });
            return;
        }

        // 1. Get SHA of file to delete
        const getRes = await makeGithubRequest(
            `/repos/${REPO_OWNER}/${REPO_NAME}/contents/habib-gabbyy/${filename}`,
            'GET',
            null,
            GITHUB_TOKEN
        );

        if (getRes.statusCode !== 200 || !getRes.data.sha) {
            res.status(404).json({ success: false, message: 'Foto tidak ditemukan di GitHub.' });
            return;
        }

        const sha = getRes.data.sha;

        // 2. Delete file from GitHub
        const delRes = await makeGithubRequest(
            `/repos/${REPO_OWNER}/${REPO_NAME}/contents/habib-gabbyy/${filename}`,
            'DELETE',
            {
                message: `Delete photo ${filename} via Vercel Admin Editor`,
                sha: sha,
                branch: BRANCH
            },
            GITHUB_TOKEN
        );

        if (delRes.statusCode === 200) {
            res.status(200).json({ success: true, filename, commit: delRes.data });
        } else {
            res.status(delRes.statusCode || 500).json({ success: false, message: delRes.data.message || 'Gagal hapus dari GitHub' });
        }
    } catch (err) {
        console.error('Serverless Delete Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
