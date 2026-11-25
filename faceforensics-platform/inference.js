/**
 * Deepfake Vision AI — ONNX Model Inference Wrapper
 * Gracefully falls back when onnxruntime-node or model files are unavailable.
 */

let ort = null;
let sessions = {};
let ready = false;
const modelStatus = {};

async function init(modelsDir) {
    const path = require('path');
    const fs = require('fs');

    const models = {
        efficientnet: 'efficientnet_b4_dfdc.onnx',
        xception: 'xception_ff.onnx',
        f3net: 'f3net_fft.onnx',
        clip: 'clip_vit_linear_probe.onnx'
    };

    // Try loading onnxruntime-node
    try {
        ort = require('onnxruntime-node');
        console.log('  ✓ onnxruntime-node loaded');
    } catch (e) {
        console.log('  ⚠ onnxruntime-node not installed — using Pixel Forensics fallback');
        for (const k of Object.keys(models)) modelStatus[k] = 'unavailable';
        return getStatus();
    }

    // Check for model files
    for (const [key, filename] of Object.entries(models)) {
        const fp = path.join(modelsDir, filename);
        if (fs.existsSync(fp)) {
            try {
                sessions[key] = await ort.InferenceSession.create(fp);
                modelStatus[key] = 'loaded';
                console.log(`  ✓ Model loaded: ${filename}`);
            } catch (e) {
                modelStatus[key] = 'error';
                console.log(`  ✗ Failed to load ${filename}: ${e.message}`);
            }
        } else {
            modelStatus[key] = 'missing';
            console.log(`  · Model not found: ${filename}`);
        }
    }

    ready = Object.values(modelStatus).some(s => s === 'loaded');
    return getStatus();
}

async function runSpatialDetector(inputArray, width, height) {
    if (!ort || !sessions.efficientnet) return null;
    try {
        const tensor = new ort.Tensor('float32', Float32Array.from(inputArray), [1, 3, height, width]);
        const results = await sessions.efficientnet.run({ input: tensor });
        const output = results.output.data;
        return { real: output[0], fake: output[1] };
    } catch (e) {
        console.error('Spatial inference error:', e.message);
        return null;
    }
}

async function runFrequencyDetector(fftArray) {
    if (!ort || !sessions.f3net) return null;
    try {
        const tensor = new ort.Tensor('float32', Float32Array.from(fftArray), [1, 1, 256, 256]);
        const results = await sessions.f3net.run({ input: tensor });
        const output = results.output.data;
        return { real: output[0], fake: output[1] };
    } catch (e) {
        console.error('Frequency inference error:', e.message);
        return null;
    }
}

function isReady() { return ready; }

function getStatus() {
    return {
        available: ready,
        onnxLoaded: ort !== null,
        models: { ...modelStatus }
    };
}

module.exports = { init, runSpatialDetector, runFrequencyDetector, isReady, getStatus };
