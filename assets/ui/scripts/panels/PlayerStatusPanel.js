import { BasePanel } from '../BasePanel.js';

export default class PlayerStatusPanel extends BasePanel {
    constructor() {
        super('player-status-container');
        this.init();
    }

    init() {
        

        this.container.innerHTML = `
          <!-- Ability Container -->
          <div id="ability1" class="ability-container" data-ability-name="Axe Throw">
            <div class="ability-icon"></div>
            <div class="cooldown-overlay">
              <div class="cooldown-fill"></div>
              <div class="cooldown-text"></div>
            </div>
          </div>

          <div id="ability2" class="ability-container" data-ability-name="Charge Slash">
            <div class="ability-icon"></div>
            <div class="cooldown-overlay">
              <div class="cooldown-fill"></div>
              <div class="cooldown-text"></div>
            </div>
          </div>

          <!-- Add mana to bottom right -->
          <div id="mana-fill-container">
              <div class="stat-bar-mana">
                <div id="mana-fill" class="stat-fill mana-fill"></div>
                <span class="stat-value-overlay" id="mana-value">100</span>
              </div>
          </div>

          <div class="stats-panel">
            <div>
              <div class="stat-bar">
                <div id="health-fill" class="stat-fill health-fill" style="width: 100%"></div>
                <span class="stat-value-overlay" id="health-value">100</span>
              </div>
            </div>
            <div>
              <div class="stat-bar">
                <div id="stamina-fill" class="stat-fill stamina-fill" style="width: 100%"></div>
                <span class="stat-value-overlay" id="stamina-value">100</span>
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
        document.getElementById('health-fill').style.width = `${healthPercent}%`;
        document.getElementById('health-value').textContent = Math.round(data.health);
        document.getElementById('stamina-fill').style.width = `${data.stamina}%`;
        document.getElementById('stamina-value').textContent = Math.round(data.stamina);
        document.getElementById('mana-fill').style.width = `${data.mana}%`;
        document.getElementById('mana-value').textContent = Math.round(data.mana);
    }

    startCooldown(abilitySlotNumber, duration, iconUrl) {
        const abilitySlot = document.getElementById(`ability${abilitySlotNumber}`);
        if (!abilitySlot) return;

        let remaining = duration;
        const cooldownOverlay = abilitySlot.querySelector('.cooldown-overlay');
        const cooldownFill = abilitySlot.querySelector('.cooldown-fill');
        const cooldownText = abilitySlot.querySelector('.cooldown-text');

        cooldownOverlay.style.display = 'block';
        cooldownText.textContent = `${remaining.toFixed(1)}s`;
        cooldownFill.style.height = '100%';

        const timer = setInterval(() => {
            remaining = Math.max(0, remaining - 0.1);
            cooldownText.textContent = `${remaining.toFixed(1)}s`;
            cooldownFill.style.height = `${(remaining / duration) * 100}%`;

            if (remaining <= 0) {
                clearInterval(timer);
                cooldownOverlay.style.display = 'none';
                cooldownText.textContent = 'Ready';
            }
        }, 100);
    }
} 