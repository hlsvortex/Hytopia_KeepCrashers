import { Entity, World, Vector3, type Vector3Like, EntityEvent, type RgbColor, ColliderShape, CollisionGroup, RigidBodyType, type QuaternionLike } from 'hytopia';
import type { ParticlePool } from './ParticlePool';

export interface EmitterOptions {
    name: string;
    count: number;
    speed: number;
    spawnOptions?: {
        radius: number;
        shellOnly?: boolean;
        direction?: Vector3Like;
        useSpawnDirectionForVelocity?: boolean;
        velocityRandomness?: number;
    };
    particleOptions: {
        color?: RgbColor;
        size: number;
        sizeRandomness?: number;
        lifetime: number;
        lifetimeRandomness?: number;
        modelUri: string;
        gravityScale?: number;
    };
}

interface SingleParticleOptions {
    modelUri: string;
    size: number;
    sizeRandomness?: number;
    lifetime: number;
    velocity: Vector3Like;
    gravityScale?: number;
    color?: RgbColor;
}

class Particle extends Entity {
    velocity: Vector3;
    lifetime: number;
    age: number = 0;
    private color: RgbColor | undefined;
    private creationTime: number;

    constructor(options: SingleParticleOptions) {
        const sizeVariation = 1 + (Math.random() * 2 - 1) * (options.sizeRandomness ?? 0);
        const finalSize = Math.max(0.01, options.size * sizeVariation);
        
        super({
            modelUri: options.modelUri,
            modelScale: finalSize,
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC, // Keep dynamic for movement
                gravityScale: options.gravityScale ?? 1.0,
                linearVelocity: options.velocity,
                colliders: [
                    {
                        shape: ColliderShape.BALL, // Simplest shape for performance
                        radius: finalSize * 0.2, // Smaller radius than visual size
                        isSensor: true, // Non-solid
                        friction: 0, // No friction
                        bounciness: 0, // No bouncing
                        // Limit what these particles can collide with to improve performance
                        collisionGroups: {
                            belongsTo: [CollisionGroup.ENTITY],
                            collidesWith: [], // Empty to prevent collision checks
                        }
                    }
                ]
            }
        });
        this.velocity = Vector3.fromVector3Like(options.velocity);
        this.lifetime = Math.max(0.1, options.lifetime);
        this.color = options.color;
        this.creationTime = Date.now();
        this.age = 0;
    }

    update(deltaTime: number): void {
        // Calculate age since creation to avoid accumulated deltaTime issues
        const now = Date.now();
        const ageInMs = now - this.creationTime;
        this.age = ageInMs / 1000; // Convert to seconds
    }

    spawn(world: World, position: Vector3Like, rotation?: QuaternionLike): void {
        super.spawn(world, position, rotation);
        if (this.color) {
           // this.setTintColor(this.color);
        }
        // Reset creation time when spawned
        this.creationTime = Date.now();
        this.age = 0;
    }
}

export class ParticleEmitter extends Entity {
    private particles: Particle[] = [];
    private emitterLifetime: number = 0;
    private maxLifetime: number;
    private tickListener: { disconnect: () => void } | undefined;
    private active: boolean = false;
    public pool: ParticlePool | undefined;
    public options: EmitterOptions;
    private lifetimeTimer: any;
    
    constructor(options: EmitterOptions) {
        super({ 
            name: `emitter-${options.name}`,
            modelUri: 'models/particles/empty.gltf',
			modelScale: 0.01,
			opacity: 0.0,
            // Explicitly set rigidBody options to prevent default collider creation
            rigidBodyOptions: {
                type: RigidBodyType.FIXED, // FIXED for immovable object with no physics
                // No colliders for the emitter itself
            }
        });
        this.options = options;
        const baseLifetime = options.particleOptions.lifetime;
        const randomPart = (options.particleOptions.lifetimeRandomness ?? 0) * baseLifetime;
        this.maxLifetime = baseLifetime + randomPart + 1.5;
    }

    public spawnEmitter(world: World, position: Vector3Like): void {
        if (!this.isSpawned) {
            super.spawn(world, position);
        } else {
            this.setPosition(position);
        }
        this.tickListener?.disconnect();
        this.tickListener = this.on(EntityEvent.TICK, this.onTick.bind(this)) as unknown as { disconnect: () => void };
        this.reinitialize(position);
    }

    public reinitialize(position: Vector3Like): void {
        if (!this.isSpawned && this.world) {
            console.warn("Reinitializing emitter that wasn't spawned. Spawning at:", position);
            this.spawnEmitter(this.world, position);
        } else if (this.isSpawned) {
            this.setPosition(position);
        } else {
             console.error("Cannot reinitialize emitter: not spawned and no world context.");
             return;
        }

        this.emitterLifetime = 0;
        this.clearExistingParticles();
        this.clearTimers();
        this.setActive(true);

        this.burstInternal();

        if (this.options.count > 0) {
            this.lifetimeTimer = setTimeout(() => {
                this.returnToPool();
            }, this.maxLifetime * 1000) as any;
        }
    }

    public setActive(active: boolean): void {
        if (this.active === active) return;
        this.active = active;

        if (!active) {
            this.clearTimers();
            if (this.isSpawned) {
                this.setPosition(new Vector3(0, -1000, 0));
                this.setLinearVelocity({ x: 0, y: 0, z: 0 });
            }
            if (this.tickListener) {
                this.tickListener.disconnect();
                this.tickListener = undefined;
            }
        } else {
            if (!this.tickListener && this.world) {
                this.tickListener = this.on(EntityEvent.TICK, this.onTick.bind(this)) as unknown as { disconnect: () => void };
            }
        }
    }

    private onTick({ tickDeltaMs }: { entity: Entity; tickDeltaMs: number }): void {
        if (!this.active || !this.isSpawned || !this.world) return;

        const deltaTime = tickDeltaMs / 1000;
        this.emitterLifetime += deltaTime;

        let activeParticlesExist = false;
        const initialParticleCount = this.particles.length; // Store count before filtering

        // console.log(`Emitter ${this.id} Tick Start: EmitterAge=${this.emitterLifetime.toFixed(3)}, InitialParticles=${initialParticleCount}`); // Optional: Log emitter state

        this.particles = this.particles.filter(particle => {
            if (!particle || !particle.isSpawned) {
                // console.log(`Emitter ${this.id}: Filtering out already despawned particle.`);
                return false;
            }
            particle.update(deltaTime); // Updates age

            // Log particle state *before* despawn check
            // console.log(`Emitter ${this.id} Particle ${particle.id}: Age=${particle.age.toFixed(3)}, Lifetime=${particle.lifetime.toFixed(3)}`);

            if (particle.age >= particle.lifetime) {
                if (particle.isSpawned) particle.despawn();
                return false; // Remove
            }
            activeParticlesExist = true; // Mark that at least one particle is still alive this tick
            return true; // Keep
        });

        const finalParticleCount = this.particles.length;

        // Log if particles were removed this tick
        // if (initialParticleCount !== finalParticleCount) {
        //     console.log(`Emitter ${this.id}: Tick removed ${initialParticleCount - finalParticleCount} particles. Remaining: ${finalParticleCount}. ActiveParticlesExist flag: ${activeParticlesExist}`);
        // }

        // Early return check
        if (this.options.count > 0 && !activeParticlesExist && this.particles.length === 0) {
             // Make sure we are still active before returning (prevent race condition with timeout)
             if (this.active) { 
                 // Log the exact state causing the early return
                 this.returnToPool();
             }
        }
    }

    private burstInternal(): void {
        if (!this.isSpawned || !this.world) {
            console.error("Cannot burst: Emitter not spawned or no world context.");
            return;
        }

        // Limit max particles per burst to prevent physics overload
        const maxParticlesPerBurst = Math.min(this.options.count, 20);
        
        // Stagger creation of particles over multiple frames if needed for performance
        // but only for very high particle counts (above 20)
        if (this.options.count > maxParticlesPerBurst) {
            // Create max particles now
            this.createParticleBatch(maxParticlesPerBurst);
            
            // Schedule remaining particles over next few frames
            const remainingParticles = this.options.count - maxParticlesPerBurst;
            
            // Create a small batch each frame until done
            let created = maxParticlesPerBurst;
            const batchSize = 5; // Create 5 particles per frame
            
            const createNextBatch = () => {
                if (created >= this.options.count || !this.active) return; // Stop if emitter was deactivated
                
                const nextBatchSize = Math.min(batchSize, this.options.count - created);
                this.createParticleBatch(nextBatchSize);
                created += nextBatchSize;
                
                if (created < this.options.count) {
                    // Continue with next batch next frame
                    requestAnimationFrame(createNextBatch);
                }
            };
            
            // Start staggered creation next frame
            requestAnimationFrame(createNextBatch);
        } else {
            // Create all at once for small counts
            this.createParticleBatch(this.options.count);
        }
    }
    
    // Helper to create a batch of particles
    private createParticleBatch(count: number): void {
        if (!this.isSpawned || !this.world) return;
        
        for (let i = 0; i < count; i++) {
            const spawnOffset = this.options.spawnOptions
                ? this.getRandomPointInSphere(this.options.spawnOptions.radius, this.options.spawnOptions.shellOnly)
                : new Vector3(0, 0, 0);
                
            const spawnPos = Vector3.fromVector3Like(this.position).add(spawnOffset);
            let baseVelocity = this.calculateBaseVelocity(spawnOffset);
            
            if (this.options.spawnOptions?.velocityRandomness) {
                baseVelocity = this.applyVelocityRandomness(baseVelocity);
            }
            
            let lifetime = this.options.particleOptions.lifetime;
            if (this.options.particleOptions.lifetimeRandomness) {
                lifetime = this.applyLifetimeRandomness(lifetime);
            }

            const singleParticleOpts: SingleParticleOptions = {
                modelUri: this.options.particleOptions.modelUri,
                size: this.options.particleOptions.size,
                sizeRandomness: this.options.particleOptions.sizeRandomness,
                lifetime: lifetime,
                velocity: baseVelocity,
                gravityScale: this.options.particleOptions.gravityScale,
                color: this.options.particleOptions.color
            };

            const particle = new Particle(singleParticleOpts);
            particle.spawn(this.world, spawnPos);
            this.particles.push(particle);
        }
    }

    private calculateBaseVelocity(spawnOffset: Vector3): Vector3 {
        if (this.options.spawnOptions?.direction) {
            return Vector3.fromVector3Like(this.options.spawnOptions.direction)
                .normalize()
                .scale(this.options.speed);
        } else if (this.options.spawnOptions?.useSpawnDirectionForVelocity && spawnOffset.magnitude > 0.01) {
             return spawnOffset.normalize().scale(this.options.speed);
        } else {
            return new Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize().scale(this.options.speed);
        }
    }

    private applyVelocityRandomness(velocity: Vector3): Vector3 {
        const randomness = this.options.spawnOptions!.velocityRandomness!;
        const randomVector = new Vector3(
            (Math.random() * 2 - 1),
            (Math.random() * 2 - 1),
            (Math.random() * 2 - 1)
        ).normalize().scale(this.options.speed * randomness);
        return velocity.add(randomVector);
    }

    private applyLifetimeRandomness(lifetime: number): number {
        const variation = lifetime * this.options.particleOptions.lifetimeRandomness!;
        return Math.max(0.1, lifetime + (Math.random() * 2 - 1) * variation);
    }

    private getRandomPointInSphere(radius: number, shellOnly: boolean = false): Vector3 {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = shellOnly ? radius : radius * Math.cbrt(Math.random());
        return new Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    }

    private clearTimers(): void {
        if (this.lifetimeTimer) {
            clearTimeout(this.lifetimeTimer);
            this.lifetimeTimer = undefined;
        }
    }

    private clearExistingParticles(): void {
        this.particles.forEach(particle => {
           if (particle && particle.isSpawned) {
               particle.despawn();
           }
        });
        this.particles = [];
    }

    public returnToPool(): void {
        if (!this.active) return;
        this.setActive(false);
        this.clearExistingParticles();
        this.pool?.returnParticle(this);
    }

    public destroyEmitter(): void {
        this.setActive(false);
        this.clearExistingParticles();
        if (this.isSpawned) {
            this.despawn();
        }
        this.pool = undefined;
    }
} 