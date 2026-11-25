/**
 * FaceForensics++ Enterprise Web Platform
 * Batch Inference & API Audit Logs Controller
 */

const LogsManager = {
    logs: [
        {
            time: '09:24:10',
            event: 'POST /api/v2/detect - Batch job #9910 initiated (45 videos)',
            status: 'SUCCESS',
            statusClass: 'text-emerald-400',
            badgeBg: 'bg-emerald-500/10'
        },
        {
            time: '09:18:32',
            event: 'POST /api/v2/detect - Webhook batch #9909 completed in 1.42s (XceptionNet)',
            status: 'SUCCESS',
            statusClass: 'text-emerald-400',
            badgeBg: 'bg-emerald-500/10'
        },
        {
            time: '09:12:04',
            event: 'GPU TensorRT Engine warmed up on A100-80GB (Device 0)',
            status: 'READY',
            statusClass: 'text-indigo-400',
            badgeBg: 'bg-indigo-500/10'
        },
        {
            time: '08:50:18',
            event: 'POST /api/v2/detect - Single sample vid_7849_speech.mp4 (Fake: 99.2%)',
            status: 'FLAGGED',
            statusClass: 'text-rose-400',
            badgeBg: 'bg-rose-500/10'
        },
        {
            time: '08:44:02',
            event: 'POST /api/v2/detect - Single sample img_profile_auth_01.png (Real: 99.8%)',
            status: 'PASS',
            statusClass: 'text-emerald-400',
            badgeBg: 'bg-emerald-500/10'
        },
        {
            time: '08:30:00',
            event: 'Scheduled dataset benchmark evaluation completed (HQ partition c23)',
            status: 'PASS',
            statusClass: 'text-emerald-400',
            badgeBg: 'bg-emerald-500/10'
        }
    ],

    isLiveStreaming: false,
    streamInterval: null,

    init() {
        this.renderLogs();
    },

    renderLogs() {
        const container = document.getElementById('logs-container');
        if (!container) return;

        container.innerHTML = this.logs.map(log => `
            <div class="flex items-center justify-between py-2 border-b border-gray-800/40 hover:bg-dark-700/20 px-2 rounded transition">
                <div class="flex items-center space-x-3">
                    <span class="text-indigo-400 text-xs font-mono font-semibold">[2026-10-29 ${log.time}]</span>
                    <span class="text-gray-300 text-xs">${log.event}</span>
                </div>
                <span class="${log.statusClass} ${log.badgeBg} px-2 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider">${log.status}</span>
            </div>
        `).join('');
    },

    clearLogs() {
        this.logs = [];
        this.renderLogs();
        showNotification('Inference audit logs cleared.', 'info');
    },

    toggleLiveStream() {
        this.isLiveStreaming = !this.isLiveStreaming;
        const btn = document.getElementById('toggle-live-stream-btn');

        if (this.isLiveStreaming) {
            if (btn) {
                btn.className = "bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-2";
                btn.innerHTML = '<i class="fa-solid fa-stop text-[11px]"></i><span>Stop Live Stream</span>';
            }
            showNotification('Live log streaming enabled. Simulating incoming webhook scans.', 'info');

            this.streamInterval = setInterval(() => {
                this.addSimulatedLog();
            }, 4500);
        } else {
            if (btn) {
                btn.className = "bg-dark-700 hover:bg-dark-600 text-gray-200 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-700 transition flex items-center space-x-2";
                btn.innerHTML = '<i class="fa-solid fa-play text-[11px] text-emerald-400"></i><span>Simulate Live Feed</span>';
            }
            if (this.streamInterval) clearInterval(this.streamInterval);
            showNotification('Live log streaming paused.', 'info');
        }
    },

    addSimulatedLog() {
        const sampleIds = ['SEQ_789_011', 'SEQ_012_982', 'vid_stream_cam04', 'audit_token_verify', 'frame_extract_eval'];
        const methods = ['Deepfakes', 'Face2Face', 'FaceSwap', 'Pristine'];
        const chosenId = sampleIds[Math.floor(Math.random() * sampleIds.length)];
        const isFake = Math.random() > 0.4;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        const newLog = isFake ? {
            time: timeStr,
            event: `POST /api/v2/detect - Processed ${chosenId} (${(92 + Math.random() * 7).toFixed(1)}% Fake detected)`,
            status: 'FLAGGED',
            statusClass: 'text-rose-400',
            badgeBg: 'bg-rose-500/10'
        } : {
            time: timeStr,
            event: `POST /api/v2/detect - Processed ${chosenId} (Pristine verified, 0.04ms)`,
            status: 'SUCCESS',
            statusClass: 'text-emerald-400',
            badgeBg: 'bg-emerald-500/10'
        };

        this.logs.unshift(newLog);
        if (this.logs.length > 25) this.logs.pop();
        this.renderLogs();
    },

    exportLogs() {
        const textContent = this.logs.map(l => `[2026-10-29 ${l.time}] [${l.status}] ${l.event}`).join('\n');
        const blob = new Blob([textContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `faceforensics_audit_logs_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Audit log exported to text file.', 'success');
    }
};

window.LogsManager = LogsManager;
window.addEventListener('DOMContentLoaded', () => {
    LogsManager.init();
});
