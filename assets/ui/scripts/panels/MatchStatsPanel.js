import { BasePanel } from '../BasePanel.js';
import { MenuType } from '../MenuType.js';

export default class MatchStatsPanel extends BasePanel {
    constructor() {
        super('match-stats-container');
        this.init();
    }

    init() {
        // Create menu structure
        this.container.innerHTML = `
             <!-- Match stats panel (toggleable with F key) -->
            <div class="stats-panel" id="match-stats" style="display: none;">
                <!-- Existing teams container below -->
                <div class="teams-container">
                    <div class="team-list" id="red-team">
                        <h3 style="color: #f15b5b;">TEAM RED</h3>
                    </div>
                    <div class="team-list" id="blue-team">
                        <h3 style="color: #5f92f1;">TEAM BLUE</h3>
                    </div>
                </div>
            </div>
            `;

        this.addEventListeners();

        document.getElementById('match-stats').style.display = 'block';
        this.closePanel();
    }


    addEventListeners() {


        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                // Only toggle the stats panel, not the capture point
                document.getElementById('match-stats').style.display = 'block';
                window.menuSystem.openMenu(MenuType.MATCH_STATS);
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                // Only toggle the stats panel, not the capture point
                //document.getElementById('match-stats').style.display = 'none';
                window.menuSystem.openMenu(MenuType.HUD);
            }
        });


        hytopia.onData(data => {
            if (data.type === 'matchStatsUpdate') {
                const updateTeamList = (teamElement, players) => {
                    // Ensure header exists
                    let header = teamElement.querySelector('h3');
                    if (!header) {
                        header = document.createElement('h3');
                        teamElement.prepend(header);
                    }

                    // Set header text based on team
                    const teamName = teamElement.id === 'red-team' ? 'TEAM RED' : 'TEAM BLUE';
                    header.textContent = teamName;

                    // Clear existing content
                    teamElement.innerHTML = `
                        <h3>${teamName}</h3>
                        <div class="stats-header">
                            <span>Player</span>
                            <span>Deaths</span>
                            <span>Kills</span>
                        </div>
                    `;

                    // Add new player stats
                    players.forEach(player => {
                        const div = document.createElement('div');
                        div.className = 'player-stat';
                        div.innerHTML = `
                            <span>${player.username}</span>
                            <span>${player.deaths || 0}</span>
                            <span>${player.kills || 0}</span>
                        `;
                        teamElement.appendChild(div);
                    });
                };

                updateTeamList(document.getElementById('red-team'), data.teams.Red);
                updateTeamList(document.getElementById('blue-team'), data.teams.Blue);
            }
        });
    }

   
}