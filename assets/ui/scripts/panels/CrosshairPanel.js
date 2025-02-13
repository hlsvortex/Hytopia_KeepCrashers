import { BasePanel } from '../BasePanel.js';

export default class CrosshairPanel extends BasePanel {
    constructor() {
        super('crosshair-container');
        this.init();
    }

    init() {
        // Create menu structure
        this.container.innerHTML = `
            <!-- Add crosshair -->
            <div class="crosshair"></div>

            <div id="charging-bar" class="charging-bar">
                <div id="charging-bar-fill" class="charging-bar-fill"></div>
            </div>
            `;

        this.addEventListeners();
    }


    addEventListeners() {
        hytopia.onData(data => {
            if (data.type === 'chargeUpdate') {
                const chargingBar = document.getElementById('charging-bar');
                const chargingBarFill = document.getElementById('charging-bar-fill');

                if (data.isCharging) {
                    chargingBar.style.display = 'block';
                    // Ensure at least 5% height for visibility
                    const fillHeight = Math.max(1, data.chargeLevel * 100);
                    chargingBarFill.style.height = `${fillHeight}%`;
                } else {
                    chargingBar.style.display = 'none';
                    chargingBarFill.style.height = '0%';
                }
            }
        });
    }

   
}