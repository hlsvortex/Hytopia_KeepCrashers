export class Panel {
    private element: HTMLElement;
    private id: string;

    constructor(id: string, title: string, element?: HTMLElement) {
        this.id = id;
        if (element) {
            this.element = element;
        } else {
            // This will only be used server-side for type checking
            this.element = {} as HTMLElement;
        }
    }

    getId(): string {
        return this.id;
    }

    getElement(): HTMLElement {
        return this.element;
    }

    setContent(content: string | HTMLElement) {
        if (typeof content === 'string') {
            this.element.innerHTML = content;
        } else {
            this.element.appendChild(content);
        }
    }

    show() {
        this.element.style.display = 'block';
    }

    hide() {
        this.element.style.display = 'none';
    }
} 