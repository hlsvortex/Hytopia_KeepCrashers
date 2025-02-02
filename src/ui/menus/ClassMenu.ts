import { BaseMenu } from "./BaseMenu";
import { Panel } from "../Panel";

export class ClassMenu extends BaseMenu {
    initialize() {
        const classPanel = new Panel('class-select', 'Choose Your Class');
        classPanel.setContent(`
            <div class="class-button wizard">Wizard</div>
            <div class="class-button fighter">Fighter</div>
            <div class="class-button archer">Archer</div>
        `);
        this.addPanel(classPanel);
    }
} 