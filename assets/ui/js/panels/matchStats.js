// Match Stats Panel Module
window.MatchStatsPanel = {
    initialize(containerId) {
        console.log('MatchStatsPanel: Starting initialization');
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('MatchStatsPanel: Container not found:', containerId);
            return null;
        }

        const element = this.createPanel();
        container.appendChild(element);
        this.setupEventHandlers();
        
        console.log('MatchStatsPanel: Successfully initialized');
        return element;
    },

    createPanel() {
        const element = document.createElement('div');
        element.className = 'panel match-stats-panel';
        element.style.cssText = `
            display: none;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 5px;
        `;
        element.innerHTML = `
            <div class="stats-panel" id="match-stats">
                <div class="teams-container">
                    <div class="team-list" id="red-team">
                        <h3>TEAM RED</h3>
                    </div>
                    <div class="team-list" id="blue-team">
                        <h3>TEAM BLUE</h3>
                    </div>
                </div>
            </div>
        `;
        return element;
    },

    setupEventHandlers() {
        hytopia.onData(data => {
            if (data.type === 'matchStatsUpdate') {
                this.updateStats(data);
            }
        });

        // Handle F key for showing/hiding stats
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                this.show();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                this.hide();
            }
        });
    },

    updateStats(data) {
        const redTeamList = document.getElementById('red-team');
        const blueTeamList = document.getElementById('blue-team');

        if (!redTeamList || !blueTeamList) return;

        // Clear existing lists
        redTeamList.innerHTML = '<h3>TEAM RED</h3>';
        blueTeamList.innerHTML = '<h3>TEAM BLUE</h3>';

        // Update team stats
        this.updateTeamList(redTeamList, data.teams.Red);
        this.updateTeamList(blueTeamList, data.teams.Blue);

        // Update capture point info
        this.updateCapturePoint(data.capturePoint);
    },

    updateTeamList(container, players) {
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-stats';
            playerElement.innerHTML = `
                <span class="player-name">${player.username}</span>
                <span class="player-kd">${player.kills}/${player.deaths}</span>
            `;
            container.appendChild(playerElement);
        });
    },

    updateCapturePoint(data) {
        const progressBar = document.getElementById('capture-progress');
        const teamDisplay = document.getElementById('capture-team');
        
        if (progressBar) {
            progressBar.style.width = `${data.progress * 100}%`;
            progressBar.style.backgroundColor = data.teamColor;
        }
        
        if (teamDisplay) {
            teamDisplay.textContent = data.teamName.toUpperCase();
            teamDisplay.style.color = data.teamColor;
        }
    },

    show() {
        const panel = document.querySelector('.match-stats-panel');
        if (panel) panel.style.display = 'block';
    },

    hide() {
        const panel = document.querySelector('.match-stats-panel');
        if (panel) panel.style.display = 'none';
    }
}; 