// Utility Functions for SkillShare

// Notification System
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Format Date
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format Time
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format Duration
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
}

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Generate Unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Truncate Text
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Get Initials
function getInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
}

// File to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Validate Email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate Password
function validatePassword(password) {
    const result = {
        isValid: true,
        errors: []
    };

    if (password.length < 8) {
        result.isValid = false;
        result.errors.push('Password must be at least 8 characters');
    }
    if (!/\d/.test(password)) {
        result.isValid = false;
        result.errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        result.isValid = false;
        result.errors.push('Password must contain at least one special character');
    }

    return result;
}

// Calculate Progress Percentage
function calculateProgress(current, total) {
    if (!total || total === 0) return 0;
    return Math.round((current / total) * 100);
}

// Render Star Rating
function renderStars(rating, interactive = false, size = 'normal') {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    const sizeClass = size === 'small' ? 'star-small' : '';
    
    let html = '<div class="stars ' + sizeClass + '">';
    
    for (let i = 0; i < fullStars; i++) {
        html += `<span class="star filled" ${interactive ? `data-value="${i+1}"` : ''}>&#9733;</span>`;
    }
    
    if (hasHalf) {
        html += `<span class="star half" ${interactive ? `data-value="${fullStars + 1}"` : ''}>&#9733;</span>`;
    }
    
    for (let i = 0; i < emptyStars; i++) {
        const value = fullStars + (hasHalf ? 1 : 0) + i + 1;
        html += `<span class="star empty" ${interactive ? `data-value="${value}"` : ''}>&#9734;</span>`;
    }
    
    html += '</div>';
    return html;
}

// Local Storage Helpers
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage clear error:', e);
            return false;
        }
    }
};

// Scroll to element
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

function scrollToFeatures() {
    scrollToElement('features');
}

// Create Loading Spinner
function createSpinner() {
    return '<div class="loading"><div class="spinner"></div></div>';
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Category Icons Mapping
const categoryIcons = {
    'programming': '💻',
    'design': '🎨',
    'business': '💼',
    'marketing': '📢',
    'photography': '📷',
    'music': '🎵',
    'language': '🌍',
    'science': '🔬',
    'math': '📐',
    'health': '🏥',
    'lifestyle': '🌟',
    'other': '📚'
};

function getCategoryIcon(category) {
    return categoryIcons[category?.toLowerCase()] || '📚';
}

// Simple Chart Drawing (for offline use - no Chart.js dependency)
class SimpleChart {
    constructor(canvas, type = 'bar') {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.type = type;
        this.data = [];
        this.labels = [];
        this.colors = [
            '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', 
            '#6d28d9', '#5b21b6', '#4c1d95', '#ddd6fe'
        ];
    }

    setData(labels, data) {
        this.labels = labels;
        this.data = data;
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (this.type === 'bar') {
            this.drawBarChart();
        } else if (this.type === 'pie') {
            this.drawPieChart();
        } else if (this.type === 'line') {
            this.drawLineChart();
        }
    }

    drawBarChart() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 40;
        const barWidth = (width - padding * 2) / this.data.length - 10;
        const maxValue = Math.max(...this.data) || 1;
        
        ctx.fillStyle = '#0f0a1a';
        ctx.fillRect(0, 0, width, height);
        
        this.data.forEach((value, i) => {
            const barHeight = (value / maxValue) * (height - padding * 2);
            const x = padding + i * (barWidth + 10);
            const y = height - padding - barHeight;
            
            ctx.fillStyle = this.colors[i % this.colors.length];
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = '#f1f5f9';
            ctx.font = '12px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText(this.labels[i] || '', x + barWidth / 2, height - 10);
            ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
        });
    }

    drawPieChart() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 40;
        const total = this.data.reduce((a, b) => a + b, 0) || 1;
        
        ctx.fillStyle = '#0f0a1a';
        ctx.fillRect(0, 0, width, height);
        
        let startAngle = -Math.PI / 2;
        
        this.data.forEach((value, i) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            
            ctx.fillStyle = this.colors[i % this.colors.length];
            ctx.fill();
            
            const midAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(midAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(midAngle) * (radius * 0.7);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Segoe UI';
            ctx.textAlign = 'center';
            if (value > 0) {
                const percentage = Math.round((value / total) * 100);
                ctx.fillText(`${percentage}%`, labelX, labelY);
            }
            
            startAngle += sliceAngle;
        });
        
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '11px Segoe UI';
        ctx.textAlign = 'left';
        this.labels.forEach((label, i) => {
            const y = 20 + i * 18;
            ctx.fillStyle = this.colors[i % this.colors.length];
            ctx.fillRect(10, y - 10, 12, 12);
            ctx.fillStyle = '#f1f5f9';
            ctx.fillText(label, 28, y);
        });
    }

    drawLineChart() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 50;
        const maxValue = Math.max(...this.data) || 1;
        const pointSpacing = (width - padding * 2) / (this.data.length - 1 || 1);
        
        ctx.fillStyle = '#0f0a1a';
        ctx.fillRect(0, 0, width, height);
        
        ctx.strokeStyle = '#3b2d4d';
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        this.data.forEach((value, i) => {
            const x = padding + i * pointSpacing;
            const y = height - padding - (value / maxValue) * (height - padding * 2);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        ctx.fillStyle = '#a78bfa';
        this.data.forEach((value, i) => {
            const x = padding + i * pointSpacing;
            const y = height - padding - (value / maxValue) * (height - padding * 2);
            
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '10px Segoe UI';
        ctx.textAlign = 'center';
        this.labels.forEach((label, i) => {
            const x = padding + i * pointSpacing;
            ctx.fillText(label, x, height - 15);
        });
    }
}

// Progress Heatmap for video playback
class ProgressHeatmap {
    constructor(container, segments = 20) {
        this.container = container;
        this.segments = segments;
        this.data = new Array(segments).fill(0);
    }

    update(progressData) {
        this.data = progressData;
        this.render();
    }

    render() {
        const max = Math.max(...this.data) || 1;
        
        let html = '<div class="heatmap">';
        this.data.forEach((value, i) => {
            const intensity = value / max;
            const color = this.getColor(intensity);
            const percentage = Math.round(intensity * 100);
            html += `<div class="heatmap-segment" style="background:${color}" title="${percentage}% watched"></div>`;
        });
        html += '</div>';
        
        this.container.innerHTML = html;
    }

    getColor(intensity) {
        const r = Math.round(139 * intensity);
        const g = Math.round(92 * intensity);
        const b = Math.round(246 * intensity);
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// Utility classes for compatibility
class Utils {
    static formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    static formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    static debounce(func, wait) {
        return debounce(func, wait);
    }

    static generateId() {
        return generateId();
    }

    static validateFile(file, allowedTypes, maxSize) {
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }
        if (file.size > maxSize) {
            throw new Error(`File size too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
        }
        return true;
    }
}

class StorageManager {
    static get(key, defaultValue = null) {
        return storage.get(key, defaultValue);
    }

    static set(key, value) {
        return storage.set(key, value);
    }

    static remove(key) {
        return storage.remove(key);
    }
}

// Export utilities
window.utils = {
    showNotification,
    formatDate,
    formatTime,
    formatDuration,
    debounce,
    generateId,
    escapeHtml,
    truncateText,
    getInitials,
    fileToBase64,
    isValidEmail,
    validatePassword,
    calculateProgress,
    renderStars,
    storage,
    scrollToElement,
    scrollToFeatures,
    createSpinner,
    formatFileSize,
    getCategoryIcon,
    SimpleChart,
    ProgressHeatmap
};
