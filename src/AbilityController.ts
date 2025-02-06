import { Entity, EventRouter, PlayerEntity, Vector3, type PlayerInput } from 'hytopia';
import type { Ability } from './Ability';
import { DamageableEntity } from './DamageableEntity';
import { world } from './GlobalContext';
import type MyEntityController from './MyEntityController';

export abstract class AbilityController {
    protected _abilities: Map<string, Ability> = new Map();
    protected attachedEntity?: PlayerEntity;
    protected maxHealth: number = 100;
    protected runSpeed: number = 8;
    protected jumpVelocity: number = 12;  // Default jump velocity
    protected useCustomJump: boolean = false;

    public get abilities(): Map<string, Ability> {
        return this._abilities;
    }

    constructor(protected eventRouter: EventRouter) {}

    // Properly typed attach/detach with cleanup
    public attach(entity: PlayerEntity) {
        this.attachedEntity = entity;
        this.setupAbilities();
        
        // Apply class stats
        if (entity instanceof DamageableEntity) {
            entity.maxHealth = this.maxHealth;
            entity.heal(this.maxHealth);
        }
        
        const controller = entity.controller as MyEntityController;
        if (controller) {
            controller.runVelocity = this.runSpeed;
            controller.jumpVelocity = this.jumpVelocity;  // Apply jump velocity
            controller.useCustomJump = this.useCustomJump;
        }

        // Only spawn items if entity is already spawned
        if (entity.isSpawned) {
            this.spawnClassItems();
        } else {
            // Listen for spawn event
            entity.onSpawn = () => {
                this.spawnClassItems();
            };
        }
    }

    public detach() {
        this.destroyClassItems();
        this.cleanupAbilities();
        this.attachedEntity = undefined;
    }

    protected abstract setupAbilities(): void;
    public abstract spawnClassItems(): void;
    public abstract destroyClassItems(): void;

    // Example cleanup implementation
    private cleanupAbilities() {
        this._abilities.forEach(ability => {
            if (ability.cleanup) ability.cleanup();
        });
        this._abilities.clear();
    }

    protected addAbility(key: string, ability: Ability) {
        this._abilities.set(key, ability);
    }

    protected updateAbilityInput(entity: PlayerEntity, ability: Ability, buttonDown: boolean) {
        if (!ability.canUseAbility(entity as DamageableEntity)) return;

        if (ability.hasCharging()) {

            if(buttonDown) {
                ability.getChargeLevel();
            }

            if (buttonDown && !ability.getIsCharging()) {
                if (ability) {
                    ability.startCharge();
                }
            }
            else if (ability.getIsCharging() && !buttonDown) {
                this.useAbility(ability, entity);
            }
        }
        else if (buttonDown) {

            if (!ability.options.useType || ability.options.useType === 'instant') {
                this.useAbility(ability, entity);
            }
            else if (ability.options.useType === 'hold_continuous') {
                this.useAbilityTick(ability, entity);
            }
            else if (ability.options.useType === 'toggle_continuous') {
                // Tick the ability
                const interval = setInterval(() => {
                    this.useAbilityTick(ability, entity);
                }, 100);

                setTimeout(() => {
                    clearInterval(interval);
                }, 1000);
            }
            





        }
    }

    protected useAbility(ability: Ability, entity: PlayerEntity) {
        const aim = this.calculateAimDirection(entity, 50);
        if (!aim) return;
        ability.use(aim.origin, aim.direction, entity);
        entity.startModelOneshotAnimations(['simple_interact']); 
        ability.startCooldown();
        ability.consumeResources(entity as DamageableEntity);
    }

    protected useAbilityTick(ability: Ability, entity: PlayerEntity) {
        const aim = this.calculateAimDirection(entity, 50);
        if (!aim) return;

        ability.use(aim.origin, aim.direction, entity);
        //entity.startModelOneshotAnimations(['simple_interact']);
        //ability.startCooldown();
        
    }
    
    
    abstract tick(entity: PlayerEntity, input: PlayerInput, deltaTimeMs: number): void;

    public updateChargeUI(isCharging: boolean, chargeLevel: number) {
        
        if(this.attachedEntity?.player) {
            this.attachedEntity.player.ui.sendData({
                type: 'chargeUpdate',
                isCharging: isCharging,
                chargeLevel: chargeLevel
        });
        }
    }
    // THis is the aim direction for the player it cast a raycast from the center of the camera to find the target point
    // they it usess that point to aim from the players projectile spawn point - its super hacky rite now because
    // i cant get the correct direct /position of the camera is seems. or im dumb.
    protected calculateAimDirection(entity: PlayerEntity, maxDistance: number) { 
        // Get camera orientation
        const camera = entity.player.camera;

        const cameraPos = camera.attachedToEntity?.position;//entity.position;
        const cameraForward = camera.facingDirection;

        const cameraOffset = camera.offset;
        const zoom = camera.zoom;

        //console.log(cameraOffsetX);
        // Calculate right vector for camera offset
        const rightVector = new Vector3(
            -cameraForward.z,
            0,
            cameraForward.x
        ).normalize();

        if (!cameraPos) return;

        // Apply right offset only to camera/raycast position
        const rightOffset = camera.filmOffset * 0.035;
        const heightOffset = cameraOffset.y ;
        let raycastPos = new Vector3(
            cameraPos.x + rightVector.x * rightOffset,
            cameraPos.y + heightOffset,
            cameraPos.z + rightVector.z * rightOffset
        );

        // Add forward offset based on zoom
        const forwardOffset = -zoom ;  // Adjust multiplier as needed
        raycastPos.add(Vector3.fromVector3Like(cameraForward).scale(forwardOffset));

        
        // Calculate a downward tilt relative to camera orientation
        const rotateAround = new Vector3(0, 1, 0);
        const finalDirection = Vector3.fromVector3Like(cameraForward)
            .rotateY(rotateAround, -0.22);
        
        finalDirection.normalize(); // Normalize to maintain consistent direction

        // Original projectile origin without right offset
        const originForwardOffset = 0.15;
        const origin = new Vector3(
            entity.position.x + finalDirection.x * originForwardOffset,
            entity.position.y + 0.3 + finalDirection.y * originForwardOffset,
            entity.position.z + finalDirection.z * originForwardOffset
        );
       
        const originOffset = 0.35;
        origin.x += rightVector.x * originOffset;
        origin.z += rightVector.z * originOffset;

        // Raycast from offset camera position
        const raycastResult = world?.simulation.raycast(
            raycastPos,
            finalDirection,
            maxDistance,
            { filterExcludeRigidBody: entity.rawRigidBody }
        );

        // If we hit nothing return the max distance point
        const targetPoint = raycastResult?.hitPoint ||
            new Vector3(raycastPos.x, raycastPos.y, raycastPos.z)
                .add(new Vector3(finalDirection.x, finalDirection.y, finalDirection.z).scale(maxDistance));

        // Projectiles Direction from player towards the target point
        const direction = new Vector3(
            targetPoint.x - origin.x,
            targetPoint.y - origin.y,
            targetPoint.z - origin.z
        );

        return { origin, direction };
    }

    public getAttachedEntity(): PlayerEntity | undefined {
        return this.attachedEntity;
    }
} 