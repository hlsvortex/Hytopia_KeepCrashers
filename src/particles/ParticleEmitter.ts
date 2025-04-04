import { ColliderShape, CollisionGroup, Entity, EntityEvent, Vector3, World } from "hytopia";
import type { RgbColor, Vector3Like, QuaternionLike } from "hytopia";
import { RigidBodyType } from "hytopia";
import { world } from "../GlobalContext";
//import { Signal } from "hytopia";


interface ParticleOptions {
    velocity: Vector3Like;
    color: RgbColor;
    size: number;
    sizeRandomness?: number; // 0-1 (0 = no randomness, 1 = ±100% variation)
    lifetime: number;
    lifetimeRandomness?: number; // 0-1 (0 = no randomness, 1 = ±100% variation)
    //blockTextureUri: string;
    modelUri: string;
    gravityScale: number;
}

export interface EmitterOptions {
    count: number;
    speed: number;
    particleOptions: Omit<ParticleOptions, 'velocity'> & {
        size: number;
        sizeRandomness?: number;
    };
    spawnOptions?: {
        radius: number;
        shellOnly?: boolean;
        useSpawnDirectionForVelocity?: boolean;
        velocityRandomness?: number;
        direction?: Vector3Like;
    };
}

class Particle extends Entity {
    velocity: Vector3;
    lifetime: number;
    age: number = 0;
    private color: RgbColor;

    constructor(options: ParticleOptions) {
        // Calculate final size with randomness
        const sizeVariation = 1 + (Math.random() * 2 - 1) * (options.sizeRandomness ?? 0);
        const finalSize = options.size * sizeVariation;
        
        super({
            //blockTextureUri: options.blockTextureUri,
            //blockHalfExtents: { x: options.size, y: options.size, z: options.size }, 
            modelUri: options.modelUri,
            modelScale: finalSize,
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC,
                gravityScale: options.gravityScale,
                linearVelocity: options.velocity,
                colliders: [
                    {
                        shape: ColliderShape.BALL,
                        radius: 0.1,
                        isSensor: true,
                    }
                ]
            }
        });
        this.velocity = Vector3.fromVector3Like(options.velocity);
        this.lifetime = options.lifetime;
        this.color = options.color;  // Store color for later

        this.setCollisionGroupsForSolidColliders({
            belongsTo: [CollisionGroup.GROUP_1],
            collidesWith: [
                CollisionGroup.GROUP_2,
            ],
        });

        
    }

    update(deltaTime: number) {
        this.age += deltaTime;
        // Convert position to Vector3 to use add method
        const currentPos = Vector3.fromVector3Like(this.position);
        currentPos.add(Vector3.fromVector3Like(this.velocity).scale(deltaTime));
        // Update position
        this.setPosition(currentPos);
        //this.velocity.y -= 9.81 * deltaTime;
    }

    spawn(world: World, position: Vector3Like, rotation?: QuaternionLike) {
        super.spawn(world, position, rotation);

        //this.setTintColor(this.color);  // Set color after spawning
    }
}

export class ParticleEmitter extends Entity {
    private readonly particleTextureUri: string = 'blocks/sand.png';
    private particles: Particle[] = [];
    private emitterLifetime: number = 0;
    private maxLifetime: number;
    
    constructor(private readonly options: EmitterOptions) {
        super({ 
            modelUri: 'models/particles/empty.gltf',
            //blockHalfExtents: { x: 0.01, y: 0.01, z: 0.01 },
            modelScale: 0.1,
            opacity: 0.0,
            rigidBodyOptions: { //
                
                colliders: [ // Array of collider options, results in a created collider when spawned
                    {
                        shape: ColliderShape.BALL,
                        radius: 0.1,
                        mass: 1, // if not provided, automatically calculated based on shape volume.
                        bounciness: 10, // very bouncy!
                        relativePosition: { x: 0, y: 0, z: 0 } // acts like an offset relative to the parent. 
                    },
                ]
            }
        });

        this.setCollisionGroupsForSolidColliders({
            belongsTo: [CollisionGroup.GROUP_1],
            collidesWith: [
                CollisionGroup.GROUP_2,
            ],
        });

        //this.setOpacity(0.5);

        // Set max lifetime to the particle lifetime plus a small buffer
        this.maxLifetime = options.particleOptions.lifetime + 0.1;

        // --- ADD THIS LINE TO REGISTER THE TICK LISTENER ---
        this.on(EntityEvent.TICK, this.onTick);
        // --- END ADDED LINE ---
    }

    onTick = (payload: { entity: Entity; tickDeltaMs: number }) => {
        // Use payload.tickDeltaMs
        this.update(payload.tickDeltaMs / 1000);
    }

    public update = (deltaTime: number) => {  // Changed to arrow function to preserve 'this' context
        this.emitterLifetime += deltaTime;

        // Update and remove dead particles
        const initialCount = this.particles.length;
        this.particles = this.particles.filter(particle => {
            if (!particle || !particle.isSpawned) {
                // console.log("Filtering out invalid or despawned particle reference.");
                return false; // Safety check
            }

            particle.update(deltaTime);

            // --- DETAILED LOGGING FOR DESPAWN CHECK ---
            const shouldDespawn = particle.age >= particle.lifetime;
            // Uncomment the next line for verbose logging of every particle's state each tick
            // console.log(`Particle ID: ${particle.id} | Age: ${particle.age.toFixed(3)} | Lifetime: ${particle.lifetime.toFixed(3)} | Should Despawn: ${shouldDespawn}`);

            if (shouldDespawn) {
                particle.despawn();
                // Add a check to see if despawn worked immediately (optional)
                // console.log(`Particle ID: ${particle.id} isSpawned after despawn call: ${particle.isSpawned}`);
                return false; // Remove from array
            }
            // --- END DETAILED LOGGING ---

            return true; // Keep particle
        });

        const removedCount = initialCount - this.particles.length;
        if (removedCount > 0) {
            // console.log(`Particles removed this tick: ${removedCount}. Remaining: ${this.particles.length}`);
        }

        // Check if emitter should be destroyed
        const shouldDestroyEmitter = (this.particles.length === 0 && initialCount > 0) || this.emitterLifetime >= this.maxLifetime;

        if (shouldDestroyEmitter) {
            if (this.particles.length === 0) {
                 // console.log(`Destroying emitter: No particles remaining (Lifetime: ${this.emitterLifetime.toFixed(2)}s)`);
            } else {
                 // console.log(`Destroying emitter: Max lifetime reached (${this.emitterLifetime.toFixed(2)}s >= ${this.maxLifetime}s). ${this.particles.length} particles remaining.`);
            }
            this.destroy();
        }
    }

    public destroy() {
        // Despawn all particles
        this.particles.forEach(particle => particle.despawn());
        this.particles = [];
        this.despawn();
    }

    private getRandomPointInSphere(radius: number, shellOnly: boolean = false): Vector3 {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = shellOnly ? radius : radius * Math.cbrt(Math.random());

        return new Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    }

    public burst() {
        if (!this.isSpawned) return;

        for (let i = 0; i < this.options.count; i++) {
            const spawnOffset = this.options.spawnOptions 
                ? this.getRandomPointInSphere(
                    this.options.spawnOptions.radius, 
                    this.options.spawnOptions.shellOnly
                )
                : new Vector3(0, 0, 0);

            const spawnPos = Vector3.fromVector3Like(this.position).add(spawnOffset);

            // Calculate base velocity
            let baseVelocity: Vector3;
            if (this.options.spawnOptions?.direction) {
                // Use provided direction
                baseVelocity = Vector3.fromVector3Like(this.options.spawnOptions.direction)
                    .normalize()
                    .scale(this.options.speed);
            } else if (this.options.spawnOptions?.useSpawnDirectionForVelocity) {
                // Use spawn offset direction
                baseVelocity = spawnOffset.normalize().scale(this.options.speed);
            } else {
                // Random velocity
                baseVelocity = new Vector3(
                    (Math.random() - 0.5) * 2 * this.options.speed,
                    Math.random() * this.options.speed,
                    (Math.random() - 0.5) * 2 * this.options.speed
                );
            }

            // Apply randomness
            if (this.options.spawnOptions?.velocityRandomness) {
                const randomness = this.options.spawnOptions.velocityRandomness;
                baseVelocity.add(new Vector3(
                    (Math.random() * 2 - 1) * this.options.speed * randomness,
                    (Math.random() * 2 - 1) * this.options.speed * randomness,
                    (Math.random() * 2 - 1) * this.options.speed * randomness
                ));
            }

            // Apply lifetime randomness if specified
            let lifetime = this.options.particleOptions.lifetime;
            if (this.options.particleOptions.lifetimeRandomness) {
                const variation = lifetime * this.options.particleOptions.lifetimeRandomness;
                lifetime += (Math.random() * 2 - 1) * variation;
            }

            const particle = new Particle({
                ...this.options.particleOptions,
                lifetime,
                velocity: baseVelocity
            });
            
            particle.spawn(world, spawnPos);
            this.particles.push(particle);
        }
    }
} 