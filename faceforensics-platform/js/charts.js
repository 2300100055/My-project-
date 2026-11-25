/**
 * FaceForensics++ Enterprise Web Platform
 * Charts & Data Visualizations (Chart.js)
 */

window.ChartsManager = {
    manipulationChart: null,
    modelPerfChart: null,
    compressionChart: null,

    init() {
        this.initManipulationChart();
        this.initModelPerfChart();
        this.initCompressionChart();
    },

    initManipulationChart() {
        const canvas = document.getElementById('manipulationChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        this.manipulationChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Deepfakes', 'Face2Face', 'FaceSwap', 'NeuralTextures'],
                datasets: [{
                    data: [42, 24, 20, 14],
                    backgroundColor: ['#6366f1', '#a855f7', '#f43f5e', '#f59e0b'],
                    borderWidth: 2,
                    borderColor: '#111827',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1f2937',
                        titleColor: '#f3f4f6',
                        bodyColor: '#e5e7eb',
                        borderColor: '#374151',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.raw}% (${(context.raw * 384.12).toFixed(0)} detections)`;
                            }
                        }
                    }
                },
                cutout: '72%'
            }
        });
    },

    initModelPerfChart() {
        const canvas = document.getElementById('modelPerfChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        this.modelPerfChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['XceptionNet', 'EfficientNet-B4', 'CapsuleForensics', 'ResNet50', 'MesoInception-4'],
                datasets: [{
                    label: 'AUC Score (%)',
                    data: [99.3, 98.1, 97.8, 96.2, 94.1],
                    backgroundColor: [
                        '#6366f1', // Indigo (Primary)
                        '#818cf8',
                        '#a855f7',
                        '#3b82f6',
                        '#10b981'
                    ],
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1f2937',
                        titleColor: '#f3f4f6',
                        bodyColor: '#e5e7eb',
                        borderColor: '#374151',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                return ` AUC Performance: ${context.raw}% (c23 HQ)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: 90,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#9ca3af', font: { size: 11 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af', font: { size: 11 } }
                    }
                }
            }
        });
    },

    initCompressionChart() {
        const canvas = document.getElementById('compressionBenchmarkChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        this.compressionChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Raw (Uncompressed)', 'HQ (c23 - High Quality)', 'LQ (c40 - Low Quality)'],
                datasets: [
                    {
                        label: 'XceptionNet Model Accuracy',
                        data: [99.5, 98.4, 89.2],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 3,
                        pointBackgroundColor: '#6366f1',
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Human Baseline Accuracy',
                        data: [82.0, 71.5, 54.0],
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.08)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 3,
                        borderDash: [6, 6],
                        pointBackgroundColor: '#f43f5e',
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#d1d5db',
                            font: { size: 12, weight: '500' },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1f2937',
                        titleColor: '#f3f4f6',
                        bodyColor: '#e5e7eb',
                        borderColor: '#374151',
                        borderWidth: 1,
                        padding: 10
                    }
                },
                scales: {
                    y: {
                        min: 40,
                        max: 105,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 11 },
                            callback: function(value) { return value + '%'; }
                        }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.03)' },
                        ticks: { color: '#9ca3af', font: { size: 11 } }
                    }
                }
            }
        });
    },

    resize() {
        if (this.manipulationChart) this.manipulationChart.resize();
        if (this.modelPerfChart) this.modelPerfChart.resize();
        if (this.compressionChart) this.compressionChart.resize();
    }
};

window.addEventListener('DOMContentLoaded', () => {
    window.ChartsManager.init();
});
