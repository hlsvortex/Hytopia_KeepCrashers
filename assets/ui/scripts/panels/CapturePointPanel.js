import { BasePanel } from '../BasePanel.js';
import { formatTime } from '../utils/formatTime.js';

export default class CapturePointPanel extends BasePanel {
    constructor() {
        super('capture-point-container');
        this.init();
    }

    init() {
        
        // Create menu structure
        this.container.innerHTML = `
            <div class="capture-point-ui">
                <div class="timer-container">
                    <div class="team-timer red-timer" style="color: #f15b5b;">3:00</div>
                    <div class="control-info">
                        <div class="capture-progress-container">
                            <div id="capture-progress" class="capture-progress-bar"></div>
                        </div>
                        <div id="capture-team" class="capture-team">NEUTRAL</div>
                    </div>
                    <div class="team-timer blue-timer" style="color: #5f92f1;">3:00</div>
                </div>
                <div id="overtime" class="overtime-indicator">OVERTIME</div>
            </div>
            `;

        this.addEventListeners();
    }

    addEventListeners() {
        hytopia.onData(data => {
            if (data.type === 'matchStatsUpdate') {

                // Update team timers
                document.querySelector('.red-timer').textContent = formatTime(data.redTime);
                document.querySelector('.blue-timer').textContent = formatTime(data.blueTime);

                // Update overtime display
                const overtimeElement = document.getElementById('overtime');
                overtimeElement.style.display = data.overtime ? 'block' : 'none';

                // Update progress bar and team status
                const progressBar = document.getElementById('capture-progress');
                progressBar.style.width = data.capturePoint.progress + '%';
                progressBar.style.background = data.capturePoint.teamColor || '#666';

                const teamElement = document.getElementById('capture-team');
                teamElement.textContent = data.capturePoint.teamName || 'NEUTRAL';
                teamElement.style.color = data.capturePoint.teamColor || '#666';
            }
        });
    }
}