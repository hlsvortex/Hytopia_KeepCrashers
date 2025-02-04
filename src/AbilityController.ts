import { Entity, EventRouter, PlayerEntity, Vector3, type PlayerInput } from 'hytopia';
import type { Ability } from './Ability';
import type { DamageableEntity } from './DamageableEntity';
import { world } from './GlobalContext';

export abstract class AbilityController {
    protected _abilities: Map<string, Ability> = new Map();
    protected attachedEntity?: PlayerEntity;

    public get abilities(): Map<string, Ability> {
        return this._abilities;
    }

    constructor(protected eventRouter: EventRouter) {}

    // Properly typed attach/detach with cleanup
    public attach(entity: PlayerEntity) {
        this.attachedEntity = entity;
        this.setupAbilities();
        
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
        const heightOffset = cameraOffset.y + 0.21;
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
            .rotateY(rotateAround, -0.2);
        
        // Add downward component based on camera orientation
        finalDirection.y -= 0.15; // Adjust this value to control downward tilt
        finalDirection.normalize(); // Normalize to maintain consistent direction

        // Original projectile origin without right offset
        const originForwardOffset = 0.2;
        const origin = new Vector3(
            entity.position.x + finalDirection.x * originForwardOffset,
            entity.position.y + 0.6 + finalDirection.y * originForwardOffset,
            entity.position.z + finalDirection.z * originForwardOffset
        );
       
        const originOffset = 0.3;
        origin.x += rightVector.x * originOffset;
        origin.z += rightVector.z * originOffset;

        
        // Raycast from offset camera position
        const raycastResult = world?.simulation.raycast(
            raycastPos,
            finalDirection,
            maxDistance,
            { filterExcludeRigidBody: entity.rawRigidBody }
        );

        const targetPoint = raycastResult?.hitPoint ||
            new Vector3(raycastPos.x, raycastPos.y, raycastPos.z)
                .add(new Vector3(finalDirection.x, finalDirection.y, finalDirection.z).scale(maxDistance));

        // Projectiles Direction
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