import { EventRouter } from 'hytopia';

export class Keep {
    health: number = 1000;

    constructor(public team: string, private eventRouter: EventRouter) { }

    takeDamage(amount: number) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.eventRouter.emit('KEEP_DESTROYED', { team: this.team });
        }
    }
}