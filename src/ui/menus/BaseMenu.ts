import { Panel } from "../Panel";

export abstract class BaseMenu {
    protected panels: Panel[] = [];
    protected container: HTMLElement | null = null;

    constructor(private containerId: string) {}

    public initializeContainer(container: HTMLElement) {
        this.container = container;
    }

    abstract initialize(): void;

    protected addPanel(panel: Panel) {
        if (!this.container) {
            console.error('Container not initialized');
            return;
        }
        this.panels.push(panel);
        this.container.appendChild(panel.getElement());
        return panel;
    }

    show(panelId?: string) {
        if (!this.container) return;
        if (panelId) {
            this.panels.forEach(panel => {
                if (panel.getId() === panelId) {
                    panel.show();
                } else {
                    panel.hide();
                }
            });
        } else {
            this.panels.forEach(panel => panel.show());
        }
    }

    hide() {
        if (!this.container) return;
        this.panels.forEach(panel => panel.hide());
    }
} 