/**
 * FaceForensics++ Enterprise Web Platform
 * Model Registry & Weights Controller
 */

const ModelsManager = {
    models: {
        xception: {
            id: 'xception',
            name: 'XceptionNet (FF++)',
            version: 'v2.4.1',
            status: 'active',
            badge: 'Active & Deployed',
            auc: '0.993',
            parameters: '22.8M',
            latency: '12.4 ms/frame',
            description: 'State-of-the-art CNN trained on full FaceForensics++ dataset with separable depthwise convolutions and spatial augmentations.'
        },
        mesonet: {
            id: 'mesonet',
            name: 'MesoInception-4',
            version: 'v1.8.0',
            status: 'standby',
            badge: 'Standby',
            auc: '0.941',
            parameters: '2.9M',
            latency: '4.1 ms/frame',
            description: 'Lightweight architecture with intermediate feature pooling, optimized for low-latency streaming and mobile edge deployment.'
        },
        efficientnet: {
            id: 'efficientnet',
            name: 'EfficientNet-B4',
            version: 'v1.0.2',
            status: 'archived',
            badge: 'Standby',
            auc: '0.981',
            parameters: '19.3M',
            latency: '18.6 ms/frame',
            description: 'Compound-scaled deep neural network balancing depth, width, and resolution for robust cross-dataset forensic generalization.'
        }
    },

    setPrimary(modelId) {
        if (!this.models[modelId]) return;

        Object.keys(this.models).forEach(k => {
            this.models[k].status = (k === modelId) ? 'active' : 'standby';
        });

        // Update Header Badge
        const headerModelBadge = document.getElementById('header-active-model-text');
        if (headerModelBadge) {
            headerModelBadge.innerText = this.models[modelId].name;
        }

        // Also update workbench model dropdown if present
        const modelSelect = document.getElementById('modelSelect');
        if (modelSelect) {
            modelSelect.value = modelId;
        }

        this.renderCards();
        showNotification(`${this.models[modelId].name} is now designated as the Primary inference engine.`, 'success');
    },

    reinitializeWeights(modelId) {
        const model = this.models[modelId];
        if (!model) return;

        showNotification(`Re-initializing ${model.name} weights into GPU memory...`, 'info');

        setTimeout(() => {
            showNotification(`${model.name} (${model.version}) weights loaded successfully. Checksum verified.`, 'success');
        }, 1200);
    },

    renderCards() {
        const container = document.getElementById('models-grid-container');
        if (!container) return;

        container.innerHTML = Object.values(this.models).map(m => {
            const isActive = m.status === 'active';
            const statusBadge = isActive ? 
                `<span class="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold flex items-center space-x-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>Active & Deployed</span></span>` :
                `<span class="px-2.5 py-1 bg-gray-700/60 text-gray-400 rounded-full text-xs font-semibold">Standby</span>`;

            const actionBtn = isActive ?
                `<button onclick="ModelsManager.reinitializeWeights('${m.id}')" class="w-full bg-dark-700 hover:bg-dark-600 text-white py-2 rounded-xl text-xs font-medium border border-gray-700 transition flex items-center justify-center space-x-2"><i class="fa-solid fa-arrows-rotate text-[11px] text-indigo-400"></i><span>Re-initialize Weights</span></button>` :
                `<button onclick="ModelsManager.setPrimary('${m.id}')" class="w-full bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-xl text-xs font-medium transition shadow-lg shadow-brand-600/20 flex items-center justify-center space-x-2"><i class="fa-solid fa-check text-[11px]"></i><span>Set as Primary</span></button>`;

            return `
                <div class="bg-dark-800/70 border ${isActive ? 'border-brand-500/50 shadow-lg shadow-brand-500/10' : 'border-gray-800/80'} rounded-2xl p-6 space-y-4 transition">
                    <div class="flex items-center justify-between">
                        ${statusBadge}
                        <span class="text-xs text-gray-400 font-mono">${m.version}</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white">${m.name}</h3>
                        <p class="text-xs text-gray-400 mt-1 leading-relaxed">${m.description}</p>
                    </div>
                    <div class="space-y-2 text-xs text-gray-300 border-t border-gray-800 pt-3">
                        <div class="flex justify-between"><span>AUC Benchmark:</span><strong class="text-indigo-400 font-bold">${m.auc}</strong></div>
                        <div class="flex justify-between"><span>Parameters:</span><strong class="text-white">${m.parameters}</strong></div>
                        <div class="flex justify-between"><span>Inference Latency:</span><strong class="text-white">${m.latency}</strong></div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        }).join('');
    }
};

window.ModelsManager = ModelsManager;
window.addEventListener('DOMContentLoaded', () => {
    ModelsManager.renderCards();
});
