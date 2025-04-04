import {
    Entity,
    PlayerEntity,
} from 'hytopia';


import type {
    PlayerInput,
    PlayerCameraOrientation,
} from 'hytopia';

import MyEntityController from './MyEntityController';
import type { MyEntityControllerOptions } from './MyEntityController';
import { DamageableEntity } from './DamageableEntity';
import { PlayerEvents } from './events';
import type { PlayerDeathEventPayload, PlayerRespawnEventPayload } from './events';
import { gameManager, world } from './GlobalContext';
import { AbilityController } from './AbilityController';
import { ArcherAbilityController } from './player_classes/ArcherAbilityController';
import { WizardAbilityController } from './player_classes/WizardAbilityController';
import { FighterAbilityController } from './player_classes/FighterAbilityController';
import type { GameStateEvent } from './GameStateController';
import type { Team } from './Team';
import type { GameState } from './GameState';


declare module 'hytopia' {
	// Augment the base EventPayloads interface directly
	interface EventPayloads {
		// Add your custom events using ENUM MEMBERS as keys
		[GameStateEvent.GAME_STATE_CHANGED]: GameState;
		[GameStateEvent.POINT_CAPTURED]: Team | null;
		[GameStateEvent.MATCH_COUNTDOWN_UPDATE]: number;
		[GameStateEvent.MATCH_TIME_UPDATE]: number;
		[PlayerEvents.Death]: PlayerDeathEventPayload;
		[PlayerEvents.Respawn]: PlayerRespawnEventPayload;
	}
}

export default class AbilityEntityController extends MyEntityController {
    private currentAbilityController: AbilityController;
    
    protected ownerEntity: PlayerEntity | undefined;
    
    constructor(options: MyEntityControllerOptions = {}) {
        super(options);
        this.currentAbilityController = new WizardAbilityController(world); //new DefaultAbilityController(); // Fallback controller
    }


    public attach(entity: Entity) {

        super.attach(entity);
        this.ownerEntity = entity as PlayerEntity;
        // Initialize the current controller with the entity
        this.currentAbilityController.attach(this.ownerEntity);

        world?.on(PlayerEvents.Death, (payload: PlayerDeathEventPayload) => {
            console.log('Player death event received' + payload.player);
            if (payload.player == this.ownerEntity?.player) {
                this.pauseInput = true;
            }
        });

        world?.on(PlayerEvents.Respawn, (payload: PlayerRespawnEventPayload) => {
            console.log('RESPAWNING' + payload.player);
            if (payload.player == this.ownerEntity?.player) {
                this.pauseInput = false;
                const damageable = this.ownerEntity as DamageableEntity;
                damageable.respawn();
            }
        });

        setTimeout(() => {
            // Show class select menu on join
            if (this.ownerEntity?.player) {
                this.ownerEntity.player.ui.sendData({
                    type: 'SHOW_CLASS_SELECT'
                });
            }

        }, 200);
   }

    public detach() {
        // Clean up current controller
        super.detach(this.ownerEntity as Entity);
        this.currentAbilityController.detach();
    }

    public setClass(className: string) {
        // Clean up previous controller
        if (this.currentAbilityController) {
            this.currentAbilityController.detach(); // Handles destroyClassItems through detach()
        }

        this.isJumping = false;

        // Create new controller based on class name
        switch(className.toLowerCase()) {
            case 'wizard':
                this.currentAbilityController = new WizardAbilityController(world);
                break;
            case 'fighter':
                this.currentAbilityController = new FighterAbilityController(world);
                break;
            case 'archer':
                this.currentAbilityController = new ArcherAbilityController(world);
                break;
            default: return;
        }

        // Initialize new controller - attach() handles spawning if entity exists
        if (this.ownerEntity) {
            this.currentAbilityController.attach(this.ownerEntity);
            
            // Get ability icons
            const primaryIcon = this.currentAbilityController.abilities.get('primary')?.options.name//options.icon;
            const secondaryIcon = this.currentAbilityController.abilities.get('secondary')?.options.name;

            // Send to UI
            console.log('Sending classUpdate with icons:', {
                primary: primaryIcon,
                secondary: secondaryIcon
            });
            
            this.ownerEntity.player.ui.sendData({
                type: 'classUpdate',
                className: className.toLowerCase(),
                primaryIcon,
                secondaryIcon
            });
        }
    }
    

    public tickWithPlayerInput(entity: PlayerEntity, input: PlayerInput, cameraOrientation: PlayerCameraOrientation, deltaTimeMs: number) {
        if (!entity.isSpawned || !entity.world) return;

       

        if (this.pauseInput) return;
        // Call parent class for default movement
        super.tickWithPlayerInput(entity, input, cameraOrientation, deltaTimeMs);

        this.currentAbilityController.tick(entity, input, deltaTimeMs);
        
        if (input.c ) {
            input.c = false;
            if (!gameManager.isPlayerInSpawnArea(entity.player)) {
                return;
            }

            this.ownerEntity?.player.ui.sendData({
                type: 'SHOW_CLASS_SELECT'
            });
        }

        // Regenerate stats
        if (entity instanceof DamageableEntity) {
            this.regenerateStats(entity, deltaTimeMs);
        }
  
    }

    private regenerateStats(entity: DamageableEntity, deltaTimeMs: number) {
        const regenerationRate = 10; // per second
        const amount = regenerationRate * (deltaTimeMs / 1000);
        
        if (entity.linearVelocity.y < 0.05 && entity.linearVelocity.y > -0.05) {
            entity.regenerateStamina(amount+0.02);
        }

        entity.regenerateMana(amount);
    }
    
}




