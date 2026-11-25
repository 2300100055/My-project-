/**
 * Deepfake Vision AI — MediaPipe Face Detector Wrapper
 * Uses MediaPipe Face Landmarker from CDN (loaded in HTML).
 */
(function() {
    let landmarker = null;
    let isInitialized = false;

    window.FaceDetector = {
        async init() {
            try {
                if (typeof vision === 'undefined' || !vision.FaceLandmarker) {
                    console.warn('MediaPipe vision not loaded — face detection disabled');
                    return;
                }
                const filesetResolver = await vision.FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
                );
                landmarker = await vision.FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                        delegate: 'GPU'
                    },
                    runningMode: 'IMAGE',
                    numFaces: 5,
                    outputFaceBlendshapes: false,
                    outputFacialTransformationMatrixes: false
                });
                isInitialized = true;
                console.log('✓ MediaPipe Face Landmarker ready');
            } catch (e) {
                console.warn('MediaPipe init failed:', e.message);
                isInitialized = false;
            }
        },

        isReady() { return isInitialized && landmarker !== null; },

        detect(imageElement) {
            if (!landmarker) return [];
            try {
                const result = landmarker.detect(imageElement);
                if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) return [];
                return result.faceLandmarks.map((landmarks, i) => {
                    // Compute bounding box from landmarks
                    let minX = 1, minY = 1, maxX = 0, maxY = 0;
                    for (const lm of landmarks) {
                        if (lm.x < minX) minX = lm.x;
                        if (lm.y < minY) minY = lm.y;
                        if (lm.x > maxX) maxX = lm.x;
                        if (lm.y > maxY) maxY = lm.y;
                    }
                    // Nose bridge midline (landmarks 1, 4, 5, 6, 168, 197)
                    const noseIndices = [1, 4, 5, 6];
                    let noseX = 0;
                    for (const ni of noseIndices) {
                        if (landmarks[ni]) noseX += landmarks[ni].x;
                    }
                    noseX /= noseIndices.length;

                    return {
                        bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
                        landmarks,
                        noseBridgeMidline: { x: noseX, y: (minY + maxY) / 2 },
                        index: i
                    };
                });
            } catch (e) {
                console.warn('Face detection error:', e.message);
                return [];
            }
        },

        cropFace(canvas, detection, targetSize = 224) {
            const { bbox } = detection;
            const sx = bbox.x * canvas.width;
            const sy = bbox.y * canvas.height;
            const sw = bbox.width * canvas.width;
            const sh = bbox.height * canvas.height;
            // Add 20% padding
            const pad = 0.2;
            const px = Math.max(0, sx - sw * pad);
            const py = Math.max(0, sy - sh * pad);
            const pw = Math.min(canvas.width - px, sw * (1 + 2 * pad));
            const ph = Math.min(canvas.height - py, sh * (1 + 2 * pad));

            const crop = document.createElement('canvas');
            crop.width = targetSize; crop.height = targetSize;
            const ctx = crop.getContext('2d');
            ctx.drawImage(canvas, px, py, pw, ph, 0, 0, targetSize, targetSize);
            return crop;
        },

        getNoseMidlineX(detection) {
            if (!detection || !detection.noseBridgeMidline) return 0.5;
            return detection.noseBridgeMidline.x;
        }
    };

    // Auto-init when script loads (after DOM ready)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(() => window.FaceDetector.init(), 500));
    } else {
        setTimeout(() => window.FaceDetector.init(), 500);
    }
})();
