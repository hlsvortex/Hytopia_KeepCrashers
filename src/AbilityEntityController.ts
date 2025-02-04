import {
    Audio,
    BaseEntityController,
    ColliderShape,
    CoefficientCombineRule,
    CollisionGroup,
    Entity,
    PlayerEntity,
    BlockType,
    EventRouter,
    RigidBodyType,
    Quaternion,
} from 'hytopia';

import { Vector3 } from 'hytopia';

import type {
    PlayerInput,
    PlayerCameraOrientation,
    Vector3Like,
} from 'hytopia';

import MyEntityController from './MyEntityController';
import type { MyEntityControllerOptions } from './MyEntityController';
import { DamageableEntity } from './DamageableEntity';
import { PlayerEvents } from './events';
import type { PlayerDeathEventPayload, PlayerRespawnEventPayload } from './events';
import { gameManager, world } from './GlobalContext';
import { ArcherAbilityController, WizardAbilityController, FighterAbilityController } from './PlayerClass';
import { AbilityController } from './AbilityController';




export default class AbilityEntityController extends MyEntityController {
    private currentAbilityController: AbilityController;
    
    protected ownerEntity: PlayerEntity | undefined;
    
    

    constructor(options: MyEntityControllerOptions = {}) {
        super(options);
        this.currentAbilityController = new WizardAbilityController(world.eventRouter); //new DefaultAbilityController(); // Fallback controller
    }


    public attach(entity: Entity) {
        super.attach(entity);
        this.ownerEntity = entity as PlayerEntity;
        // Initialize the current controller with the entity
        this.currentAbilityController.attach(this.ownerEntity);
        //const direction = Vector3.fromVector3Like(entity.directionFromRotation);

        world?.eventRouter.on<PlayerDeathEventPayload>(PlayerEvents.Death, (payload) => {
            console.log('Player death event received' + payload.player);
            if (payload.player == this.ownerEntity?.player) {
                this.pauseInput = true;
                
                //this.ownerEntity.setAdditionalMass(100000);
                
            }
        });

        world?.eventRouter.on<PlayerRespawnEventPayload>(PlayerEvents.Respawn, (payload) => {
            console.log('RESPAWNING' + payload.player);
            if (payload.player == this.ownerEntity?.player) {
                this.pauseInput = false;
                const damageable = this.ownerEntity as DamageableEntity;
                damageable.respawn();
                //this.ownerEntity.setAdditionalMass(0.1);
                //gameManager.setTeamSpawnArea
            }
        });

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

        // Create new controller based on class name
        switch(className.toLowerCase()) {
            case 'wizard':
                this.currentAbilityController = new WizardAbilityController(world.eventRouter);
                break;
            case 'fighter':
                this.currentAbilityController = new FighterAbilityController(world.eventRouter);
                break;
            case 'archer':
                this.currentAbilityController = new ArcherAbilityController(world.eventRouter);
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
    
        // Regenerate stats
        if (entity instanceof DamageableEntity) {
            this.regenerateStats(entity, deltaTimeMs);
        }
  
    }

    private regenerateStats(entity: DamageableEntity, deltaTimeMs: number) {
        const regenerationRate = 10; // per second
        const amount = regenerationRate * (deltaTimeMs / 1000);
        
        if (!entity.isMoving) {
            entity.regenerateStamina(amount);
        }
        entity.regenerateMana(amount);
    }
    
}




