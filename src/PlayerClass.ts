import { Entity, EventRouter, type PlayerInput, Vector3, type Vector3Like, Quaternion, PlayerEntity, Light } from 'hytopia';
import { AbilityController } from './AbilityController';
import { Resource } from './Resource';
import { PhysicsProjectileAbility } from './abilities/PhysicsProjectileAbility';
import { SelfAbility } from './abilities/SelfAbility';
import { world } from './GlobalContext';
import { ParticleFX } from './particles/ParticleFX';
import type { DamageableEntity } from './DamageableEntity';
import type MyEntityController from './MyEntityController';
import type { Ability } from './Ability';
import { BeamAbility, type BeamAbilityOptions } from './abilities/BeamAbility';
import type { PhysicsProjectileOptions } from './abilities/AbilityOptions';
import type AbilityEntityController from './AbilityEntityController';


export class WizardAbilityController extends AbilityController {
    private bookEntity?: Entity;

    constructor(eventRouter: EventRouter) {
        super(eventRouter);
        this.maxHealth = 150;  // Squishier but mobile
        this.runSpeed = 7;    // Faster run speed
        this.jumpVelocity = 10;  // Higher jumps
    }

    protected setupAbilities() {
        const fireballOptions: PhysicsProjectileOptions = {
            name: 'Fireball',
            slot: 'primary',
            cooldown: 2,
            resourceCost: 15,
            resourceType: Resource.Mana,
            maxRange: 18,
            speed: 21,
            damage: 20,

            modelUri: 'models/projectiles/fireball.gltf',
            modelScale: 0.8,
            projectileRadius: 0.3,
            knockback: 0.8,
            gravityScale: 0.0,
            useImpulse: {
                direction: 'forward',
                force: 8,
                useAimDirection: false
            },
            hitFX: ParticleFX.EXPLOSION,
            aoe: {
                radius: 2,

                damage: 10,
                knockback: 15.5,
                falloff: true,
            },
            icon: 'ui/icons/fireball.png',

            useSFX: {
                uri: 'audio/sfx/fire/Fire Spell 01.wav',
                volume: 0.6
            },
            hitSFX: {
                uri: 'audio/sfx/fire/Fire Spell 18.wav',
                volume: 0.8,
                referenceDistance: 25
            }
        };

        this.addAbility('primary', new PhysicsProjectileAbility(fireballOptions, this.eventRouter, this));

        const teleportOptions = {
            name: 'Teleport',
            slot: 'secondary',
            cooldown: 1,
            resourceCost: 20,
            resourceType: Resource.Mana,
            range: 10,
            distance: 10,

        };
        //this.addAbility('secondary', new SelfAbility(teleportOptions, this.eventRouter, this));

        /*
        const beamOptions: BeamAbilityOptions = {
            name: 'Fire Beam',
            slot: 'secondary',
            cooldown: 0,
            resourceCost: 2,
            resourceType: Resource.Mana,
            useType: 'hold_continuous' as const,
            range: 7,
            damagePerTick: 5,

            tickInterval: 100,
            icon: '{{CDN_ASSETS_URL}}/ui/icons/firebeam.png',
        };

        this.addAbility('secondary', new BeamAbility(beamOptions, this.eventRouter, this));
        */

        const firedartsOptions: PhysicsProjectileOptions = {
            name: 'Firedarts',
            slot: 'secondary',
            cooldown: 0.1,
            resourceCost: 5,
            resourceType: Resource.Mana,
            maxRange: 12,
            speed: 20,
            damage: 3,

            modelUri: 'models/projectiles/firedart.gltf',
            modelScale: 0.3,
            projectileRadius: 0.05,
            knockback: 0.2,
            gravityScale: 0.1,
            hitFX: ParticleFX.FIREHIT,
            useSFX: {
                uri: 'audio/sfx/fire/Fire Spell 02.wav',
                volume: 0.6
                
            },
            hitSFX: {
                uri: 'audio/sfx/fire/fire-ignite.mp3',
                volume: 0.8,
                referenceDistance:10
            },

            icon: 'ui/icons/fireball.png',
        };

        this.addAbility('secondary', new PhysicsProjectileAbility(firedartsOptions, this.eventRouter, this));
    }

    public spawnClassItems() {
        this.bookEntity = new Entity({
            name: 'book',
            modelUri: 'models/items/staff.gltf',
            parent: this.attachedEntity!,
            modelScale: 1.1,
            parentNodeName: 'hand_right_anchor',
        });

        this.bookEntity.spawn(
            world,
            { x: 0.0, y: 0.3, z: 0.3 },
            Quaternion.fromEuler(0, 0, 0)
        );
    }

    public destroyClassItems() {
        this.bookEntity?.despawn();
        this.bookEntity = undefined;
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
            if (damageableEntity.stamina < 5) { return; }
                // Apply flying velocity

            entity.applyImpulse(new Vector3(0, 1, 0));
            damageableEntity.useStamina(manaConsumed);
        }
        // Wizard-specific tick logic
    }
}

export class FighterAbilityController extends AbilityController {
    private swordEntity?: Entity;

    constructor(eventRouter: EventRouter) {
        super(eventRouter);
        this.maxHealth = 200;  // Tankier
        this.runSpeed = 7;     // Slower but stronger
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
            speed: 20,

            damage: 10,
            modelUri: 'models/items/battle-axe.gltf',
            modelScale: 0.6,
            projectileRadius: 0.3,
            knockback: 0.6,
            gravityScale: 0.0,
            hitFX: ParticleFX.CLOUD_PUFF,
            lifeTime: 1.2,
            torque: 1,
            //noHitOnBlockCollision: true,
            //noHitOnEntityCollision: true,
            isSensor: true,
            icon: '{{CDN_ASSETS_URL}}/ui/icons/bomb.png',
            velocityReverse: {
                time: 0.65,        // Reverse after 0.5 seconds
                duration: 0.2,    // Take 0.2 seconds to reverse
                speedMultiplier: 1.2  // Return slightly faster
            },
            multiHit: {
                maxHits: 5,           // Can hit up to 3 targets
                hitCooldown: 0.2      // 0.2s cooldown between hits on same target
            },
            useSFX: {
                uri: 'audio/sfx/player/player-swing-woosh.mp3',
                volume: 0.8,
                referenceDistance: 15
            },

            hitSFX: {
                uri: 'audio/sfx/player/player-swing-woosh.mp3',
                volume: 0.5,
                referenceDistance: 10
            },
        };

        const ChargeSlash: PhysicsProjectileOptions = {
            name: 'Charge-Slash',
            slot: 'secondary',
            cooldown: 0.8,
            resourceCost: 35,
            resourceType: Resource.Mana,
            maxRange: 0.1,
            speed: 15,
            damage: 15,
            modelUri: 'models/projectiles/slash1.gltf',
            modelScale: 0.5,
            projectileRadius: 0.5,
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
                        max: 35
                    },
                    damage: {
                        min: 15,
                        max: 30
                    },
                    size: {
                        min: 0.6,
                        max: 1.3  
                    },
                    impulseForce: {
                        min: -5,
                        max: -12
                    }
                }
            },
            
            useSFX: {
                uri: 'audio/sfx/damage/Sword Woosh 19.wav',
                referenceDistance: 15,
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
                direction: 'forward',
                force: -15,
                useAimDirection: false
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

        this.updateAbilityInput(entity, abilityPrimary, input.ml ?? false);
        this.updateAbilityInput(entity, abilitySecondary, input.mr ?? false);

        const myController = entity.controller as AbilityEntityController;
        const damageableEntity = entity as DamageableEntity;

        if (abilityPrimary.getIsCharging() && !myController.isGrounded && entity.linearVelocity.y < 0.05) {

            entity.applyImpulse(new Vector3(0, 0.25, 0));
        }

        //console.log(input.space);
        if (input.sp) {
   
            if(damageableEntity.stamina < 5) { return; }

            damageableEntity.useStamina(6 * deltaTimeMs/1000);

            if (entity.linearVelocity.y > 4.1) { return; }
            // Apply flying velocity
            entity.applyImpulse(new Vector3(0, 0.45, 0));
            
        
        }
        // Wizard-specific tick logic
    }
}


export class ArcherAbilityController extends AbilityController {
    private bowEntity?: Entity;
    private hasDoubledJumped: boolean = false;
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
            icon: '{{CDN_ASSETS_URL}}/ui/icons/arrow.png',
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
                        min: 16,
                        max: 26
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
            cooldown: 0.8,
            resourceCost: 35,
            resourceType: Resource.Mana,
            maxRange: -1,
            speed: 15,

            damage: 25,
            modelUri: 'models/items/bomb.gltf',
            modelScale: 0.6,
            projectileRadius: 0.3,
            knockback: 0.8,
            gravityScale: 0.6,
            hitFX: ParticleFX.EXPLOSION,
            noHitOnBlockCollision: true,
            lifeTime: 1.5,
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
                damage: 30,
                knockback: 15.5,
                falloff: true,
            },
            icon: '{{CDN_ASSETS_URL}}/ui/icons/bomb.png',
        };

        this.addAbility('secondary', new PhysicsProjectileAbility(bombOptions, this.eventRouter, this));

        
        /*
        const throwSpiritAxeOptions = {
            name: 'Spirit Axe',
            cooldown: 1,
            resourceCost: 20,
            resourceType: Resource.Mana,
            maxRange: 100,
            speed: 30,
            damage: 25,
            modelUri: 'models/items/sword.gltf',
            modelScale: 0.4,
            projectileRadius: 0.1,
            knockback: 0.5,
            gravityScale: 0.5,
            hitFX: ParticleFX.CLOUD_PUFF,
            
            
        };

        const SpiritAxe = new PhysicsProjectileAbility(throwSpiritAxeOptions, this.eventRouter, this);

        this.addAbility('secondary', SpiritAxe);
*/
        
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

        this.updateAbilityInput(entity, abilityPrimary, input.ml ?? false);
        this.updateAbilityInput(entity, abilitySecondary, input.mr ?? false);
        
        const myController = entity.controller as AbilityEntityController;
        const damageableEntity = entity  as DamageableEntity;
        
    
        // GLide a bit when charging
        if (abilityPrimary.getIsCharging() && !myController.isGrounded && entity.linearVelocity.y < 0.05) {

            entity.applyImpulse(new Vector3(0, 0.25, 0));
        }
        
        // Double Jump code
        if (input.sp && !myController.isJumping && this.jumpCount < 3) {


            const staminaCost = 5 * this.jumpCount; // stamina per second
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

const grenadeOptions = {
    lifeTime: 3, // Explode after 3 seconds regardless of distance
    maxRange: -1, // No maximum travel distance
    // ... other options ...
};
