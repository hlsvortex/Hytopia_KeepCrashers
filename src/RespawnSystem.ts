import { PlayerEvents, type PlayerDeathEventPayload, type PlayerRespawnEventPayload } from './events';

import { EventRouter, Player, World } from 'hytopia';
import { world } from './GlobalContext';



export class RespawnSystem {
    private respawnTimers: Map<string, Timer> = new Map();

    constructor(private world: World) {
        this.setupListeners();
    }

    private setupListeners() {
		world.on(PlayerEvents.Death, (payload: PlayerDeathEventPayload) => {
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
        world.emit(PlayerEvents.Respawn, { 
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