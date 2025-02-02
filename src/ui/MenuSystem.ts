import { StatsMenu } from "./menus/StatsMenu";
//import { ClassMenu } from "./menus/ClassMenu";

export class MenuSystem {
    private menus: Map<string, any> = new Map();
    private initialized = false;

    constructor() {
        console.log('MenuSystem constructor called');
    }

    initializeOnClient(containerId: string) {
        if (this.initialized) return;
        console.log('Initializing menus on client...');
        
        try {
            const statsMenu = new StatsMenu(containerId);
            statsMenu.initialize();
            
            this.menus.set('stats', statsMenu);
            this.showMenu('stats');
            
            this.initialized = true;
            console.log('Menus initialized successfully');
        } catch (error) {
            console.error('Error initializing menus:', error);
        }
    }

    showMenu(menuId: string, panelId?: string) {
        console.log(`Showing menu: ${menuId}`);
        // Hide all menus first
        this.menus.forEach(menu => menu.hide());
        
        // Show requested menu
        const menu = this.menus.get(menuId);
        if (menu) {
            menu.show(panelId);
        } else {
            console.warn(`Menu ${menuId} not found`);
        }
    }

    getMenu(menuId: string) {
        return this.menus.get(menuId);
    }
} 