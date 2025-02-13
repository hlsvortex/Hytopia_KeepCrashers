import { Entity, EventRouter, type PlayerInput, Vector3, type Vector3Like, Quaternion, PlayerEntity, Light } from 'hytopia';
import { AbilityController } from '../AbilityController';
import { Resource } from '../Resource';
import { PhysicsProjectileAbility } from '../abilities/PhysicsProjectileAbility';
import { SelfAbility } from '../abilities/SelfAbility';
import { world } from '../GlobalContext';
import { ParticleFX } from '../particles/ParticleFX';
import type { DamageableEntity } from '../DamageableEntity';
import type MyEntityController from '../MyEntityController';
import type { Ability } from '../Ability';
import { BeamAbility, type BeamAbilityOptions } from '../abilities/BeamAbility';
import type { PhysicsProjectileOptions } from '../abilities/AbilityOptions';
import type AbilityEntityController from '../AbilityEntityController';

export class ArcherAbilityController extends AbilityController {
    private bowEntity?: Entity;
    private jumpCount: number = 0;

    constructor(eventRouter: EventRouter) {
        super(eventRouter);
        this.maxHealth = 180;   // Medium health
        this.runSpeed = 8.5;   // Good mobility
        this.jumpVelocity = 12;  // Medium jump height
        this.useCustomJump = true;
    }

    protected setupAbilities() {

        const shootArrowOptions: PhysicsProjectileOptions = {
            name: 'Arrow',
            slot: 'primary',
            cooldown: 0.5,
            resourceCost: 0,
            resourceType: Resource.Mana,
            maxRange: 100,
            speed: 30,

            damage: 25,
            modelUri: 'models/projectiles/arrow.gltf',
            modelScale: 0.6,
            projectileRadius: 0.2,
            knockback: 0.5,
            gravityScale: 0.5,
            hitFX: ParticleFX.CLOUD_PUFF,
            useSFX: {
                uri: 'audio/sfx/player/Fantasy_Game_Attack_Bow_A.wav',
                referenceDistance: 15,
                volume: 0.8
            },
            hitSFX: {
                uri: 'audio/sfx/player/bow-hit.mp3',
                volume: 0.5,
                referenceDistance: 15
            },
            chargeStartSFX: {
                uri: 'audio/sfx/player/Bow string drawing fast 1.wav',
                volume: 0.8,
                referenceDistance: 8
            },

            charging: {
                minChargeTime: 0.0,
                maxChargeTime: 0.8,


                chargeEffects: {
                    speed: {
                        min: 18,
                        max: 30
                    },
                    damage: {
                        min: 20,
                        max: 60
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

        const bombOptions: PhysicsProjectileOptions = {
            name: 'Bomb',
            slot: 'secondary',
            cooldown: 0.9,
            resourceCost: 35,
            resourceType: Resource.Mana,
            maxRange: -1,
            speed: 15,

            damage: 15,
            modelUri: 'models/items/bomb.gltf',
            modelScale: 0.6,
            projectileRadius: 0.3,
            knockback: 0.8,
            gravityScale: 0.6,
            hitFX: ParticleFX.EXPLOSION,
            noHitOnBlockCollision: true,
            lifeTime: 1.5,
            useImpulse: {
                direction: 'backward',
                force: 5,
                useAimDirection: true
            },
            useSFX: {
                uri: 'audio/sfx/player/player-swing-woosh.mp3',
                volume: 0.8
            },
            hitSFX: {
                uri: 'audio/sfx/fire/Fire Spell 18.wav',
                volume: 0.8,
                referenceDistance: 20
            },
            aoe: {
                radius: 3.5,
                damage: 20,
                knockback: 15.5,
                falloff: true,
            },
        };

        this.addAbility('secondary', new PhysicsProjectileAbility(bombOptions, this.eventRouter, this));


        // TODO: Add roll ability
        /*
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
    */
    }

    public spawnClassItems() {
        this.bowEntity = new Entity({
            name: 'bow',
            modelUri: 'models/items/bow.gltf',
            parent: this.attachedEntity!,
            modelScale: 1.1,
            parentNodeName: 'hand_right_anchor',
        });
        this.bowEntity.spawn(
            world,
            { x: 0.0, y: 0.0, z: 0.1 },
            Quaternion.fromEuler(0, 0, 5)
        );
    }

    public destroyClassItems() {
        this.bowEntity?.despawn();
        this.bowEntity = undefined;
    }


    tick(entity: PlayerEntity, input: PlayerInput, deltaTimeMs: number) {

        const abilityPrimary = this._abilities.get('primary') as PhysicsProjectileAbility;
        const abilitySecondary = this._abilities.get('secondary') as PhysicsProjectileAbility;

        const myController = entity.controller! as AbilityEntityController;
        const damageableEntity = entity  as DamageableEntity;

        this.updateAbilitiesInput(entity, abilityPrimary, abilitySecondary, input);

        // GLide a bit when charging
        if (abilityPrimary.getIsCharging() && !myController.isGrounded && entity.linearVelocity.y < 0.05) {

            entity.applyImpulse(new Vector3(0, 0.25, 0));
        }

        // Tripple Jump code
        if (input.sp && !myController.isJumping && this.jumpCount < 3) {


            const staminaCost = 5 * this.jumpCount; // stamina per jump
            if (damageableEntity.stamina < staminaCost) { return; }
            // Apply flying velocity
            if(this.jumpCount == 0) {
                entity.setLinearVelocity(new Vector3(entity.linearVelocity.x, this.jumpVelocity, entity.linearVelocity.z));
            }
            else {
                entity.setLinearVelocity(new Vector3(entity.linearVelocity.x, 1, entity.linearVelocity.z));
                entity.applyImpulse(new Vector3(0, 13, 0));
            }

            damageableEntity.useStamina(staminaCost);
            this.jumpCount++;

            input.sp = false;
        }
        else if (myController.isGrounded) {
            this.jumpCount = 0;
        }


    }





    private handleRoll(origin: Vector3Like, direction: Vector3Like, source: Entity) {
        if (source.linearVelocity.x === 0 && source.linearVelocity.z === 0) return;


        const directionVector = new Vector3(source.linearVelocity.x, 1, source.linearVelocity.z);
        directionVector.normalize().scale(15);
        source.setLinearVelocity(directionVector);
    }
} 