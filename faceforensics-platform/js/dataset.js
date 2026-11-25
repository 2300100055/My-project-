/**
 * FaceForensics++ Enterprise Web Platform
 * Dataset Explorer & Benchmark Controller
 */

const DatasetExplorer = {
    sequences: [
        {
            id: 'SEQ_001_004',
            source: 'YouTube #001 (Political Interview)',
            method: 'Deepfakes',
            compression: 'hq',
            compressionLabel: 'HQ (c23)',
            duration: '12.4s',
            frames: 310,
            bitrate: '5.2 Mbps',
            preview: 'assets/samples/ex_deepfakes.png',
            maskPreview: 'assets/samples/ex_deepfakes_mask.png',
            description: 'Facial identity swap using deep autoencoder architecture with 64x64 latent bottleneck representation.'
        },
        {
            id: 'SEQ_042_012',
            source: 'YouTube #042 (Live News Broadcast)',
            method: 'Face2Face',
            compression: 'lq',
            compressionLabel: 'LQ (c40)',
            duration: '8.2s',
            frames: 205,
            bitrate: '1.4 Mbps',
            preview: 'assets/samples/face2face.gif',
            maskPreview: 'assets/samples/ex_deepfakes_mask.png',
            description: 'Real-time facial reenactment modifying source expressions while preserving target actor appearance.'
        },
        {
            id: 'SEQ_109_003',
            source: 'YouTube #109 (Late Night Talkshow)',
            method: 'FaceSwap',
            compression: 'raw',
            compressionLabel: 'Raw',
            duration: '15.0s',
            frames: 375,
            bitrate: '45.0 Mbps',
            preview: 'assets/samples/faceswap.gif',
            maskPreview: 'assets/samples/ex_deepfakes_mask.png',
            description: 'Graphics-based facial replacement transferring face landmarks and applying Poisson image blending.'
        },
        {
            id: 'SEQ_230_088',
            source: 'YouTube #230 (Nature Documentary Host)',
            method: 'NeuralTextures',
            compression: 'hq',
            compressionLabel: 'HQ (c23)',
            duration: '10.1s',
            frames: 252,
            bitrate: '4.8 Mbps',
            preview: 'assets/samples/ex_neuraltextures.png',
            maskPreview: 'assets/samples/ex_neuraltextures_mask.png',
            description: 'Photorealistic neural texture rendering combined with a deferred neural rendering network pipeline.'
        },
        {
            id: 'SEQ_314_009',
            source: 'YouTube #314 (Tech Keynote Presentation)',
            method: 'Deepfakes',
            compression: 'raw',
            compressionLabel: 'Raw',
            duration: '18.6s',
            frames: 465,
            bitrate: '48.2 Mbps',
            preview: 'assets/samples/deepfakes.gif',
            maskPreview: 'assets/samples/ex_deepfakes_mask.png',
            description: 'High-definition uncompressed frame extraction showing minimal compression noise and clear edge artifacts.'
        },
        {
            id: 'SEQ_512_041',
            source: 'YouTube #512 (Cooking Studio Episode)',
            method: 'FaceShifter',
            compression: 'hq',
            compressionLabel: 'HQ (c23)',
            duration: '11.0s',
            frames: 275,
            bitrate: '5.1 Mbps',
            preview: 'assets/samples/faceshifter.gif',
            maskPreview: 'assets/samples/ex_deepfakes_mask.png',
            description: 'High-fidelity two-stage face swapping preserving target attributes via adaptive attentional blending (AAD).'
        },
        {
            id: 'SEQ_678_019',
            source: 'YouTube #678 (Academic Lecture Stream)',
            method: 'Face2Face',
            compression: 'hq',
            compressionLabel: 'HQ (c23)',
            duration: '14.3s',
            frames: 358,
            bitrate: '5.0 Mbps',
            preview: 'assets/samples/face2face.gif',
            maskPreview: 'assets/samples/ex_deepfakes_mask.png',
            description: 'Reenactment sequence tested against XceptionNet detecting spatial-temporal jitter in lip movement.'
        },
        {
            id: 'SEQ_890_002',
            source: 'YouTube #890 (Pristine Ground Truth Source)',
            method: 'Pristine (Authentic)',
            compression: 'raw',
            compressionLabel: 'Raw',
            duration: '20.0s',
            frames: 500,
            bitrate: '52.0 Mbps',
            preview: 'assets/samples/ex_original.png',
            maskPreview: 'assets/samples/ex_deepfakes_mask.png',
            description: 'Original unaltered YouTube video sequence utilized as pristine ground truth across benchmark evaluations.'
        }
    ],

    filteredSequences: [],

    init() {
        this.filteredSequences = [...this.sequences];
        this.renderTable();
        this.setupFilters();
    },

    setupFilters() {
        const searchInput = document.getElementById('dataset-search');
        const compressionSelect = document.getElementById('dataset-compression-filter');
        const methodSelect = document.getElementById('dataset-method-filter');

        const applyFilters = () => {
            const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
            const comp = compressionSelect ? compressionSelect.value : '';
            const method = methodSelect ? methodSelect.value : '';

            this.filteredSequences = this.sequences.filter(item => {
                const matchQuery = !query || 
                    item.id.toLowerCase().includes(query) || 
                    item.source.toLowerCase().includes(query) ||
                    item.method.toLowerCase().includes(query);

                const matchComp = !comp || item.compression === comp;
                const matchMethod = !method || item.method.toLowerCase().includes(method.toLowerCase());

                return matchQuery && matchComp && matchMethod;
            });

            this.renderTable();
        };

        if (searchInput) searchInput.addEventListener('input', applyFilters);
        if (compressionSelect) compressionSelect.addEventListener('change', applyFilters);
        if (methodSelect) methodSelect.addEventListener('change', applyFilters);
    },

    renderTable() {
        const tbody = document.getElementById('dataset-table-body');
        const countSpan = document.getElementById('dataset-count-display');
        if (!tbody) return;

        if (countSpan) {
            countSpan.innerHTML = `Showing <strong class="text-white">${this.filteredSequences.length}</strong> benchmark video pairs`;
        }

        if (this.filteredSequences.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-400">
                        <i class="fa-solid fa-filter-circle-xmark text-2xl mb-2 text-gray-600 block"></i>
                        No sequences match your selected filters.
                    </td>
                </tr>
            `;
            return;
        }

        const methodBadge = (method) => {
            switch (method.toLowerCase()) {
                case 'deepfakes':
                    return '<span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md text-xs font-semibold">Deepfakes</span>';
                case 'face2face':
                    return '<span class="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md text-xs font-semibold">Face2Face</span>';
                case 'faceswap':
                    return '<span class="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-xs font-semibold">FaceSwap</span>';
                case 'neuraltextures':
                    return '<span class="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-xs font-semibold">NeuralTextures</span>';
                case 'faceshifter':
                    return '<span class="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-md text-xs font-semibold">FaceShifter</span>';
                default:
                    return '<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-semibold">Authentic</span>';
            }
        };

        const compBadge = (comp, label) => {
            if (comp === 'raw') return `<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-mono font-medium">${label}</span>`;
            if (comp === 'hq') return `<span class="px-2 py-0.5 bg-brand-500/10 text-brand-400 rounded text-xs font-mono font-medium">${label}</span>`;
            return `<span class="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-mono font-medium">${label}</span>`;
        };

        tbody.innerHTML = this.filteredSequences.map(seq => `
            <tr class="hover:bg-dark-700/30 transition">
                <td class="py-3 px-4 font-semibold text-white font-mono">${seq.id}</td>
                <td class="py-3 px-4 text-gray-300">${seq.source}</td>
                <td class="py-3 px-4">${methodBadge(seq.method)}</td>
                <td class="py-3 px-4">${compBadge(seq.compression, seq.compressionLabel)}</td>
                <td class="py-3 px-4 text-gray-400 text-xs">${seq.duration} (${seq.frames} frames)</td>
                <td class="py-3 px-4 text-right">
                    <button onclick="DatasetExplorer.inspect('${seq.id}')" class="px-3 py-1 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-xs font-medium border border-gray-700 hover:border-gray-600 transition">Inspect</button>
                </td>
            </tr>
        `).join('');
    },

    inspect(seqId) {
        const seq = this.sequences.find(s => s.id === seqId);
        if (!seq) return;

        const titleEl = document.getElementById('inspector-title');
        const descEl = document.getElementById('inspector-desc');
        const sourceEl = document.getElementById('inspector-source');
        const methodEl = document.getElementById('inspector-method');
        const compEl = document.getElementById('inspector-comp');
        const framesEl = document.getElementById('inspector-frames');
        const bitrateEl = document.getElementById('inspector-bitrate');
        const previewEl = document.getElementById('inspector-preview-img');

        if (titleEl) titleEl.innerText = `Sequence Inspection: ${seq.id}`;
        if (descEl) descEl.innerText = seq.description;
        if (sourceEl) sourceEl.innerText = seq.source;
        if (methodEl) methodEl.innerText = seq.method;
        if (compEl) compEl.innerText = seq.compressionLabel;
        if (framesEl) framesEl.innerText = `${seq.frames} frames (${seq.duration})`;
        if (bitrateEl) bitrateEl.innerText = seq.bitrate;
        if (previewEl) previewEl.src = seq.preview;

        openModal('modal-inspector');
    },

    loadIntoWorkbenchFromInspector() {
        closeModal('modal-inspector');
        switchTab('workbench');
        showNotification('Sequence transferred to Forgery Workbench for inference.', 'info');
    },

    downloadCsv() {
        const headers = ["Sequence_ID", "YouTube_Source", "Manipulation_Method", "Compression_Tier", "Duration", "Frames", "Bitrate", "Description"];
        const rows = this.sequences.map(s => [
            s.id,
            `"${s.source}"`,
            `"${s.method}"`,
            `"${s.compressionLabel}"`,
            `"${s.duration}"`,
            s.frames,
            `"${s.bitrate}"`,
            `"${s.description}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "faceforensics_benchmark_sequences.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('FaceForensics++ benchmark CSV downloaded.', 'success');
    }
};

window.DatasetExplorer = DatasetExplorer;
window.addEventListener('DOMContentLoaded', () => {
    DatasetExplorer.init();
});
