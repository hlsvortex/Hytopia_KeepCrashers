import { BasePanel } from '../BasePanel.js';
import { MenuType } from '../MenuType.js';

export default class GameStatusPanel extends BasePanel {
    constructor() {
        super('game-status-container');
        this.init();
    }

    init() {
       
        this.container.innerHTML = `
           <div class="bottom-center-ui-container">
              <!-- Ready Check -->
              <button id="ready-button" class="ready-button">
                  READY UP (R)
              </button>
          </div>

          <div id="game-state-display" class="game-state-display"></div>
        `;

        this.addEventListeners();
    }

    addEventListeners() {

      document.getElementById('ready-button').addEventListener('click', () => {
        hytopia.sendData({
          type: 'PLAYER_READY'
        });
        // Hide immediately on click
        document.getElementById('ready-button').style.display = 'none';
      });

      // Add 'R' key binding for Ready Up
        document.addEventListener('keydown', (event) => {
          if (event.key.toLowerCase() === 'r') {

            const readyButton = document.getElementById('ready-button');
            if (readyButton && readyButton.style.display !== 'none') {
              hytopia.sendData({
                type: 'PLAYER_READY'
              });
              readyButton.style.display = 'none';
            }
          }
        });


        hytopia.onData(data => {
      
          if (data.type === 'gameStateUpdate') {

            const display = document.getElementById('game-state-display');
            const readyButton = document.getElementById('ready-button');
            //const victoryScreen = document.getElementById('victory-screen');
            //const matchStats = document.getElementById('match-stats-panel');

            display.textContent = data.message;

            

            // Only show button if in ready state AND player isn't already ready
            readyButton.style.display =
              data.state === 'WaitingForPlayersReady' && !data.isReady ? 'block' : 'none';

			window.menuSystem.closeMenu(MenuType.MATCH_STATS);
            // Handle victory and stats screens
            switch (data.state) {
              
			  case 'MatchPlay':
              case 'MatchEnd':
                //window.menuSystem.openMenu(MenuType.RoundWinner);
                //victoryScreen.style.display = 'flex';
                //matchStats.style.display = 'none';
                break;
              case 'MatchStats':

                window.menuSystem.closeMenu(MenuType.ROUND_WINNER);
                console.log('MatchStats -- Opening');
                const matchStats = document.getElementById('match-stats-container');
                matchStats.style.display = 'block';
               
                break;
              case 'MatchPlay':
                display.style.display = 'none';
                break;
              default:
                display.style.display = 'block';
            }

            if (data.message == "") {
              display.style.display = 'none';
            }
            else {
              display.style.display = 'block';
            }
          }
        });
    }

} 