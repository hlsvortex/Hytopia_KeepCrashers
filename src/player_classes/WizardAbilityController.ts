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
import * as math from '../utils/math';
import { BeamAbility, type BeamAbilityOptions } from '../abilities/BeamAbility';

export class WizardAbilityController extends AbilityController {
    private bookEntity?: Entity;
	private jumpCount: number = 0;

    constructor(eventRouter: EventRouter) {
        super(eventRouter);
        this.maxHealth = 160;  // Squishier but mobile
        this.runSpeed = 6.5;    // Faster run speed
        this.jumpVelocity = 12;  // Higher jumps
		this.useCustomJump = true;
    }

    protected setupAbilities() {
        const fireballOptions: PhysicsProjectileOptions = {
            name: 'Fireball',
            slot: 'primary',
            cooldown: 1.0,
            resourceCost: 25,
            resourceType: Resource.Mana,
            maxRange: 25,
            speed: 45,
            damage: 30,

            modelUri: 'models/projectiles/fireball.gltf',
            modelScale: 1.1,
            projectileRadius: 0.4,
            knockback: 0.8,
            gravityScale: 0.0,

            useImpulse: {
                direction: 'backward',
                force: 3,
                useAimDirection: true
            },


            hitFX: ParticleFX.EXPLOSION,
            aoe: {
                radius: 2.3,

                damage: 20,
                knockback: 15.5,
                falloff: true,
            },
            useSFX: {
                uri: 'audio/sfx/fire/Fire Spell 01.wav',
                volume: 0.6,
				referenceDistance: 8
            },
            hitSFX: {
                uri: 'audio/sfx/fire/Fire Spell 18.wav',
                volume: 0.8,
                referenceDistance: 8
            }
        };

        this.addAbility('primary', new PhysicsProjectileAbility(fireballOptions, this.eventRouter, this));

		/*
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
		*/

        
        const beamOptions: BeamAbilityOptions = {
            name: 'Fire Beam',
            slot: 'secondary',
            cooldown: 0,
            resourceCost: 2,
            resourceType: Resource.Mana,
            useType: 'hold_continuous' as const,
            range: 7,
            damagePerTick: 0.1,

            tickInterval: 100,
            icon: '{{CDN_ASSETS_URL}}/ui/icons/firebeam.png',
        };

        //this.addAbility('secondary', new BeamAbility(beamOptions, this.eventRouter, this));
        
        const firedartsOptions: PhysicsProjectileOptions = {
            name: 'Firedarts',
            slot: 'secondary',
            cooldown: 0.1,
            resourceCost: 1,
            resourceType: Resource.Mana,
            maxRange: 20,
            speed: 50,
            damage: 4,
			destroyOnBlockCollision: true,
            modelUri: 'models/projectiles/firedart.gltf',
            modelScale: 0.4,
            projectileRadius: 0.2,
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
                referenceDistance: 8
            },
            hitSFX: {
                uri: 'audio/sfx/fire/fire-ignite.mp3',
                volume: 0.8,
                referenceDistance:8
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
        const myController = entity.controller! as AbilityEntityController;
        const damageableEntity = entity as DamageableEntity;

        this.updateAbilitiesInput(entity, abilityPrimary, abilitySecondary, input);

        // Check if the space key is pressed
        if (input.sp) {
            // If the player is not jumping and can jump
            if (!myController.isJumping && this.jumpCount < 2) {
                // Apply initial jump velocity
                if (this.jumpCount == 0) {
                    entity.setLinearVelocity(new Vector3(entity.linearVelocity.x, this.jumpVelocity, entity.linearVelocity.z));
                    input.sp = false; // Reset input
                    entity.setGravityScale(1.0);
                    this.jumpCount = 1;
                } else {
                    const manaCost = 0.01; // mana per second
                    const manaConsumed = manaCost * deltaTimeMs;

                    if (damageableEntity.stamina < 5) {
                        entity.setGravityScale(1.0);
                        return;
                    }

                    // Use stamina for flying
                    damageableEntity.useStamina(manaConsumed);

                    const facingDirection = Vector3.fromVector3Like(entity.player.camera.facingDirection).normalize();
                    const strafeDirection = new Vector3(0, 0, 0);

                    // Check for strafing input
                    if (input.a) {
                        strafeDirection.x = -1; // Move left
                    } else if (input.d) {
                        strafeDirection.x = 1; // Move right
                    }

                    // Check for forward/backward input
                    let forwardMovement = 0;
                    if (input.w) {
                        forwardMovement = 1; // Move forward
                    } else if (input.s) {
                        forwardMovement = -1; // Move backward
                    }

                    // Calculate the desired horizontal velocity
                    const impulseForce = 10.4;
                    const horizontalVelocity = new Vector3(
                        (facingDirection.x * forwardMovement + strafeDirection.x) * impulseForce,
                        0, // No vertical movement when hovering
                        (facingDirection.z * forwardMovement + strafeDirection.z) * impulseForce
                    );

                    // If moving forward or backward, allow vertical movement based on the camera's facing direction
                    if (forwardMovement !== 0) {
                        horizontalVelocity.y = facingDirection.y * impulseForce; // Apply vertical movement based on camera's Y direction
                    } else {
                        horizontalVelocity.y = 0.1; // Maintain some upward lift when hovering
                    }

                    // Limit the velocity
                    const limitedVelocity = this.limitVelocity(horizontalVelocity, 11); // Set your max velocity here

                    // Lerp the movement for smooth transition
                    const velocity = Vector3.fromVector3Like(entity.linearVelocity);
                    const lerpFactor = 0.1; // Adjust this value for smoother or snappier movement
                    const newVelocity = velocity.lerp(limitedVelocity, lerpFactor);

                    //entity.setLinearVelocity(newVelocity);
					entity.setLinearVelocity(newVelocity);
					
					entity.setGravityScale(0.01); // Reduce gravity while flying
                }
            }
        } else if (myController.isGrounded) {
            this.jumpCount = 0;
            entity.setGravityScale(1.0);
        } else {
            entity.setGravityScale(1.0);
        }
    }

	limitVelocity(velocity: Vector3, maxVelocity: number): Vector3 {
		const currentMagnitude = velocity.magnitude;

		// Check if the current magnitude exceeds the maximum allowed velocity
		if (currentMagnitude > maxVelocity) {
			// Calculate the scale factor to limit the velocity
			const scale = maxVelocity / currentMagnitude;

			// Scale the velocity components
			return new Vector3(
				velocity.x * scale,
				velocity.y * scale,
				velocity.z * scale
			);
		}

		// Return the original velocity if it's within the limit
		return velocity;
	}

} 