import { BasePanel } from '../BasePanel.js';

export default class PlayerStatusPanel extends BasePanel {
    constructor() {
        super('player-status-container');
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="hud-container">
                <!-- Health Bar -->
                <div class="health-hud">
                    <div id="health-bar" class="health-bar" style="width: 100%"></div>
                    <div id="health-text" class="health-text">100 / 100</div>
                </div>

                <!-- Right-side HUD -->
                <div class="right-hud-container">
                    <!-- Abilities -->
                    <div class="abilities-container">
                       

                        <!-- Primary Ability -->
                        <div id="ability1" class="ability">
                            <div class="ability-icon"></div>
                            <div class="ability-cooldown"></div>
                            <div class="ability-label">LMB</div>
                        </div>
						 <!-- Secondary Ability -->
                        <div id="ability2" class="ability">
                            <div class="ability-icon"></div>
                            <div class="ability-cooldown"></div>
                            <div class="ability-label">RMB</div>
                        </div>
                    </div>

                    <!-- Vertical Bars Container -->
                    <div class="vertical-bars">
						<!-- Mana Bar -->
                        <div class="mana-bar">
                            <div id="mana-fill" class="mana-fill" style="height: 100%"></div>
                            <div class="bar-text">Mana</div>
                        </div>
                        <!-- Stamina Bar -->
                        <div class="stamina-bar">
                            <div id="stamina-fill" class="stamina-fill" style="height: 100%"></div>
                            <div class="bar-text">Stamina</div>
                        </div>

                        
                    </div>
                </div>
            </div>
        `;

        this.addEventListeners();
    }

    addEventListeners() {
        hytopia.onData(data => {
            if (data.type === 'statsUpdate') {
                this.updateStatBars(data);
            }
            else if (data.type === 'abilityUpdate') {
                this.startCooldown(
                    data.ability === 'primary' ? 1 : 2,
                    data.cooldown,
                    data.icon
                );
            }
            else if (data.type === 'classUpdate') {
                console.log('Received classUpdate:', data);
                this.classUpdate(data);
            }
        });
    }

    classUpdate(data) {
        console.log('Ability 1:', data.primaryIcon);
        console.log('Ability 2:', data.secondaryIcon);

        const ability1Icon = document.querySelector('#ability1 .ability-icon');
        const ability2Icon = document.querySelector('#ability2 .ability-icon');
        ability1Icon.className = `ability-icon ability-icon-${data.primaryIcon.toLowerCase()}`;
        ability2Icon.className = `ability-icon ability-icon-${data.secondaryIcon.toLowerCase()}`;
    }

    updateStatBars(data) {
        if (!data) return;

        const healthPercent = (data.health / data.maxHealth) * 100;
        document.getElementById('health-bar').style.width = `${healthPercent}%`;
        document.getElementById('health-text').textContent = `${Math.round(data.health)} / ${Math.round(data.maxHealth)}`;
        document.getElementById('stamina-fill').style.height = `${data.stamina}%`;
        document.getElementById('mana-fill').style.height = `${data.mana}%`;
    }

    startCooldown(abilitySlotNumber, duration, iconUrl) {
        const abilitySlot = document.getElementById(`ability${abilitySlotNumber}`);
        if (!abilitySlot) return;

        const cooldownElement = abilitySlot.querySelector('.ability-cooldown');
        let remaining = duration;

        const updateCooldown = () => {
            remaining = Math.max(0, remaining - 0.1);
            cooldownElement.textContent = remaining > 0 ? `${remaining.toFixed(1)}s` : '';
            
            if (remaining <= 0) {
                clearInterval(timer);
                cooldownElement.style.display = 'none';
            }
        };

        cooldownElement.style.display = 'flex';
        const timer = setInterval(updateCooldown, 100);
        updateCooldown();
    }
} 