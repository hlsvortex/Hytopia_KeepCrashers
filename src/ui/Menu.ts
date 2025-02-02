import { Panel } from "./Panel";

export class Menu {
    private panels: Panel[] = [];
    private container: HTMLElement;

    constructor(containerId: string) {
        this.container = document.getElementById(containerId) || document.body;
    }

    addPanel(panel: Panel) {
        this.panels.push(panel);
        this.container.appendChild(panel.getElement());
        return panel;
    }

    removePanel(panel: Panel) {
        panel.getElement().remove();
        this.panels = this.panels.filter(p => p !== panel);
    }

    showPanel(panelId: string) {
        this.panels.forEach(panel => {
            if (panel.getId() === panelId) {
                panel.show();
            } else {
                panel.hide();
            }
        });
    }
} 