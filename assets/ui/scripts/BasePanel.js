export class BasePanel {
    constructor(containerId) {
        this.checkContainer(containerId);
        console.log('BaseMenu container element:', this.container);
        this.isOpen = false;
    }

    checkContainer(containerId) {
        
        this.container = document.getElementById(containerId);

        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = containerId;
            document.body.appendChild(this.container);
        }
    }

    togglePanel() {
        this.isOpen ? this.open() : this.close();
    }

    openPanel() {
        if (!this.container) return;
        this.container.style.display = 'block';
        this.isOpen = true;
    }

    closePanel() {
        if (!this.container) return;
        this.container.style.display = 'none';
        this.isOpen = false;
    }
} 