import { BaseMenu } from "./BaseMenu";
import { Panel } from "../Panel";

export class StatsMenu extends BaseMenu {
    initialize() {
        console.log('StatsMenu: Initializing...');
        const statsPanel = new Panel('stats', 'Player Stats');
        this.addPanel(statsPanel);
    }
} 