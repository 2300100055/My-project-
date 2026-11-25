/**
 * Deepfake Vision AI — Video Frame Extraction
 * Uses ffmpeg if available, otherwise returns empty.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function ffmpegAvailable() {
    try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
        return true;
    } catch { return false; }
}

async function extractFrames(videoPath, options = {}) {
    const { sampleRate = 5, maxFrames = 30 } = options;
    if (!ffmpegAvailable()) {
        return { error: 'ffmpeg not found on PATH', frames: [] };
    }
    if (!fs.existsSync(videoPath)) {
        return { error: 'Video file not found', frames: [] };
    }

    return new Promise((resolve) => {
        const frames = [];
        const args = [
            '-i', videoPath,
            '-vf', `select='not(mod(n\\,${sampleRate}))'`,
            '-vsync', 'vfn',
            '-frames:v', String(maxFrames),
            '-f', 'image2pipe',
            '-vcodec', 'png',
            'pipe:1'
        ];

        const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'ignore'] });
        const chunks = [];

        proc.stdout.on('data', (chunk) => chunks.push(chunk));
        proc.on('close', (code) => {
            if (code !== 0) {
                resolve({ error: `ffmpeg exited with code ${code}`, frames: [] });
                return;
            }
            // Split PNG chunks by header signature
            const buf = Buffer.concat(chunks);
            const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
            let pos = 0;
            const starts = [];
            while ((pos = buf.indexOf(PNG_SIG, pos)) !== -1) {
                starts.push(pos);
                pos += 8;
            }
            for (let i = 0; i < starts.length; i++) {
                const end = i + 1 < starts.length ? starts[i + 1] : buf.length;
                frames.push(buf.subarray(starts[i], end));
            }
            resolve({ error: null, frames });
        });
        proc.on('error', () => resolve({ error: 'ffmpeg spawn error', frames: [] }));

        setTimeout(() => { try { proc.kill(); } catch {} }, 30000);
    });
}

async function extractAudio(videoPath, outputDir) {
    if (!ffmpegAvailable()) return null;
    const outPath = path.join(outputDir, 'audio_' + Date.now() + '.wav');
    return new Promise((resolve) => {
        const proc = spawn('ffmpeg', [
            '-i', videoPath, '-vn', '-acodec', 'pcm_s16le',
            '-ar', '16000', '-ac', '1', outPath
        ], { stdio: 'ignore' });
        proc.on('close', (code) => resolve(code === 0 ? outPath : null));
        proc.on('error', () => resolve(null));
    });
}

module.exports = { extractFrames, extractAudio, ffmpegAvailable };
