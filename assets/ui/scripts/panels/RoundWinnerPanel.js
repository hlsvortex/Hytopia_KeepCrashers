import { BasePanel } from '../BasePanel.js';
import { formatTime } from '../utils/formatTime.js';

export default class RoundWinnerPanel extends BasePanel {
    constructor() {
        super('round-winner-container');
        this.init();
    }

    init() {
        // Create menu structure
        this.container.innerHTML = `
            <!-- Add before closing body tag -->
            <div id="victory-screen" class="victory-screen">
                <div class="victory-content">
                    <div id="winning-team" class="winning-team"></div>
                    <div class="victory-text">VICTORY</div>
                </div>
            </div>
            `;

        this.addEventListeners();
    }


    addEventListeners() {
        hytopia.onData(data => {
            if (data.type === 'gameOverSequence') {
                 // Handle victory screen
                if (data.state === 'MatchEnd') {
                    const victoryScreen = document.getElementById('victory-screen');
                    console.log('Showing victory screen' + data.winningTeam + ' ' + data.teamColor);
                    const winningTeam = document.getElementById('winning-team');
                    winningTeam.textContent = data.winningTeam;
                    winningTeam.style.color = data.teamColor;
                    victoryScreen.style.display = 'flex';
                    this.openPanel();
                } else {
                    this.closePanel ();
                }
            }
        });
    }

   
}