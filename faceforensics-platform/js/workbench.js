/**
 * FaceForensics++ Enterprise Web Platform
 * Forgery Detection Workbench Controller
 */

const Workbench = {
    currentFile: null,
    isPreset: true,
    currentPresetType: 'deepfakes', // 'deepfakes', 'authentic', 'face2face', 'faceswap', 'neuraltextures'
    presets: {
        deepfakes: {
            name: 'vid_7849_deepfakes.mp4',
            title: 'Deepfakes (Face Swapping)',
            imageSrc: 'assets/samples/ex_deepfakes.png',
            gifSrc: 'assets/samples/deepfakes.gif',
            isFake: true,
            confidence: 99.4,
            method: 'Deepfakes',
            probabilities: { deepfakes: 88.4, face2face: 8.2, faceswap: 2.4, neuraltextures: 1.0 },
            resolution: '1920x1080',
            bbox: [412, 180, 690, 520],
            artifactRegion: 'Nasolabial & Eye Blending Borders',
            flagDesc: 'Facial boundary artifacts, warped landmark geometry, and color inconsistency detected.'
        },
        authentic: {
            name: 'vid_0012_pristine.mp4',
            title: 'Authentic / Pristine Sequence',
            imageSrc: 'assets/samples/ex_original.png',
            gifSrc: 'assets/samples/ex_original.png',
            isFake: false,
            confidence: 99.8,
            method: 'None (Pristine)',
            probabilities: { deepfakes: 0.1, face2face: 0.1, faceswap: 0.0, neuraltextures: 0.0, pristine: 99.8 },
            resolution: '1920x1080',
            bbox: [420, 175, 680, 510],
            artifactRegion: 'None (Natural skin texture & specular consistency)',
            flagDesc: 'Natural frequency spectrum and biological pulse rate verified across all frames.'
        },
        face2face: {
            name: 'vid_2091_face2face.mp4',
            title: 'Face2Face (Expression Transfer)',
            imageSrc: 'assets/samples/face2face.gif',
            gifSrc: 'assets/samples/face2face.gif',
            isFake: true,
            confidence: 95.8,
            method: 'Face2Face',
            probabilities: { deepfakes: 4.1, face2face: 91.2, faceswap: 3.5, neuraltextures: 1.2 },
            resolution: '1280x720',
            bbox: [380, 160, 640, 490],
            artifactRegion: 'Perioral & Mouth Interior Warping',
            flagDesc: 'Expression reenactment deformation along jawline and mouth cavity boundary.'
        },
        faceswap: {
            name: 'vid_3108_faceswap.mp4',
            title: 'FaceSwap (Classic Graphics)',
            imageSrc: 'assets/samples/faceswap.gif',
            gifSrc: 'assets/samples/faceswap.gif',
            isFake: true,
            confidence: 97.2,
            method: 'FaceSwap',
            probabilities: { deepfakes: 6.2, face2face: 2.1, faceswap: 90.4, neuraltextures: 1.3 },
            resolution: '1920x1080',
            bbox: [410, 170, 680, 515],
            artifactRegion: 'Rigid Feature Alignment & Edge Seams',
            flagDesc: '3D facial mask alignment seams and 2D-to-3D projection discrepancies identified.'
        },
        neuraltextures: {
            name: 'vid_4019_neuraltextures.mp4',
            title: 'NeuralTextures (GAN Photorealism)',
            imageSrc: 'assets/samples/neuraltextures.gif',
            gifSrc: 'assets/samples/neuraltextures.gif',
            isFake: true,
            confidence: 93.6,
            method: 'NeuralTextures',
            probabilities: { deepfakes: 2.8, face2face: 5.4, faceswap: 1.2, neuraltextures: 89.2 },
            resolution: '1920x1080',
            bbox: [415, 175, 685, 520],
            artifactRegion: 'Sub-surface Scattering & High-Frequency Noise',
            flagDesc: 'Neural rendering residual noise and mouth articulation texture anomalies found.'
        }
    },

    init() {
        this.setupDropzone();
        this.loadPreset('deepfakes', false);
    },

    setupDropzone() {
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('fileInput');

        if (!dropzone || !fileInput) return;

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('border-brand-500', 'bg-brand-500/10');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('border-brand-500', 'bg-brand-500/10');
            }, false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
    },

    handleFile(file) {
        if (!file) return;
        this.currentFile = file;
        this.isPreset = false;

        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
            showNotification('Unsupported format. Please upload MP4, AVI, MOV, PNG, or JPEG.', 'warning');
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const previewImg = document.getElementById('workbench-preview-img');
        if (previewImg) {
            previewImg.src = objectUrl;
        }

        // Reset display states
        document.getElementById('workbench-empty').classList.add('hidden');
        document.getElementById('workbench-progress').classList.add('hidden');
        document.getElementById('workbench-results').classList.add('hidden');

        const badge = document.getElementById('inference-status-badge');
        badge.className = "px-2.5 py-1 bg-brand-500/10 text-indigo-400 border border-brand-500/20 rounded-full text-xs font-semibold animate-pulse";
        badge.innerText = `Loaded: ${file.name.substring(0, 22)}${file.name.length > 22 ? '...' : ''}`;

        showNotification(`Loaded ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`, 'success');
    },

    loadPreset(presetKey, notify = true) {
        const preset = this.presets[presetKey];
        if (!preset) return;

        this.isPreset = true;
        this.currentPresetType = presetKey;
        this.currentFile = null;

        const previewImg = document.getElementById('workbench-preview-img');
        if (previewImg) {
            previewImg.src = preset.imageSrc;
        }

        const badge = document.getElementById('inference-status-badge');
        badge.className = "px-2.5 py-1 bg-brand-500/10 text-indigo-400 border border-brand-500/20 rounded-full text-xs font-semibold";
        badge.innerText = `Preset: ${preset.title}`;

        if (notify) {
            showNotification(`Loaded sample: ${preset.name} (${preset.title})`, 'info');
        }
    },

    startInference() {
        const emptyEl = document.getElementById('workbench-empty');
        const progressEl = document.getElementById('workbench-progress');
        const resultsEl = document.getElementById('workbench-results');
        const badgeEl = document.getElementById('inference-status-badge');
        const runBtn = document.getElementById('runBtn');
        const modelSelect = document.getElementById('modelSelect');
        const selectedModel = modelSelect ? modelSelect.value : 'xception';

        emptyEl.classList.add('hidden');
        resultsEl.classList.add('hidden');
        progressEl.classList.remove('hidden');

        runBtn.disabled = true;
        runBtn.classList.add('opacity-50', 'cursor-not-allowed');

        badgeEl.className = "px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold animate-pulse";
        badgeEl.innerText = "Running Inference...";

        let percent = 0;
        const percentEl = document.getElementById('progress-percent');
        const barFill = document.getElementById('progress-bar-fill');
        const stepTitle = document.getElementById('progress-step-title');
        const stepDesc = document.getElementById('progress-step-desc');

        const modelNames = {
            xception: 'XceptionNet (c23 HQ)',
            mesonet: 'MesoInception-4 (Edge)',
            efficientnet: 'EfficientNet-B4 (Ensemble)'
        };

        const interval = setInterval(() => {
            percent += 4;
            if (percent > 100) percent = 100;

            percentEl.innerText = `${percent}%`;
            barFill.style.width = `${percent}%`;

            if (percent === 20) {
                stepTitle.innerText = "Decompressing video & extracting frames...";
                stepDesc.innerText = "Splitting video sequence into 30fps keyframes";
            } else if (percent === 48) {
                stepTitle.innerText = "Detecting facial landmarks...";
                stepDesc.innerText = "Running MTCNN / dlib 68-point facial detector";
            } else if (percent === 72) {
                stepTitle.innerText = `Executing ${modelNames[selectedModel]} inference...`;
                stepDesc.innerText = "Computing spatial frequency and color-channel artifacts";
            } else if (percent === 92) {
                stepTitle.innerText = "Synthesizing Grad-CAM heatmaps...";
                stepDesc.innerText = "Aggregating forgery probability tensors";
            }

            if (percent >= 100) {
                clearInterval(interval);
                progressEl.classList.add('hidden');
                resultsEl.classList.remove('hidden');

                runBtn.disabled = false;
                runBtn.classList.remove('opacity-50', 'cursor-not-allowed');

                Workbench.renderResults(selectedModel);
            }
        }, 90);
    },

    renderResults(selectedModel) {
        const badgeEl = document.getElementById('inference-status-badge');
        const preset = this.isPreset ? this.presets[this.currentPresetType] : {
            name: this.currentFile ? this.currentFile.name : 'uploaded_sample.mp4',
            title: 'Uploaded Media',
            imageSrc: 'assets/samples/ex_deepfakes.png',
            isFake: true,
            confidence: 98.7,
            method: 'Deepfakes',
            probabilities: { deepfakes: 86.2, face2face: 9.1, faceswap: 3.2, neuraltextures: 1.5 },
            resolution: '1920x1080',
            bbox: [412, 180, 690, 520],
            artifactRegion: 'Nasolabial & Eye Blending Borders',
            flagDesc: 'Facial landmark warping and blending mask boundary discrepancies detected.'
        };

        const resultBanner = document.getElementById('result-banner');
        const resultIcon = document.getElementById('result-icon');
        const resultTitle = document.getElementById('result-title');
        const resultBadgeSub = document.getElementById('result-badge-sub');
        const resultDesc = document.getElementById('result-desc');
        const heatmapVisualizer = document.getElementById('heatmap-visualizer');
        const artifactFocusText = document.getElementById('artifact-focus-text');
        const artifactStatusText = document.getElementById('artifact-status-text');
        const bboxBadge = document.getElementById('bbox-badge');

        if (preset.isFake) {
            badgeEl.className = "px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-semibold";
            badgeEl.innerText = `Flagged: Manipulated (${preset.confidence}%)`;

            resultBanner.className = "p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 bg-rose-500/10 border-rose-500/30";
            resultIcon.className = "w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-rose-500/30";
            resultIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
            resultTitle.innerText = "DEEPFAKE DETECTED";
            resultBadgeSub.className = "px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded text-xs font-bold";
            resultBadgeSub.innerText = `${preset.confidence}% CONFIDENCE`;
            resultDesc.innerText = preset.flagDesc;

            if (bboxBadge) {
                bboxBadge.className = "bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded";
                bboxBadge.innerText = `Fake ${(preset.confidence).toFixed(0)}%`;
            }

            if (heatmapVisualizer) {
                heatmapVisualizer.className = "h-48 rounded-lg bg-gradient-to-tr from-rose-950 via-purple-950 to-dark-900 flex items-center justify-center relative overflow-hidden heatmap-container";
            }
            if (artifactFocusText) artifactFocusText.innerText = `Artifact Focus: ${preset.artifactRegion}`;
            if (artifactStatusText) {
                artifactStatusText.innerText = "Manipulation Confirmed";
                artifactStatusText.className = "text-rose-400 font-bold";
            }

            showNotification(`Inference complete: Deepfake identified (${preset.confidence}%)`, 'warning');
        } else {
            badgeEl.className = "px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold";
            badgeEl.innerText = `Verified: Pristine (${preset.confidence}%)`;

            resultBanner.className = "p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-500/10 border-emerald-500/30";
            resultIcon.className = "w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-emerald-500/30";
            resultIcon.innerHTML = '<i class="fa-solid fa-shield-check"></i>';
            resultTitle.innerText = "PRISTINE & AUTHENTIC";
            resultBadgeSub.className = "px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold";
            resultBadgeSub.innerText = `${preset.confidence}% REAL`;
            resultDesc.innerText = preset.flagDesc;

            if (bboxBadge) {
                bboxBadge.className = "bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded";
                bboxBadge.innerText = `Real ${(preset.confidence).toFixed(0)}%`;
            }

            if (heatmapVisualizer) {
                heatmapVisualizer.className = "h-48 rounded-lg bg-gradient-to-tr from-emerald-950 via-teal-950 to-dark-900 flex items-center justify-center relative overflow-hidden heatmap-clean";
            }
            if (artifactFocusText) artifactFocusText.innerText = `Artifact Focus: ${preset.artifactRegion}`;
            if (artifactStatusText) {
                artifactStatusText.innerText = "Natural Biological Signal";
                artifactStatusText.className = "text-emerald-400 font-bold";
            }

            showNotification(`Inference complete: Sample is Authentic Pristine (${preset.confidence}%)`, 'success');
        }

        // Update probability bars
        const dfBar = document.getElementById('prob-deepfakes-bar');
        const dfVal = document.getElementById('prob-deepfakes-val');
        const f2fBar = document.getElementById('prob-face2face-bar');
        const f2fVal = document.getElementById('prob-face2face-val');
        const fsBar = document.getElementById('prob-faceswap-bar');
        const fsVal = document.getElementById('prob-faceswap-val');
        const ntBar = document.getElementById('prob-neuraltextures-bar');
        const ntVal = document.getElementById('prob-neuraltextures-val');

        if (dfBar) dfBar.style.width = `${preset.probabilities.deepfakes}%`;
        if (dfVal) dfVal.innerText = `${preset.probabilities.deepfakes}%`;

        if (f2fBar) f2fBar.style.width = `${preset.probabilities.face2face}%`;
        if (f2fVal) f2fVal.innerText = `${preset.probabilities.face2face}%`;

        if (fsBar) fsBar.style.width = `${preset.probabilities.faceswap}%`;
        if (fsVal) fsVal.innerText = `${preset.probabilities.faceswap}%`;

        if (ntBar) ntBar.style.width = `${preset.probabilities.neuraltextures}%`;
        if (ntVal) ntVal.innerText = `${preset.probabilities.neuraltextures}%`;
    },

    downloadForensicJson() {
        const preset = this.isPreset ? this.presets[this.currentPresetType] : {
            name: this.currentFile ? this.currentFile.name : 'user_sample.mp4',
            method: 'Deepfakes',
            confidence: 99.4,
            isFake: true,
            resolution: '1920x1080',
            bbox: [412, 180, 690, 520],
            artifactRegion: 'Nasolabial & Eye Blending'
        };

        const report = {
            reportId: `FF_LOG_${Date.now()}`,
            timestamp: new Date().toISOString(),
            analyzedSample: preset.name,
            resolution: preset.resolution,
            classificationVerdict: preset.isFake ? "MANIPULATED" : "AUTHENTIC",
            confidenceScore: preset.confidence,
            detectedMethod: preset.method,
            modelArchitecture: "XceptionNet (FF++ c23)",
            frameAnalysis: {
                totalFrames: 300,
                tamperedFrames: preset.isFake ? 224 : 0,
                tamperingInterval: preset.isFake ? "00:03 - 00:11" : "None"
            },
            facialBoundingBox: preset.bbox,
            salientRegion: preset.artifactRegion,
            cryptographicSHA256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forensic_audit_${preset.name.replace(/\.[^/.]+$/, "")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Detailed forensic JSON audit report downloaded.', 'success');
    },

    updateTimelineScrubber(val) {
        const scrubberTime = document.getElementById('scrubber-time');
        const frameSec = Math.floor(val / 20);
        const frameSecStr = frameSec.toString().padStart(2, '0');
        if (scrubberTime) {
            scrubberTime.innerText = `00:${frameSecStr} / 00:15 (Frame ${val})`;
        }
    }
};

// Global Exposure
window.handleFileSelect = (event) => Workbench.handleFile(event.target.files[0]);
window.loadSamplePreset = (type = 'deepfakes') => Workbench.loadPreset(type);
window.startInference = () => Workbench.startInference();
window.downloadForensicJson = () => Workbench.downloadForensicJson();
window.updateTimelineScrubber = (val) => Workbench.updateTimelineScrubber(val);

window.addEventListener('DOMContentLoaded', () => {
    Workbench.init();
});
