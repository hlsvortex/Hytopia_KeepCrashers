import { PlayerEvents, type PlayerDeathEventPayload, type PlayerRespawnEventPayload } from './events';

import { EventRouter, Player } from 'hytopia';

export class RespawnSystem {
    private respawnTimers: Map<string, Timer> = new Map();

    constructor(private eventRouter: EventRouter) {
        this.setupListeners();
    }

    private setupListeners() {
        this.eventRouter.on<PlayerDeathEventPayload>(PlayerEvents.Death, (payload) => {
            this.handlePlayerDeath(payload);
        });
    }

    private handlePlayerDeath(payload: PlayerDeathEventPayload) {
        // Clear any existing timer for this player
        console.log('Death Respawn Started' + payload.player.id);
        const existingTimer = this.respawnTimers.get(payload.player.id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Set new respawn timer
        const timer = setTimeout(() => {
            this.respawnPlayer(payload.player);
            this.respawnTimers.delete(payload.player.id);
        }, 5000); // 10 seconds

        this.respawnTimers.set(payload.player.id, timer);
    }

    private respawnPlayer(player: Player ) {
        this.eventRouter.emit<PlayerRespawnEventPayload>(PlayerEvents.Respawn, {
            player,
            respawnTime: Date.now()
        });
        
    }

    public cleanup() {
        for (const timer of this.respawnTimers.values()) {
            clearTimeout(timer);
        }
        this.respawnTimers.clear();
    }

    
} 