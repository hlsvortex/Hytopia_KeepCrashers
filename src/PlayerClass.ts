import { Entity, EventRouter, type PlayerInput, Vector3, type Vector3Like, Quaternion, PlayerEntity } from 'hytopia';
import { AbilityController } from './AbilityController';
import { Resource } from './Resource';
import { PhysicsProjectileAbility } from './abilities/PhysicsProjectileAbility';
import { SelfAbility } from './abilities/SelfAbility';
import { world } from './GlobalContext';
import { ParticleFX } from './particles/ParticleFX';
import type { DamageableEntity } from './DamageableEntity';
import type MyEntityController from './MyEntityController';
import type { Ability } from './Ability';



export class WizardAbilityController extends AbilityController {
    private bookEntity?: Entity;

    constructor(eventRouter: EventRouter) {
        super(eventRouter);
    }

    protected setupAbilities() {
        const fireballOptions = {
            name: 'Fireball',
            cooldown: 1,
            resourceCost: 20,
            resourceType: Resource.Mana,
            maxRange: 15,
            speed: 20,
            damage: 15,
            modelUri: 'models/projectiles/fireball.gltf',
            modelScale: 0.5,
            projectileRadius: 0.05,
            knockback: 0.8,
            gravityScale: 0.0,
            hitFX: ParticleFX.EXPLOSION,
            aoe: {
                radius: 1.5,
                damage: 10,
                knockback: 15.5,
                falloff: true,
            },
        };

        this.addAbility('primary', new PhysicsProjectileAbility(fireballOptions, this.eventRouter, this));

        const teleportOptions = {
            name: 'Teleport',
            cooldown: 1,
            resourceCost: 20,
            resourceType: Resource.Mana,
            range: 10,
            distance: 10,
        };
        this.addAbility('secondary', new SelfAbility(teleportOptions, this.eventRouter, this));
    }

    protected spawnClassItems() {
        this.bookEntity = new Entity({
            name: 'book',
            modelUri: 'models/items/book.gltf',
            parent: this.attachedEntity!,
            modelScale: 1.1,
            parentNodeName: 'hand_right_anchor',
        });

        this.bookEntity.spawn(
            world,
            { x: 0.0, y: 0.3, z: 0.3 },
            Quaternion.fromEuler(-90, 0, 90)
        );
    }

    protected destroyClassItems() {
        if (this.bookEntity) {
            this.bookEntity.despawn();
            this.bookEntity = undefined;
        }
    }

    tick(entity: PlayerEntity, input: PlayerInput, deltaTimeMs: number) {

        const abilityPrimary = this._abilities.get('primary') as PhysicsProjectileAbility;
        const abilitySecondary = this._abilities.get('secondary') as SelfAbility;

        this.updateAbilityInput(entity, abilityPrimary, input.ml ?? false);
        this.updateAbilityInput(entity, abilitySecondary, input.mr ?? false);
        
        //console.log(input.space);
        if (input.sp) {

            const manaCost = 0.04; // mana per second
            const manaConsumed = manaCost * deltaTimeMs;

            const damageableEntity = entity as DamageableEntity;

            if (entity.linearVelocity.y > 5.1) { return; }
            if (damageableEntity.mana < manaConsumed) { return; }
                // Apply flying velocity

            entity.applyImpulse(new Vector3(0, 1, 0));
            damageableEntity.useMana(manaConsumed);
        }
        // Wizard-specific tick logic
    }
}

export class FighterAbilityController extends AbilityController {
    private swordEntity?: Entity;

    constructor(eventRouter: EventRouter) {
        super(eventRouter);
    }

    protected setupAbilities() {
        // Add fighter abilities
        const slashOptions = {
            name: 'Slash',
            cooldown: 0.5,
            resourceCost: 10,
            resourceType: Resource.Stamina,
            range: 3,
            damage: 20
        };
     
      //  this.addAbility('primary', new TargetedAbility(slashOptions, this.eventRouter));
    }

    protected spawnClassItems() {
        this.swordEntity = new Entity({
            name: 'sword',
            modelUri: 'models/items/sword.gltf',
            parent: this.attachedEntity!,
            modelScale: 1.1,
            parentNodeName: 'hand_right_anchor',
        });
        this.swordEntity.spawn(
            world,
            { x: 0.0, y: 0.3, z: 0.3 },
            Quaternion.fromEuler(-90, 0, 90)
        );
    }

    protected destroyClassItems() {
        if (this.swordEntity) {
            this.swordEntity.despawn();
            this.swordEntity = undefined;
        }
    }

    tick(entity: PlayerEntity, input: PlayerInput, deltaTimeMs: number) {
        // Fighter-specific tick logic
    }
}

export class ArcherAbilityController extends AbilityController {
    private bowEntity?: Entity;
    private hasDoubledJumped: boolean = false;

    
    constructor(eventRouter: EventRouter) {
        super(eventRouter);
    }

    protected setupAbilities() {
        const shootArrowOptions = {
            name: 'Arrow',
            cooldown: 1,
            resourceCost: 20,
            resourceType: Resource.Mana,
            maxRange: 100,
            speed: 30,
            damage: 25,
            modelUri: 'models/projectiles/arrow.gltf',
            modelScale: 0.4,
            projectileRadius: 0.1,
            knockback: 0.5,
            gravityScale: 0.5,
            hitFX: ParticleFX.CLOUD_PUFF,
            charging: {
                minChargeTime: 0.0,
                maxChargeTime: 1.0,
                chargeEffects: {
                    speed: {
                        min: 16,
                        max: 25
                    },
                    damage: {
                        min: 20,
                        max: 40
                    },
                    gravity: {
                        min: 0.4,
                        max: 0.01  // Less gravity at full charge = straighter shot
                    }
                }
            }
        };

        const arrowAbility = new PhysicsProjectileAbility(shootArrowOptions, this.eventRouter, this);
        this.addAbility('primary', arrowAbility);

        const rollOptions = {
            name: 'Roll',
            cooldown: 1,
            resourceCost: 20,
            resourceType: Resource.Mana,
            range: 30,
            distance: 6,
            onUse: this.handleRoll.bind(this)
        };
        this.addAbility('secondary', new SelfAbility(rollOptions, this.eventRouter, this));
    }

    protected spawnClassItems() {
        this.bowEntity = new Entity({
            name: 'bow',
            modelUri: 'models/items/bone.gltf',
            parent: this.attachedEntity!,
            modelScale: 1.1,
            parentNodeName: 'hand_right_anchor',
        });
        this.bowEntity.spawn(
            world,
            { x: 0.0, y: 0.0, z: 0.1 },
            Quaternion.fromEuler(0, 0, 0)
        );
    }

    protected destroyClassItems() {
        if (this.bowEntity) {
            this.bowEntity.despawn();
            this.bowEntity = undefined;
        }
    }

    
    
    tick(entity: PlayerEntity, input: PlayerInput, deltaTimeMs: number) {

        const abilityPrimary = this._abilities.get('primary') as PhysicsProjectileAbility;
        const abilitySecondary = this._abilities.get('secondary') as SelfAbility;

        this.updateAbilityInput(entity, abilityPrimary, input.ml ?? false);
        this.updateAbilityInput(entity, abilitySecondary, input.mr ?? false);

        const myController = entity.controller as MyEntityController;
        const damageableEntity = entity  as DamageableEntity;
        // Archer-specific tick logic
        if (input.sp && !myController.isGrounded && !this.hasDoubledJumped) {

            const staminaCost = 10; // stamina per second
            if (damageableEntity.stamina < staminaCost) { return; }
            // Apply flying velocity
            entity.setLinearVelocity(new Vector3(entity.linearVelocity.x, 0, entity.linearVelocity.z));
            entity.applyImpulse(new Vector3(0, 16, 0));
            damageableEntity.useStamina(staminaCost);
            this.hasDoubledJumped = true;
        }
        else if (myController.isGrounded) {
            this.hasDoubledJumped = false;
        }
    }

    private handleRoll(origin: Vector3Like, direction: Vector3Like, source: Entity) {
        if (source.linearVelocity.x === 0 && source.linearVelocity.z === 0) return;
        
        const directionVector = new Vector3(source.linearVelocity.x, 1, source.linearVelocity.z);
        directionVector.normalize().scale(15);
        source.setLinearVelocity(directionVector);
    }
}
