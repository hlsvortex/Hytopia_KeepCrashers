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

export class WizardAbilityController extends AbilityController {
    private bookEntity?: Entity;

    constructor(eventRouter: EventRouter) {
        super(eventRouter);
        this.maxHealth = 150;  // Squishier but mobile
        this.runSpeed = 8;    // Faster run speed
        this.jumpVelocity = 11;  // Higher jumps
    }

    protected setupAbilities() {
        const fireballOptions: PhysicsProjectileOptions = {
            name: 'Fireball',
            slot: 'primary',
            cooldown: 1.0,
            resourceCost: 35,
            resourceType: Resource.Mana,
            maxRange: 19,
            speed: 21,
            damage: 30,

            modelUri: 'models/projectiles/fireball.gltf',
            modelScale: 0.9,
            projectileRadius: 0.3,
            knockback: 0.8,
            gravityScale: 0.0,

            useImpulse: {
                direction: 'backward',
                force: 4,
                useAimDirection: true
            },


            hitFX: ParticleFX.EXPLOSION,
            aoe: {
                radius: 2,

                damage: 10,
                knockback: 15.5,
                falloff: true,
            },
            useSFX: {
                uri: 'audio/sfx/fire/Fire Spell 01.wav',
                volume: 0.6
            },
            hitSFX: {
                uri: 'audio/sfx/fire/Fire Spell 18.wav',
                volume: 0.8,
                referenceDistance: 20
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
            cooldown: 0.2,
            resourceCost: 1,
            resourceType: Resource.Mana,
            maxRange: 12,
            speed: 20,
            damage: 5,

            modelUri: 'models/projectiles/firedart.gltf',
            modelScale: 0.3,
            projectileRadius: 0.05,
            knockback: 0.3,
            gravityScale: 0.1,
            hitFX: ParticleFX.FIREHIT,
            isSensor: true,
            multiHit: {
                maxHits: 3,
                hitCooldown: 0.2
            },
            useSFX: {
                uri: 'audio/sfx/fire/Fire Spell 02.wav',
                volume: 0.6,
                referenceDistance: 10
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

        this.updateAbilitiesInput(entity, abilityPrimary, abilitySecondary, input);

       
        //console.log(input.space);
        if (input.sp) {

            const manaCost = 0.03; // mana per second
            const manaConsumed = manaCost * deltaTimeMs;

            const damageableEntity = entity as DamageableEntity;

            if (entity.linearVelocity.y > 4.1) { return; }
            if (damageableEntity.stamina < 5) { return; }
            // Apply flying velocity

            entity.applyImpulse(new Vector3(0, 1.5, 0));
            damageableEntity.useStamina(manaConsumed);
        }
        // Wizard-specific tick logic
    }
} 