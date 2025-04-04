import { Entity, EventRouter, type PlayerInput, Vector3, type Vector3Like, Quaternion, PlayerEntity, Light } from 'hytopia';
import { AbilityController } from '../AbilityController';
import { Resource } from '../Resource';
import { PhysicsProjectileAbility } from '../abilities/PhysicsProjectileAbility';
import { SelfAbility } from '../abilities/SelfAbility';
import { world } from '../GlobalContext';
import { ParticleFX } from '../particles/ParticleFX';
import type { DamageableEntity } from '../DamageableEntity';
import type { PhysicsProjectileOptions } from '../abilities/AbilityOptions';
import type AbilityEntityController from '../AbilityEntityController';

export class FighterAbilityController extends AbilityController {
    private swordEntity?: Entity;

    constructor(eventRouter: EventRouter) {
        super(eventRouter);
        this.maxHealth = 200;  // Tankier
        this.runSpeed = 6;     // Slower but stronger
        this.jumpVelocity = 14;  // Standard jump
    }

    protected setupAbilities() {
        // Add fighter abilities
        const SpiritAxe: PhysicsProjectileOptions = {
            name: 'Axe-Throw',
            slot: 'primary',
            cooldown: 1.5,
            resourceCost: 0,
            resourceType: Resource.Mana,
            maxRange: -1,
            speed: 25,
			faceVelocity: false,
            damage: 15,
            modelUri: 'models/items/battle-axe.gltf',
            modelScale: 0.6,
            projectileRadius: 0.3,
            knockback: 0.6,
            gravityScale: 0.0,
            hitFX: ParticleFX.CLOUD_PUFF,
            lifeTime: 1.2,
            torque: 2,
            //noHitOnBlockCollision: true,
            //noHitOnEntityCollision: true,
		
            isSensor: true,
            velocityReverse: {
                time: 0.6,        // Reverse after 0.5 seconds
                duration: 0.18,    // Take 0.2 seconds to reverse
                speedMultiplier: 1.1  // Return slightly faster
            },
            multiHit: {
                maxHits: 5,           // Can hit up to 3 targets
                hitCooldown: 0.15      // 0.2s cooldown between hits on same target
            },
            useSFX: {
                uri: 'audio/sfx/player/player-swing-woosh.mp3',
                volume: 0.9,
                referenceDistance: 8
            },

            hitSFX: {
                uri: 'audio/sfx/player/player-swing-woosh.mp3',
                volume: 0.5,
                referenceDistance: 8
            },
        };

        const ChargeSlash: PhysicsProjectileOptions = {
            name: 'Charge-Slash',
            slot: 'secondary',
            cooldown: 0.7,
            resourceCost: 30,
            resourceType: Resource.Mana,
            maxRange: 0.1,
            speed: 15,
            damage: 15,
            modelUri: 'models/projectiles/slash1.gltf',
            modelScale: 0.6,
            projectileRadius: 0.6,
            knockback: 0.4,
            gravityScale: 0.0,
            lifeTime: 0.25,
            //noHitOnBlockCollision: true,
            //noHitOnEntityCollision: true,
            isSensor: true,
            multiHit: {
                maxHits: 100,           // Can hit up to 3 targets
                hitCooldown: 0.2      // 0.2s cooldown between hits on same target
            },
            charging: {
                minChargeTime: 0.0,
                maxChargeTime: 1.0,
                chargeEffects: {
                    speed: {
                        min: 20,
                        max: 30
                    },
                    damage: {
                        min: 20,
                        max: 50
                    },
                    size: {
                        min: 0.6,
                        max: 1.3
                    },
                    impulseForce: {
                        min: -5,
                        max: -11
                    }
                }
            },

            useSFX: {
                uri: 'audio/sfx/damage/Sword Woosh 19.wav',
                referenceDistance: 10,
                volume: 0.9
            },
            /*
            hitSFX: {
                uri: 'audio/sfx/player/bow-hit.mp3',
                volume: 1,
                referenceDistance: 15
            },
            */
            useImpulse: {
                direction: 'backward',
                force: -15,
                useAimDirection: true
            }


        };

        this.addAbility('primary', new PhysicsProjectileAbility(SpiritAxe, this.eventRouter, this));
        this.addAbility('secondary', new PhysicsProjectileAbility(ChargeSlash, this.eventRouter, this));
    }

    public spawnClassItems() {
        this.swordEntity = new Entity({
            name: 'sword',
            modelUri: 'models/items/battle-axe.gltf',
            parent: this.attachedEntity!,
            modelScale: 1.1,
            parentNodeName: 'hand_right_anchor',
        });
        this.swordEntity.spawn(
            world,
            { x: 0.0, y: 0.3, z: 0.3 },
            Quaternion.fromEuler(-90, 0, 0)
        );
    }

    public destroyClassItems() {
        this.swordEntity?.despawn();
        this.swordEntity = undefined;
    }

    tick(entity: PlayerEntity, input: PlayerInput, deltaTimeMs: number) {

        const abilityPrimary = this._abilities.get('primary') as PhysicsProjectileAbility;
        const abilitySecondary = this._abilities.get('secondary') as PhysicsProjectileAbility;

        const myController = entity.controller! as AbilityEntityController;
        const damageableEntity = entity as DamageableEntity;

        this.updateAbilitiesInput(entity, abilityPrimary, abilitySecondary, input);


        if (abilityPrimary.getIsCharging() && !myController.isGrounded && entity.linearVelocity.y < 0.05) {

            entity.applyImpulse(new Vector3(0, 0.25, 0));
        }

        //console.log(input.space);
        if (input.sp) {

            if(damageableEntity.stamina < 5) { return; }

            damageableEntity.useStamina(6 * deltaTimeMs/1000);

            if (entity.linearVelocity.y > 1.1) { return; }
            // Apply flying velocity
            entity.applyImpulse(new Vector3(0, 0.8, 0));


        }
        // Wizard-specific tick logic
    }
} 