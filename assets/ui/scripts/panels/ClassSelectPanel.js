import { BasePanel } from '../BasePanel.js';

export default class ClassSelectPanel extends BasePanel {
    constructor() {
        super('class-select-container');
        this.init();
    }

    init() {
      
        // Create menu structure
        this.container.innerHTML = `
            <div id="class-select-menu" class="class-select-menu">
                <div class="class-buttons">
                    <div class="class-button wizard" data-class="wizard">
                        <div class="class-icon"></div>
                        <div class="class-info">
                            <h3>Wizard</h3>
                            <p>
                                <strong>LMB</strong><span>Fireball</span><br>
                                <strong>RMB</strong><span>Fire Darts</span><br>
                                <strong>SPACE</strong><span>Flight</span>
                            </p>
                        </div>
                    </div>
                    <div class="class-button fighter" data-class="fighter">
                        <div class="class-icon"></div>
                        <div class="class-info">
                            <h3>Barbarian</h3>
                            <p>
                                <strong>LMB</strong><span>Spirit Axe</span><br>
                                <strong>RMB</strong><span>Charge Slash</span><br>
                                <strong>SPACE</strong><span>Glide</span>
                            </p>
                        </div>
                    </div>
                    <div class="class-button archer" data-class="archer">
                        <div class="class-icon"></div>
                        <div class="class-info">
                            <h3>Archer</h3>
                            <p>
                                <strong>LMB</strong><span>Precision Shot</span><br>
                                <strong>RMB</strong><span>Fuse Bomb</span><br>
                                <strong>SPACE</strong><span>Double Jump</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.addEventListeners();
    }


    addEventListeners() {
        // Class selection
        this.container.querySelectorAll('.class-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const className = button.dataset.class;
                this.handleClassSelect(className);
            });
        });

        hytopia.onData(data => {
            if (data.type === 'SHOW_CLASS_SELECT') {
               
                this.openPanel();
                hytopia.sendData({
                    type: 'TOGGLE_POINTER_LOCK',
                    enabled: true
                });
            }
        });
    }

    handleClassSelect(className) {
        hytopia.sendData({
            type: 'CLASS_CHANGE',
            className: className
        });

        this.closePanel();
        
        hytopia.sendData({
            type: 'TOGGLE_POINTER_LOCK',
            enabled: false
        });
    }

    openPanel() {
        this.container.style.display = 'flex';
        console.log('Display after show:', this.container.style.display);
        hytopia.sendData({
            type: 'TOGGLE_POINTER_LOCK',
            enabled: false
        });
    }

    
}