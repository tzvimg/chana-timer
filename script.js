class TimerClock {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.timeRanges = [];
        this.isDragging = false;
        this.startAngle = null;
        this.currentAngle = null;
        this.editingRange = null; // { index: number, point: 'start' | 'end' }

        // These will be set by updateCanvasSize()
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 0;

        this.init();
    }

    init() {
        this.updateCanvasSize();
        this.drawClock();
        this.setupEventListeners();
    }

    updateCanvasSize() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 60; // Account for padding
        const containerHeight = window.innerHeight - 200; // Leave space for header and controls

        // Use the smaller dimension to keep the clock circular and fully visible
        const maxSize = Math.min(containerWidth, containerHeight, 1000);
        const size = Math.max(300, maxSize); // Minimum size of 300px

        // Set canvas size
        this.canvas.width = size;
        this.canvas.height = size;

        // Update dynamic properties
        this.centerX = size / 2;
        this.centerY = size / 2;
        this.radius = (size * 0.88) / 2; // 88% of half the size
    }

    drawClock() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background circle
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fill();
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        // Draw selected time ranges
        this.drawTimeRanges();

        // Draw hour markers and labels
        this.drawHourMarkers();

        // Draw current selection if dragging
        if (this.isDragging && this.startAngle !== null && this.currentAngle !== null) {
            this.drawCurrentSelection();
        }

        // Draw center circle
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 15, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#667eea';
        this.ctx.fill();
    }

    drawHourMarkers() {
        // Draw quarter hour marks (every 15 minutes = 96 marks total)
        for (let quarter = 0; quarter < 96; quarter++) {
            const angle = (quarter * 3.75 - 90) * Math.PI / 180; // 3.75 degrees per 15 minutes
            const isHourMark = quarter % 4 === 0;
            const isHalfHourMark = !isHourMark && quarter % 2 === 0;

            // Determine mark length and style
            let innerRadius, outerRadius, lineWidth;
            if (isHourMark) {
                // Hour marks - longest
                innerRadius = this.radius - 20;
                outerRadius = this.radius - 5;
                const hour = quarter / 4;
                lineWidth = hour % 6 === 0 ? 4 : 2;
            } else if (isHalfHourMark) {
                // Half-hour marks - medium
                innerRadius = this.radius - 15;
                outerRadius = this.radius - 5;
                lineWidth = 2;
            } else {
                // Quarter-hour marks - shortest
                innerRadius = this.radius - 12;
                outerRadius = this.radius - 5;
                lineWidth = 1;
            }

            const x1 = this.centerX + innerRadius * Math.cos(angle);
            const y1 = this.centerY + innerRadius * Math.sin(angle);
            const x2 = this.centerX + outerRadius * Math.cos(angle);
            const y2 = this.centerY + outerRadius * Math.sin(angle);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = '#667eea';
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
        }

        // Draw hour labels
        for (let hour = 0; hour < 24; hour++) {
            const angle = (hour * 15 - 90) * Math.PI / 180;
            // Position labels inside the hour marks (hour marks go from radius-20 to radius-5)
            const labelRadius = this.radius - 35;
            const labelX = this.centerX + labelRadius * Math.cos(angle);
            const labelY = this.centerY + labelRadius * Math.sin(angle);

            // Scale font size based on canvas size
            const fontSize = Math.max(16, this.canvas.width / 28);
            this.ctx.font = `bold ${fontSize}px Arial`;
            this.ctx.fillStyle = '#333';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(hour.toString(), labelX, labelY);
        }
    }

    drawTimeRanges() {
        this.timeRanges.forEach((range, index) => {
            this.drawTimeRange(range.start, range.end, false);
            this.drawEndpointHandles(range.start, range.end);
        });
    }

    drawEndpointHandles(startHour, endHour) {
        const startAngle = (startHour * 15 - 90) * Math.PI / 180;
        const endAngle = (endHour * 15 - 90) * Math.PI / 180;
        const handleRadius = (this.radius - 30 + 60) / 2; // Middle of the range band

        // Scale handle size based on canvas size
        const handleSize = Math.max(8, this.canvas.width / 80);
        const strokeWidth = Math.max(2, this.canvas.width / 300);

        // Draw start handle
        const startX = this.centerX + handleRadius * Math.cos(startAngle);
        const startY = this.centerY + handleRadius * Math.sin(startAngle);
        this.ctx.beginPath();
        this.ctx.arc(startX, startY, handleSize, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#667eea';
        this.ctx.fill();
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = strokeWidth;
        this.ctx.stroke();

        // Draw end handle
        const endX = this.centerX + handleRadius * Math.cos(endAngle);
        const endY = this.centerY + handleRadius * Math.sin(endAngle);
        this.ctx.beginPath();
        this.ctx.arc(endX, endY, handleSize, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#667eea';
        this.ctx.fill();
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = strokeWidth;
        this.ctx.stroke();
    }

    drawTimeRange(startHour, endHour, isTemporary = false) {
        const startAngle = (startHour * 15 - 90) * Math.PI / 180;
        let endAngle = (endHour * 15 - 90) * Math.PI / 180;

        // Handle wrapping around midnight
        if (endAngle <= startAngle) {
            endAngle += 2 * Math.PI;
        }

        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius - 30, startAngle, endAngle);
        this.ctx.arc(this.centerX, this.centerY, 60, endAngle, startAngle, true);
        this.ctx.closePath();

        if (isTemporary) {
            this.ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
        } else {
            this.ctx.fillStyle = 'rgba(102, 126, 234, 0.6)';
        }
        this.ctx.fill();
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    drawCurrentSelection() {
        if (this.editingRange) {
            // When editing, the range is already updated in timeRanges
            // Just need to redraw, which happens in drawClock
            return;
        } else {
            // Creating a new range
            const startHour = this.angleToHour(this.startAngle);
            const endHour = this.angleToHour(this.currentAngle);
            this.drawTimeRange(startHour, endHour, true);
        }
    }

    angleToHour(angle) {
        // Convert angle to hour (0-23.99)
        let hour = ((angle + 90) * 24 / 360) % 24;
        if (hour < 0) hour += 24;
        return this.snapToQuarterHour(hour);
    }

    snapToQuarterHour(hour) {
        // Snap to nearest 15-minute interval (0.25 hour)
        return Math.round(hour * 4) / 4;
    }

    getMouseAngle(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX - this.centerX;
        const y = (event.clientY - rect.top) * scaleY - this.centerY;
        return Math.atan2(y, x) * 180 / Math.PI;
    }

    findNearestEndpoint(angle) {
        const clickedHour = this.angleToHour(angle);
        // Scale threshold based on screen size - larger on smaller screens for easier touch interaction
        const threshold = this.canvas.width < 500 ? 0.75 : 0.5; // 45 or 30 minutes tolerance

        for (let i = 0; i < this.timeRanges.length; i++) {
            const range = this.timeRanges[i];

            // Check start point
            const startDiff = Math.abs(clickedHour - range.start);
            if (startDiff < threshold || Math.abs(startDiff - 24) < threshold) {
                return { index: i, point: 'start' };
            }

            // Check end point
            const endDiff = Math.abs(clickedHour - range.end);
            if (endDiff < threshold || Math.abs(endDiff - 24) < threshold) {
                return { index: i, point: 'end' };
            }
        }

        return null;
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));

        // Touch support for mobile/tablet
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseDown(touch);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMouseMove(touch);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleMouseUp(e);
        });

        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateCanvasSize();
                this.drawClock();
            }, 250);
        });
    }

    handleMouseDown(event) {
        const clickAngle = this.getMouseAngle(event);
        const nearestEndpoint = this.findNearestEndpoint(clickAngle);

        if (nearestEndpoint) {
            // Edit existing range
            this.editingRange = nearestEndpoint;
            this.isDragging = true;
            this.currentAngle = clickAngle;
        } else {
            // Create new range
            this.isDragging = true;
            this.startAngle = clickAngle;
            this.currentAngle = clickAngle;
            this.editingRange = null;
        }
    }

    handleMouseMove(event) {
        if (this.isDragging) {
            this.currentAngle = this.getMouseAngle(event);

            // If editing, update the range in real-time
            if (this.editingRange) {
                const newHour = this.angleToHour(this.currentAngle);
                const range = this.timeRanges[this.editingRange.index];

                if (this.editingRange.point === 'start') {
                    range.start = newHour;
                } else {
                    range.end = newHour;
                }
            }

            this.drawClock();
        }
    }

    handleMouseUp(event) {
        if (this.isDragging) {
            if (this.editingRange) {
                // Finished editing an existing range
                const range = this.timeRanges[this.editingRange.index];

                // Validate the range
                const diff = Math.abs(range.end - range.start);
                if (diff < 0.5 || diff > 23.5) {
                    // Invalid range, remove it
                    this.timeRanges.splice(this.editingRange.index, 1);
                }

                this.updateTimeRangesList();
            } else if (this.startAngle !== null && this.currentAngle !== null) {
                // Creating a new range
                const startHour = this.angleToHour(this.startAngle);
                const endHour = this.angleToHour(this.currentAngle);

                // Only add if there's a meaningful range (at least 0.5 hour difference)
                const diff = Math.abs(endHour - startHour);
                if (diff > 0.5 && diff < 23.5) {
                    this.addTimeRange(startHour, endHour);
                }
            }
        }

        this.isDragging = false;
        this.startAngle = null;
        this.currentAngle = null;
        this.editingRange = null;
        this.drawClock();
    }

    addTimeRange(start, end) {
        // Times are already snapped in angleToHour method
        this.timeRanges.push({
            start: start,
            end: end
        });

        this.drawClock();
        this.updateTimeRangesList();
    }

    removeTimeRange(index) {
        this.timeRanges.splice(index, 1);
        this.drawClock();
        this.updateTimeRangesList();
    }

    clearAllRanges() {
        this.timeRanges = [];
        this.drawClock();
        this.updateTimeRangesList();
    }

    hourToTimeString(hour) {
        const h = Math.floor(hour);
        const m = Math.round((hour - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    updateTimeRangesList() {
        const listElement = document.getElementById('timeRangesList');

        if (this.timeRanges.length === 0) {
            listElement.innerHTML = '<p class="empty-state">No time ranges selected yet</p>';
            return;
        }

        listElement.innerHTML = this.timeRanges.map((range, index) => `
            <div class="time-range-item" id="range-${index}">
                <div class="time-display" id="display-${index}">
                    <span>${this.hourToTimeString(range.start)} - ${this.hourToTimeString(range.end)}</span>
                    <div class="button-group">
                        <button class="edit-range" onclick="clock.startEditingRange(${index})">Edit</button>
                        <button class="remove-range" onclick="clock.removeTimeRange(${index})">Remove</button>
                    </div>
                </div>
                <div class="time-edit" id="edit-${index}" style="display: none;">
                    <div class="time-inputs">
                        <input type="time" id="start-${index}" value="${this.hourToTimeString(range.start)}" />
                        <span>-</span>
                        <input type="time" id="end-${index}" value="${this.hourToTimeString(range.end)}" />
                    </div>
                    <div class="button-group">
                        <button class="save-range" onclick="clock.saveEditedRange(${index})">Save</button>
                        <button class="cancel-edit" onclick="clock.cancelEditingRange(${index})">Cancel</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    startEditingRange(index) {
        document.getElementById(`display-${index}`).style.display = 'none';
        document.getElementById(`edit-${index}`).style.display = 'flex';
    }

    cancelEditingRange(index) {
        document.getElementById(`display-${index}`).style.display = 'flex';
        document.getElementById(`edit-${index}`).style.display = 'none';
    }

    saveEditedRange(index) {
        const startInput = document.getElementById(`start-${index}`).value;
        const endInput = document.getElementById(`end-${index}`).value;

        // Convert time strings (HH:MM) to hour decimals
        const startParts = startInput.split(':');
        const endParts = endInput.split(':');

        const startHour = parseInt(startParts[0]) + parseInt(startParts[1]) / 60;
        const endHour = parseInt(endParts[0]) + parseInt(endParts[1]) / 60;

        // Validate the range
        const diff = Math.abs(endHour - startHour);
        if (diff < 0.25 || diff > 23.75) {
            alert('Please enter a valid time range (at least 15 minutes and less than 24 hours)');
            return;
        }

        // Update the time range
        this.timeRanges[index].start = startHour;
        this.timeRanges[index].end = endHour;

        // Redraw and update
        this.drawClock();
        this.updateTimeRangesList();
    }

    downloadImage() {
        const tempCanvas = this.generateClockImage();

        // Download the image
        const link = document.createElement('a');
        link.download = `timer-schedule-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    }

    generateClockImage() {
        // Create a temporary canvas for the final image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1000;
        tempCanvas.height = 1100;
        const tempCtx = tempCanvas.getContext('2d');

        // Background
        tempCtx.fillStyle = 'white';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Title
        tempCtx.font = 'bold 36px Arial';
        tempCtx.fillStyle = '#667eea';
        tempCtx.textAlign = 'center';
        tempCtx.fillText('Maalit Shabat', tempCanvas.width / 2, 50);

        // Save the current canvas state and draw it centered
        const clockSize = 750;
        const offsetX = (tempCanvas.width - clockSize) / 2;
        const offsetY = 100;

        // Scale and draw the clock
        const scale = clockSize / this.canvas.width;
        tempCtx.save();
        tempCtx.translate(offsetX, offsetY);
        tempCtx.scale(scale, scale);
        tempCtx.drawImage(this.canvas, 0, 0);
        tempCtx.restore();

        // Add time ranges text at the bottom
        if (this.timeRanges.length > 0) {
            tempCtx.font = 'bold 24px Arial';
            tempCtx.fillStyle = '#333';
            tempCtx.textAlign = 'center';
            tempCtx.fillText('Selected Time Ranges:', tempCanvas.width / 2, 950);

            tempCtx.font = '20px Arial';
            let yPos = 990;
            this.timeRanges.forEach((range, index) => {
                const text = `${this.hourToTimeString(range.start)} - ${this.hourToTimeString(range.end)}`;
                tempCtx.fillText(text, tempCanvas.width / 2, yPos);
                yPos += 30;
            });
        }

        return tempCanvas;
    }

    async shareWhatsApp() {
        if (this.timeRanges.length === 0) {
            alert('Please select some time ranges first!');
            return;
        }

        // Generate the clock image
        const imageCanvas = this.generateClockImage();

        // Convert canvas to blob
        imageCanvas.toBlob(async (blob) => {
            const file = new File([blob], `timer-schedule-${Date.now()}.png`, { type: 'image/png' });

            // Use Web Share API (works on mobile phones only)
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file]
                    });
                } catch (err) {
                    // User cancelled or error occurred
                    console.log('Share cancelled or failed:', err);
                }
            } else {
                // Web Share API not available - only works on phones
                alert('WhatsApp sharing is only available on mobile phones. Please use a mobile device.');
            }
        }, 'image/png');
    }
}

// Initialize the clock
let clock;

document.addEventListener('DOMContentLoaded', () => {
    clock = new TimerClock('clockCanvas');

    // Setup button listeners
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all time ranges?')) {
            clock.clearAllRanges();
        }
    });

    document.getElementById('downloadBtn').addEventListener('click', () => {
        clock.downloadImage();
    });

    document.getElementById('whatsappBtn').addEventListener('click', () => {
        clock.shareWhatsApp();
    });
});
