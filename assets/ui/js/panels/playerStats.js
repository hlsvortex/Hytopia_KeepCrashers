// Player Stats Panel Module
console.log('Loading PlayerStatsPanel...');
window.PlayerStatsPanel = {
    initialize(containerId) {
        console.log('PlayerStatsPanel: Starting initialization');
        const container = document.getElementById(containerId);
        console.log('Found container:', container);
        if (!container) {
            console.error('PlayerStatsPanel: Container not found:', containerId);
            return null;
        }

        const element = this.createPanel();
        container.appendChild(element);
        this.setupEventHandlers();
        
        console.log('PlayerStatsPanel: Successfully initialized');
        return element;
    },

    createPanel() {
        console.log('PlayerStatsPanel: Creating panel element');
        const element = document.createElement('div');
        element.className = 'panel stats-panel';
        element.style.cssText = `
            display: block;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 5px;
        `;
        element.innerHTML = `
            <div class="panel-header">Player Stats</div>
            <div class="panel-content">
                <div>Health:
                    <div class="stat-bar">
                        <div id="health-fill" class="stat-fill health-fill"></div>
                    </div>
                    <span class="stat-value" id="health-value">100</span>
                </div>
                <div>Stamina:
                    <div class="stat-bar">
                        <div id="stamina-fill" class="stat-fill stamina-fill"></div>
                    </div>
                    <span class="stat-value" id="stamina-value">100</span>
                </div>
                <div>Mana:
                    <div class="stat-bar">
                        <div id="mana-fill" class="stat-fill mana-fill"></div>
                    </div>
                    <span class="stat-value" id="mana-value">100</span>
                </div>
                <div class="abilities">
                    <h3>Abilities</h3>
                    <div class="ability" id="ability1">
                        Ability 1: <span class="cooldown" id="cooldown1">Ready</span>
                    </div>
                    <div class="ability" id="ability2">
                        Ability 2: <span class="cooldown" id="cooldown2">Ready</span>
                    </div>
                </div>
            </div>
        `;
        return element;
    },

    setupEventHandlers() {
        // Handle stats updates
        hytopia.onData(data => {
            if (data.type === 'statsUpdate') {
                this.updateStats(data);
            }
            else if (data.type === 'abilityUpdate') {
                this.updateAbility(data);
            }
        });
    },

    updateStats(data) {
        ['health', 'stamina', 'mana'].forEach(stat => {
            const fill = document.getElementById(`${stat}-fill`);
            const value = document.getElementById(`${stat}-value`);
            if (fill && value && data[stat] !== undefined) {
                fill.style.width = `${data[stat]}%`;
                value.textContent = Math.floor(data[stat]);
            }
        });
    },

    updateAbility(data) {
        const cooldown = Math.ceil(Number(data.cooldown) || 0);
        if (cooldown > 0) {
            this.startCooldown(data.ability, cooldown);
        }
    },

    startCooldown(ability, duration) {
        const element = document.getElementById(`cooldown${ability === 'primary' ? '1' : '2'}`);
        if (!element) return;

        element.textContent = `${duration}s`;
        element.style.color = '#ff5555';

        const timer = setInterval(() => {
            duration--;
            if (duration <= 0) {
                clearInterval(timer);
                element.textContent = 'Ready';
                element.style.color = '#55ff55';
            } else {
                element.textContent = `${duration}s`;
            }
        }, 1000);
    }
}; 