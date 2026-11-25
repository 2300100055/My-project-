/**
 * FaceForensics++ Enterprise Web Platform
 * Kaggle Cloud Hub Integration Controller
 */

const KaggleManager = {
    connected: false,
    username: '',
    keyMasked: '',
    datasets: [],

    init() {
        this.checkStatus();
        this.fetchDatasets();
        this.setupJsonUpload();
    },

    async checkStatus() {
        try {
            const res = await fetch('/api/v2/kaggle/status');
            const data = await res.json();
            this.connected = data.connected;
            this.username = data.username || '';
            this.keyMasked = data.keyMasked || '';
            this.renderStatus();
        } catch (e) {
            console.error('Error checking Kaggle status', e);
        }
    },

    async fetchDatasets() {
        try {
            const res = await fetch('/api/v2/kaggle/datasets');
            this.datasets = await res.json();
            this.renderDatasets();
        } catch (e) {
            console.error('Error fetching Kaggle datasets', e);
        }
    },

    setupJsonUpload() {
        const fileInput = document.getElementById('kaggle-json-file');
        if (!fileInput) return;

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (parsed.username && parsed.key) {
                        document.getElementById('kaggle-username-input').value = parsed.username;
                        document.getElementById('kaggle-key-input').value = parsed.key;
                        showNotification('Parsed credentials from kaggle.json', 'success');
                    } else {
                        showNotification('Invalid kaggle.json format. Needs username and key.', 'warning');
                    }
                } catch (err) {
                    showNotification('Could not parse JSON file.', 'error');
                }
            };
            reader.readAsText(file);
        });
    },

    async connect() {
        const usernameInput = document.getElementById('kaggle-username-input');
        const keyInput = document.getElementById('kaggle-key-input');
        const username = usernameInput ? usernameInput.value.trim() : '';
        const key = keyInput ? keyInput.value.trim() : '';

        if (!username || !key) {
            showNotification('Please enter both Kaggle Username and API Key.', 'warning');
            return;
        }

        try {
            const res = await fetch('/api/v2/kaggle/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, key })
            });
            const data = await res.json();

            if (data.success) {
                this.connected = true;
                this.username = username;
                this.keyMasked = `${key.substring(0, 4)}••••••••`;
                this.renderStatus();
                showNotification(`Successfully connected to Kaggle as @${username}!`, 'success');
            } else {
                showNotification(data.error || 'Connection failed', 'error');
            }
        } catch (e) {
            showNotification('Error communicating with server', 'error');
        }
    },

    async disconnect() {
        try {
            await fetch('/api/v2/kaggle/disconnect', { method: 'POST' });
            this.connected = false;
            this.username = '';
            this.keyMasked = '';
            this.renderStatus();
            showNotification('Disconnected from Kaggle.', 'info');
        } catch (e) {
            showNotification('Error disconnecting Kaggle', 'error');
        }
    },

    renderStatus() {
        const statusBadge = document.getElementById('kaggle-status-badge');
        const headerBadge = document.getElementById('header-kaggle-badge');
        const accountInfoBox = document.getElementById('kaggle-account-info');
        const connectForm = document.getElementById('kaggle-connect-form');
        const connectedUserDisplay = document.getElementById('kaggle-connected-username');

        if (this.connected) {
            if (statusBadge) {
                statusBadge.className = "px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold flex items-center space-x-1.5";
                statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Connected to Kaggle API</span>';
            }
            if (headerBadge) {
                headerBadge.className = "flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs text-emerald-400 font-medium";
                headerBadge.innerHTML = `<i class="fa-brands fa-kaggle text-sm"></i><span>@${this.username}</span>`;
            }
            if (accountInfoBox) accountInfoBox.classList.remove('hidden');
            if (connectForm) connectForm.classList.add('hidden');
            if (connectedUserDisplay) connectedUserDisplay.innerText = `@${this.username}`;
        } else {
            if (statusBadge) {
                statusBadge.className = "px-3 py-1 bg-gray-700/60 text-gray-400 border border-gray-700 rounded-full text-xs font-semibold flex items-center space-x-1.5";
                statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-gray-500"></span><span>Disconnected</span>';
            }
            if (headerBadge) {
                headerBadge.className = "flex items-center space-x-1.5 bg-dark-700 hover:bg-dark-600 border border-gray-700 px-2.5 py-1 rounded-lg text-xs text-gray-300 font-medium cursor-pointer transition";
                headerBadge.innerHTML = `<i class="fa-brands fa-kaggle text-sm text-cyan-400"></i><span class="hidden sm:inline">Connect Kaggle</span>`;
                headerBadge.onclick = () => switchTab('kaggle');
            }
            if (accountInfoBox) accountInfoBox.classList.add('hidden');
            if (connectForm) connectForm.classList.remove('hidden');
        }
    },

    renderDatasets() {
        const container = document.getElementById('kaggle-datasets-container');
        if (!container) return;

        container.innerHTML = this.datasets.map(d => `
            <div class="bg-dark-900/60 border border-gray-800 rounded-xl p-4 flex flex-col justify-between hover:border-gray-700 transition">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[11px] font-mono font-semibold">${d.category}</span>
                        <span class="text-xs text-gray-400 font-mono"><i class="fa-solid fa-download mr-1 text-[10px]"></i>${d.downloads}</span>
                    </div>
                    <h4 class="text-sm font-bold text-white mb-1">${d.title}</h4>
                    <p class="text-xs text-gray-400 font-mono text-[11px] mb-2 text-cyan-400 break-all">${d.ref}</p>
                    <div class="flex flex-wrap gap-1 mb-3">
                        ${d.methods.map(m => `<span class="bg-dark-700 text-gray-300 px-1.5 py-0.5 rounded text-[10px]">${m}</span>`).join('')}
                    </div>
                </div>
                <div class="pt-2 border-t border-gray-800/60 flex items-center justify-between">
                    <span class="text-xs font-semibold text-gray-300 font-mono">${d.size}</span>
                    <button onclick="KaggleManager.syncDataset('${d.ref}')" class="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 shadow-md shadow-cyan-600/20">
                        <i class="fa-solid fa-cloud-arrow-down text-[11px]"></i>
                        <span>Sync via Kaggle</span>
                    </button>
                </div>
            </div>
        `).join('');
    },

    async syncDataset(datasetRef) {
        if (!this.connected) {
            showNotification('Please connect your Kaggle API key before syncing.', 'warning');
            return;
        }

        showNotification(`Syncing Kaggle dataset: ${datasetRef}...`, 'info');
        try {
            const res = await fetch('/api/v2/kaggle/pull', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ datasetRef })
            });
            const data = await res.json();
            if (data.success) {
                showNotification(`Kaggle dataset ${datasetRef} sync initiated!`, 'success');
            }
        } catch (e) {
            showNotification('Failed to sync dataset', 'error');
        }
    },

    copyCli(cmd) {
        navigator.clipboard.writeText(cmd).then(() => {
            showNotification('Kaggle CLI command copied to clipboard!', 'success');
        });
    },

    downloadKaggleNotebook() {
        const link = document.createElement('a');
        link.href = 'FaceForensics_Kaggle_GPU_Inference.ipynb';
        link.download = 'FaceForensics_Kaggle_GPU_Inference.ipynb';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Kaggle GPU Starter Notebook downloaded. Upload directly to kaggle.com/code!', 'success');
    }
};

window.KaggleManager = KaggleManager;
window.addEventListener('DOMContentLoaded', () => {
    KaggleManager.init();
});
