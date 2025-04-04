import { Entity, EventRouter, Vector3, type Vector3Like, RigidBodyType, ColliderShape, CollisionGroup, BlockType, type QuaternionLike, PlayerEntity, EntityEvent } from 'hytopia';
import { Ability } from '../Ability';
import { type PhysicsProjectileOptions } from './AbilityOptions';
import { DamageableEntity } from '../DamageableEntity';
import { faceDirection, getRotationFromDirection } from '../utils/math';
import { world } from '../GlobalContext';
import { ParticleEmitter } from '../particles/ParticleEmitter';
import { ParticleFX } from '../particles/ParticleFX';
import { Collider } from 'hytopia';
import type { AbilityController } from '../AbilityController';


export class PhysicsProjectileAbility extends Ability {
    constructor(
        public options: PhysicsProjectileOptions,
        eventRouter: EventRouter,
        abilityController: AbilityController
    ) {
        super(options, eventRouter, abilityController);
    }

    private hitCount = 0;
    private staticVelocity = new Vector3(0, 0, 0);
    private useDirection: Vector3Like = new Vector3(0, 0, 0);
    private hitABlock = false;

	private sourcePosition: Vector3 = new Vector3(0, 0, 0);
	private returnDirection: Vector3Like = new Vector3(0, 0, 0);

    use(origin: Vector3Like, direction: Vector3Like, source: Entity) {
        if (!source.world) return;

        const chargeLevel = this.endCharge(); // Get final charge level and reset charging state
        this.hitCount = 0;
        this.useDirection = Vector3.fromVector3Like(direction).normalize();
        this.hitABlock = false;

        // Apply charge effects
        let { speed, damage, gravityScale } = this.getChargedValues(chargeLevel);
        let size = 0;
        let effects = null;


        if (this.options.charging?.chargeEffects) {
            effects = this.options.charging.chargeEffects;
            
            if (effects.speed) {
                speed = this.getChargedValue(chargeLevel, effects.speed.min, effects.speed.max);
            }
            if (effects.damage) {
                damage = this.getChargedValue(chargeLevel, effects.damage.min, effects.damage.max);
            }
            if (effects.gravity) {
                gravityScale = this.getChargedValue(chargeLevel, effects.gravity.min, effects.gravity.max);
            }
            if (effects.size) {
                size = this.getChargedValue(chargeLevel, effects.size.min, effects.size.max);
            }
        }

        

        let impulseForce = this.options.useImpulse?.force ?? 0;
        
        // Apply charge effects to impulse force if configured
        if (this.options.charging?.chargeEffects?.impulseForce) {

            impulseForce = this.getChargedValue(
                chargeLevel,
                this.options.charging.chargeEffects.impulseForce.min,
                this.options.charging.chargeEffects.impulseForce.max
            );
        }

        // Store original force
        const originalForce = this.options.useImpulse?.force;
        if (this.options.useImpulse) {
            this.options.useImpulse.force = impulseForce;
        }

        // Normalize and scale direction vector
        const directionVector = new Vector3(direction.x, direction.y, direction.z).normalize();
        const velocityVector = directionVector.scale(speed);

        this.staticVelocity = velocityVector;
        const projectile = new Entity({
            name: `${this.options.name} Projectile`,
            modelUri: this.options.modelUri,
            modelScale: this.options.modelScale + size,
            rigidBodyOptions: {

                type: RigidBodyType.DYNAMIC,
                linearVelocity: velocityVector,
                gravityScale: gravityScale,
                
            },

        });

        let age = 0;
        let maxLifetime = this.options.lifeTime; // Use lifetime if specified
        if (typeof maxLifetime === 'undefined') {
            if (this.options.maxRange === -1) {
                maxLifetime = Infinity; // No range limit and no lifetime = never expire
            } else {
                maxLifetime = this.options.maxRange / speed; // Default range-based lifetime
            }
        }

        
        projectile.on(EntityEvent.TICK, (payload: { entity: Entity, tickDeltaMs: number }) => {
            // Custom tick handler if provided
            if (this.options.onProjectileTick) {
                this.options.onProjectileTick(payload.entity, payload.tickDeltaMs);
            }

            // Update age in seconds
            age += payload.tickDeltaMs / 1000;
            
            if(this.options.velocityReverse  ) {

                if (age > this.options.velocityReverse.time) {

					this.staticVelocity = new Vector3(
						this.useDirection.x * -1 * this.options.speed,
						this.useDirection.y * -1 * this.options.speed,
						this.useDirection.z * -1 * this.options.speed
					);
                }

                else {
                    if(!this.hitABlock) {
                        this.staticVelocity = new Vector3(
                            this.useDirection.x * 1 * this.options.speed,
                            this.useDirection.y * 1 * this.options.speed,
                            this.useDirection.z * 1 * this.options.speed
                        );
                    }
                    else {
                        this.staticVelocity = new Vector3(0,0,0);
                    }

					this.returnDirection = this.staticVelocity;
					
                }

				payload.entity.setLinearVelocity(this.staticVelocity);
            }

           const currentVelocity = payload.entity.linearVelocity;


            // Check if the projectile is moving (non-zero velocity)
            if (currentVelocity.x !== 0 || currentVelocity.y !== 0 || currentVelocity.z !== 0) {

                if(this.options.faceVelocity) {
                    // Set the projectile's rotation
                    projectile.setRotation(faceDirection(currentVelocity));
                }
            }
            
            // Despawn if exceeded lifetime
            if (age >= maxLifetime) {
                this.projectileEnd(projectile, source);
            }
        });	

        // Calculate scaled radius independently
        const baseRadius = this.options.projectileRadius;
        const scaleFactor = size > 0 ? (1 + size/this.options.modelScale) : 1;
        const finalRadius = baseRadius * scaleFactor;

        projectile.createAndAddChildCollider({
            shape: ColliderShape.BLOCK,
            halfExtents: { x: finalRadius, y: finalRadius, z: finalRadius },
            isSensor: this.options.isSensor ?? false,
            friction: 0.1,
            bounciness: 1,
            

            collisionGroups: {
                belongsTo: [CollisionGroup.ENTITY],
                collidesWith: [CollisionGroup.PLAYER, CollisionGroup.BLOCK, CollisionGroup.ENTITY],
            },
            
            onCollision: (otherEntity: Entity | BlockType, started: boolean) => {
                if (!started) return;
                if (otherEntity == source) return;
				
				// console.log(`Projectile collided with: ${otherEntity.name}`);

                if (otherEntity instanceof BlockType) {
                    const collisionPos = projectile.position; // Get projectile world position at collision
                    
                    // Calculate integer block coordinates using Math.floor
                    const blockX = Math.floor(collisionPos?.x ?? 0);
                    const blockY = Math.floor(collisionPos?.y ?? 0);
                    const blockZ = Math.floor(collisionPos?.z ?? 0);

                    // Log both world and block coordinates
                    console.log(`Projectile collided with BlockType`);
                    console.log(`  World Coords: X=${collisionPos?.x?.toFixed(2) ?? 'N/A'}, Y=${collisionPos?.y?.toFixed(2) ?? 'N/A'}, Z=${collisionPos?.z?.toFixed(2) ?? 'N/A'}`);
                    console.log(`  Block Coords: iX=${blockX}, iY=${blockY}, iZ=${blockZ}`);
                }

                if (this.options.noHitOnBlockCollision && otherEntity instanceof BlockType) {
                    return;
                }

                if (this.options.noHitOnEntityCollision && otherEntity instanceof PlayerEntity) {
                    return;
                }


		

                if (this.options.onCollision) {
                    this.options.onCollision(source, otherEntity);
                }
                else if (otherEntity instanceof DamageableEntity && !otherEntity.isDead()) {

                    otherEntity.takeDamage(damage, source as DamageableEntity);
                    otherEntity.applyImpulse(velocityVector.scale(this.options.knockback));
                    if (otherEntity instanceof DamageableEntity) {
                        this.spawnEffect(new ParticleEmitter(ParticleFX.BLOODHIT), otherEntity.position as Vector3);
                    }   


                    this.hitCount++;

                    //console.log(`Hit count: ${this.hitCount}`);
                    //console.log(`Max hits: ${this.options.multiHit?.maxHits}`);

                    if (this.options.multiHit) {
                        
                        if(this.hitCount >= this.options.multiHit.maxHits) {
                            this.projectileEnd(projectile, source);
                        }
                    }
                    else {
                        this.projectileEnd(projectile, source);
                    }
                }
                else {
                    this.hitABlock = true;
                    
					
					if (!this.options.multiHit || this.options.destroyOnBlockCollision) {
                        this.projectileEnd(projectile, source);
                    }


                }
                    
				/*
                world.emit('ProjectileHit', {
                    type: source.name,
                    source,
                    target: otherEntity instanceof Entity ? otherEntity : undefined,
                    damage: this.options.damage
                });
                */
                //projectile.despawn();
            }
        });
       
        projectile.spawn(source.world, origin);

		projectile.setRotation(faceDirection(this.useDirection));
       
        if (this.options.torque) {
            
            const rightVector = new Vector3(
                -this.useDirection.z,
                0,
                this.useDirection.x
            ).normalize();

            projectile.addTorque(rightVector.scale(this.options.torque));
        }


        if (this.options.useFX) {
            this.spawnEffect(new ParticleEmitter(this.options.useFX), origin);
        }

        this.playUseSound(source);
       
        this.applyUseImpulse(source, direction);

        // Restore original force
        if (this.options.useImpulse && originalForce !== undefined) {
            this.options.useImpulse.force = originalForce;
        }
    }

    private projectileEnd(projectile: Entity, source: Entity) {

        // Handle AOE damage with collider
        this.handleAOEDamage(projectile.position as Vector3Like, source as DamageableEntity);

        // Visual effects
        if (this.options.hitFX) {
            this.spawnEffect(new ParticleEmitter(this.options.hitFX), projectile.position as Vector3);
        }

        this.playHitSound(projectile.position);
        
		if (projectile !== undefined && projectile.isSpawned) {
			projectile.despawn();
		}
    }

    private handleAOEDamage(position: Vector3Like, source: DamageableEntity) {
        if (!this.options.aoe) return;

        
        // Create a spherical collider for AOE detection
        const aoeCollider = new Collider({
            shape: ColliderShape.BALL,
            radius: this.options.aoe.radius,
            isSensor: true,
            relativePosition: position,
            onCollision: (other: Entity | BlockType, started: boolean) => {
                if (!started) return;

                // Skip if not a damageable entity or already dead
                if (!(other instanceof DamageableEntity) || other.isDead()) return;

                let damage = this.options.aoe!.damage;
                let knockback = this.options.aoe!.knockback ?? 0;

                if (this.options.aoe!.falloff) {
                    // Calculate distance-based falloff
                    const distance = Vector3.fromVector3Like(position).distance(Vector3.fromVector3Like(other.position));
                    const falloffFactor = 1 - (distance / this.options.aoe!.radius);
                    damage *= Math.max(0, falloffFactor); // Ensure non-negative
                    knockback *= falloffFactor;
                }

                // Apply damage and knockback
                other.takeDamage(damage, source);
                
                if (other instanceof DamageableEntity) {
                    this.spawnEffect(new ParticleEmitter(ParticleFX.BLOODHIT), other.position as Vector3);
                }   

                if (knockback > 0) {
                    const direction = Vector3.fromVector3Like(other.position)
                        .subtract(Vector3.fromVector3Like(position))
                        .normalize();
                    other.applyImpulse(direction.scale(knockback));
                }
            }
        });

        // Add collider to simulation
        aoeCollider.addToSimulation(world.simulation);

        // Remove collider after a short delay
        setTimeout(() => {
            aoeCollider.removeFromSimulation();
        }, 100); // 100ms should be enough to detect all collisions
    }

    public spawnEffect(effect: ParticleEmitter, position: Vector3Like) {
        
        effect.spawn(world, position);
        effect.burst();

        //(() => effect.destroy(), effect.particleOptions.lifetime * 1000);
    }


    private getChargedValues(chargeLevel: number) {
        let speed = this.options.speed;
        let damage = this.options.damage;
        let gravityScale = this.options.gravityScale ?? 1;

        if (this.options.charging?.chargeEffects) {
            const { speed: s, damage: d, gravity: g } = this.options.charging.chargeEffects;
            if (s) speed = this.getChargedValue(chargeLevel, s.min, s.max);
            if (d) damage = this.getChargedValue(chargeLevel, d.min, d.max);
            if (g) gravityScale = this.getChargedValue(chargeLevel, g.min, g.max);
        }

        return { speed, damage, gravityScale };
    }

    
} 