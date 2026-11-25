/**
 * Deepfake Vision AI — Grad-CAM Heatmap Visualization
 * Renders attention heatmaps from model activations or pixel telemetry.
 */
(function() {

    window.GradCAM = {
        /**
         * Render a Grad-CAM style heatmap on a canvas element.
         * @param {string} canvasId - Canvas element ID
         * @param {HTMLImageElement} imageElement - Original image
         * @param {Float32Array|null} activationMap - 2D activation values (null = generate from metrics)
         * @param {object} options - { opacity: 0.5, showOverlay: true }
         */
        renderHeatmap(canvasId, imageElement, activationMap, options = {}) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return null;
            const ctx = canvas.getContext('2d');
            const { opacity = 0.5, showOverlay = true } = options;

            canvas.width = canvas.offsetWidth || 300;
            canvas.height = canvas.offsetHeight || 180;
            const W = canvas.width, H = canvas.height;

            // Draw original image
            if (imageElement && showOverlay) {
                ctx.drawImage(imageElement, 0, 0, W, H);
            } else {
                ctx.fillStyle = '#0b0f19';
                ctx.fillRect(0, 0, W, H);
            }

            if (!activationMap || activationMap.length === 0) return canvas;

            // Determine activation grid size
            const gridSize = Math.round(Math.sqrt(activationMap.length));
            const cellW = W / gridSize, cellH = H / gridSize;

            // Draw heatmap overlay
            const overlayData = ctx.getImageData(0, 0, W, H);
            const pix = overlayData.data;

            for (let gy = 0; gy < gridSize; gy++) {
                for (let gx = 0; gx < gridSize; gx++) {
                    const val = activationMap[gy * gridSize + gx] || 0;
                    const [r, g, b] = jetColormap(val);
                    const x0 = Math.floor(gx * cellW), y0 = Math.floor(gy * cellH);
                    const x1 = Math.floor((gx + 1) * cellW), y1 = Math.floor((gy + 1) * cellH);
                    for (let y = y0; y < y1 && y < H; y++) {
                        for (let x = x0; x < x1 && x < W; x++) {
                            const i = (y * W + x) * 4;
                            pix[i]     = Math.round(pix[i]     * (1 - opacity) + r * opacity);
                            pix[i + 1] = Math.round(pix[i + 1] * (1 - opacity) + g * opacity);
                            pix[i + 2] = Math.round(pix[i + 2] * (1 - opacity) + b * opacity);
                        }
                    }
                }
            }
            ctx.putImageData(overlayData, 0, 0);

            // Apply Gaussian blur for smooth look
            ctx.filter = 'blur(4px)';
            ctx.globalAlpha = 0.6;
            ctx.drawImage(canvas, 0, 0);
            ctx.filter = 'none';
            ctx.globalAlpha = 1.0;

            return canvas;
        },

        /**
         * Generate activation map from pixel telemetry metrics.
         * Computes per-block anomaly scores.
         */
        generateFromPixelMetrics(imageData, metrics) {
            const w = imageData.width, h = imageData.height;
            const px = imageData.data;
            const gridSize = 16;
            const cellW = Math.floor(w / gridSize), cellH = Math.floor(h / gridSize);
            const map = new Float32Array(gridSize * gridSize);

            const globalNoise = metrics.noiseUniformity || 10;
            const globalLap = metrics.laplacianEnergy || 10;

            for (let gy = 0; gy < gridSize; gy++) {
                for (let gx = 0; gx < gridSize; gx++) {
                    // Compute local metrics for this block
                    let localNoise = 0, localLap = 0, cnt = 0;
                    const x0 = gx * cellW, y0 = gy * cellH;
                    for (let dy = 1; dy < cellH - 1; dy += 2) {
                        for (let dx = 1; dx < cellW - 1; dx += 2) {
                            const x = x0 + dx, y = y0 + dy;
                            if (x >= w - 1 || y >= h - 1) continue;
                            const i = (y * w + x) * 4;
                            const iR = (y * w + x + 1) * 4;
                            const iD = ((y + 1) * w + x) * 4;
                            const L = (xx, yy) => {
                                const ii = (yy * w + xx) * 4;
                                return 0.299 * px[ii] + 0.587 * px[ii+1] + 0.114 * px[ii+2];
                            };
                            // Noise
                            for (let c = 0; c < 3; c++) {
                                localNoise += Math.abs(px[i+c] - px[iR+c]);
                            }
                            // Laplacian
                            const lap = Math.abs(4*L(x,y) - L(x-1,y) - L(x+1,y) - L(x,y-1) - L(x,y+1));
                            localLap += lap;
                            cnt++;
                        }
                    }
                    if (cnt > 0) {
                        localNoise /= (cnt * 3);
                        localLap /= cnt;
                    }
                    // Anomaly: regions smoother than average or with unusual Laplacian
                    let anomaly = 0;
                    if (globalNoise > 0) anomaly += Math.max(0, 1 - localNoise / (globalNoise + 1)) * 0.5;
                    if (globalLap > 0)   anomaly += Math.max(0, 1 - localLap / (globalLap + 1)) * 0.5;
                    // Face-center regions weighted higher
                    const cx = (gx + 0.5) / gridSize, cy = (gy + 0.5) / gridSize;
                    const distFromCenter = Math.sqrt((cx - 0.5) ** 2 + (cy - 0.45) ** 2);
                    anomaly *= (1 - distFromCenter * 0.6);
                    map[gy * gridSize + gx] = Math.min(1, Math.max(0, anomaly));
                }
            }
            return map;
        }
    };

    // Jet colormap: 0 → blue, 0.25 → cyan, 0.5 → green, 0.75 → yellow, 1 → red
    function jetColormap(v) {
        v = Math.max(0, Math.min(1, v));
        let r, g, b;
        if (v < 0.125) {
            r = 0; g = 0; b = 128 + v * 1024;
        } else if (v < 0.375) {
            r = 0; g = (v - 0.125) * 1024; b = 255;
        } else if (v < 0.625) {
            r = (v - 0.375) * 1024; g = 255; b = 255 - (v - 0.375) * 1024;
        } else if (v < 0.875) {
            r = 255; g = 255 - (v - 0.625) * 1024; b = 0;
        } else {
            r = 255 - (v - 0.875) * 1024; g = 0; b = 0;
        }
        return [Math.round(Math.max(0, Math.min(255, r))),
                Math.round(Math.max(0, Math.min(255, g))),
                Math.round(Math.max(0, Math.min(255, b)))];
    }

})();
