console.log('MenuSystem.js: Script file STARTING to load');

import { MenuType } from './MenuType.js';
import  ClassSelectPanel  from './panels/ClassSelectPanel.js';
import PlayerStatusPanel from './panels/PlayerStatusPanel.js';
import CapturePointPanel from './panels/CapturePointPanel.js';
import GameStatusPanel from './panels/GameStatusPanel.js';
import CrosshairPanel from './panels/CrosshairPanel.js';
import RoundWinnerPanel from './panels/RoundWinnerPanel.js';
import MatchStatsPanel from './panels/MatchStatsPanel.js';

export class MenuSystem {
	constructor() {
		this.panels = new Map();
		this.registerPanels();
		this.initGlobalListeners();
	}

	registerPanels() {
		this.registerPanel(
			MenuType.CLASS_SELECT,
			new ClassSelectPanel()
		);
		this.registerPanel(MenuType.HUD, [
			new PlayerStatusPanel(),
			new CapturePointPanel(),
			new GameStatusPanel(),
			new CrosshairPanel()
		]);
		this.registerPanel(
			MenuType.ROUND_WINNER,
			new RoundWinnerPanel()
		);
		this.registerPanel(
			MenuType.MATCH_STATS,
			new MatchStatsPanel()
		);
	}

	registerPanel(menuType, panel) {
		if (!this.panels.has(menuType)) {
			this.panels.set(menuType, []);
		}
		if (Array.isArray(panel)) {
			this.panels.set(menuType, [...this.panels.get(menuType), ...panel]);
		} else {
			this.panels.get(menuType).push(panel);
		}
	}

	openMenu(menuType, closeOtherMenus = true) {
		
		if (closeOtherMenus) {
			this.closeAllMenus();
		}
		
		const panels = this.panels.get(menuType) || []; 
		for (const panel of panels) {
			panel.openPanel();
		}
	}

	closeMenu(menuType) {
		const panels = this.panels.get(menuType) || [];
		for (const panel of panels) {
			panel.closePanel();
		}
	}

	closeAllMenus() {
		this.panels.forEach(panels => {
			panels.forEach(panel => panel.closePanel());
		});
	}

	initGlobalListeners() {
		console.log('Setting up global listeners');
	}

	toggleMenu(menuName) {
		if (this.panels.get(menuName)) {
			this.panels.get(menuName).togglePanel();
		}
	}
}

// Initialize the menu system
window.menuSystem = new MenuSystem();
console.log('MenuSystem instance created:', window.menuSystem);
