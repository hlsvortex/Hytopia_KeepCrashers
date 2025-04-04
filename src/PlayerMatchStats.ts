export class PlayerMatchStats {
    constructor(
        public kills: number = 0,
        public deaths: number = 0,
        public suicides: number = 0
    ) {}

    public addKill() { this.kills++ }
    public addDeath() { this.deaths++ }
    public addSuicide() { this.suicides++ }
    
    public resetStats() {
        this.kills = 0;
        this.deaths = 0;
        this.suicides = 0;
    }
} 