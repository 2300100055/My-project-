/**
 * FaceForensics++ Enterprise Web Platform
 * Core Application Controller & State Manager
 */

// Application State
const AppState = {
    currentTab: 'dashboard',
    activeModel: 'xception',
    availableModels: {
        xception: { name: 'XceptionNet (FF++)', auc: '0.993', latency: '12.4 ms', status: 'Primary' },
        mesonet: { name: 'MesoInception-4', auc: '0.941', latency: '4.1 ms', status: 'Standby' },
        efficientnet: { name: 'EfficientNet-B4', auc: '0.981', latency: '18.6 ms', status: 'Standby' }
    },
    gpuStats: {
        load: 42,
        vramUsed: '33.6 / 80 GB',
        device: 'NVIDIA A100 Tensor Core (x8)'
    }
};

/**
 * Tab Navigation Switcher
 * @param {string} tabId - Target tab identifier
 */
function switchTab(tabId) {
    const tabs = ['dashboard', 'workbench', 'explorer', 'models', 'logs', 'kaggle'];
    if (!tabs.includes(tabId)) tabId = 'dashboard';

    AppState.currentTab = tabId;

    tabs.forEach(t => {
        const section = document.getElementById(`tab-${t}`);
        const navBtn = document.getElementById(`nav-${t}`);
        
        if (section) {
            if (t === tabId) {
                section.classList.remove('hidden');
                if (navBtn) {
                    navBtn.className = "w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition bg-brand-600 text-white shadow-lg shadow-brand-600/20";
                }
            } else {
                section.classList.add('hidden');
                if (navBtn) {
                    navBtn.className = "w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-dark-700/60 transition";
                }
            }
        }
    });

    // Update URL hash without reload
    history.replaceState(null, null, `#${tabId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger Chart Resize if switching to dashboard or explorer
    if (tabId === 'dashboard' && window.ChartsManager) {
        window.ChartsManager.resize();
    } else if (tabId === 'explorer' && window.ChartsManager) {
        window.ChartsManager.resize();
    }
}

/**
 * Toast Notification System
 * @param {string} message - Notification text
 * @param {'success'|'warning'|'error'|'info'} type - Notification style
 */
let toastTimeout = null;
function showNotification(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    
    if (!toast || !toastMsg || !toastIcon) return;

    if (toastTimeout) clearTimeout(toastTimeout);

    toastMsg.innerText = message;
    
    if (type === 'success') {
        toastIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        toastIcon.className = 'text-emerald-400 text-lg';
    } else if (type === 'warning') {
        toastIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        toastIcon.className = 'text-rose-400 text-lg';
    } else if (type === 'error') {
        toastIcon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
        toastIcon.className = 'text-rose-500 text-lg';
    } else {
        toastIcon.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
        toastIcon.className = 'text-indigo-400 text-lg';
    }

    toast.classList.remove('translate-y-24', 'opacity-0');
    toastTimeout = setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
    }, 3500);
}

/**
 * Modal Management Utilities
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}

/**
 * API Key Generation & Management
 */
function generateApiKey() {
    const prefixes = ['ff_live_', 'ff_sec_', 'ff_audit_'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newKey = `${prefix}${randomHex}`;
    
    const keyInput = document.getElementById('api-key-display');
    if (keyInput) {
        keyInput.value = newKey;
    }
    showNotification('New Enterprise API key generated.', 'success');
}

function copyApiKey() {
    const keyInput = document.getElementById('api-key-display');
    if (keyInput && keyInput.value) {
        navigator.clipboard.writeText(keyInput.value).then(() => {
            showNotification('API key copied to clipboard!', 'success');
        }).catch(() => {
            keyInput.select();
            document.execCommand('copy');
            showNotification('API key copied to clipboard!', 'success');
        });
    }
}

/**
 * Export Analytics Report (Simulated Download)
 */
function exportAnalyticsReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `faceforensics_report_${timestamp}.json`;
    const reportData = {
        platform: "FaceForensics++ Enterprise AI Engine v4.2",
        exportedAt: new Date().toISOString(),
        summary: {
            totalMediaAnalyzed: 142890,
            overallAccuracy: "98.4%",
            deepfakesIdentified: 38412,
            averageLatencyMs: 12.4
        },
        activeModels: [
            { name: "XceptionNet", auc: 0.993, role: "Primary spatial detector" },
            { name: "MesoInception-4", auc: 0.941, role: "Real-time edge detector" },
            { name: "EfficientNet-B4", auc: 0.981, role: "Robustness ensemble" }
        ],
        benchmarkTiers: {
            raw: { accuracy: "99.5%", humanBaseline: "82.0%" },
            c23_hq: { accuracy: "98.4%", humanBaseline: "71.5%" },
            c40_lq: { accuracy: "89.2%", humanBaseline: "54.0%" }
        }
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Forensic analytics report exported.', 'success');
}

// Initial Bootstrapping
window.addEventListener('DOMContentLoaded', () => {
    // Check URL hash for initial tab
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'workbench', 'explorer', 'models', 'logs', 'kaggle'].includes(hash)) {
        switchTab(hash);
    }

    // Keyboard shortcut Escape to close modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-window:not(.hidden)').forEach(modal => {
                modal.classList.add('hidden');
            });
            document.body.classList.remove('overflow-hidden');
        }
    });
});
