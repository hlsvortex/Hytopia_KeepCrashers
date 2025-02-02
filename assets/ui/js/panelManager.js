// Panel Manager
console.log('Loading PanelManager...');

// Define PanelManager immediately
window.PanelManager = {
    panels: new Map(),

    async initialize(containerId) {
        console.log('PanelManager: Starting initialization for container:', containerId);
        
        try {
            // Initialize panels
            const statsPanel = await window.PlayerStatsPanel.initialize(containerId);
            const matchStatsPanel = await window.MatchStatsPanel.initialize(containerId);
            
            if (statsPanel) {
                this.panels.set('stats', statsPanel);
                console.log('PanelManager: Stats panel initialized');
            } else {
                console.error('PanelManager: Failed to initialize stats panel');
            }

            if (matchStatsPanel) {
                this.panels.set('matchStats', matchStatsPanel);
            }

            // Handle panel toggle requests
            hytopia.onData(data => {
                if (data.type === 'TOGGLE_MENU') {
                    this.togglePanel(data.menuId);
                }
            });

            // Show stats panel by default
            this.togglePanel('stats');
            
            console.log('PanelManager: Initialization complete');
        } catch (error) {
            console.error('PanelManager: Initialization failed:', error);
            throw error;
        }
    },

    togglePanel(panelId) {
        console.log('PanelManager: Toggling panel:', panelId);
        
        // Hide all panels
        this.panels.forEach(panel => {
            if (panel) panel.style.display = 'none';
        });

        // Show requested panel
        const panel = this.panels.get(panelId);
        if (panel) {
            panel.style.display = 'block';
            console.log('PanelManager: Showing panel:', panelId);
        } else {
            console.warn('PanelManager: Panel not found:', panelId);
        }
    }
};
console.log('PanelManager defined:', window.PanelManager); 