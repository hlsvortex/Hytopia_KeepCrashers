import { Entity, Vector3, type Vector3Like } from 'hytopia';
import { ParticleEmitter, type EmitterOptions } from './ParticleEmitter';
import { world } from '../GlobalContext';

export class ParticlePool {
    private pools: Map<string, ParticleEmitter[]> = new Map();
    private activeEmitters: Set<ParticleEmitter> = new Set();
    private readonly defaultPoolSize = 10; // Default size

    constructor() {}

    private getPool(emitterName: string): ParticleEmitter[] {
        if (!this.pools.has(emitterName)) {
            this.pools.set(emitterName, []);
        }
        return this.pools.get(emitterName)!;
    }

    // Pre-warm pool
    public initializePool(emitterOptions: EmitterOptions, size: number = this.defaultPoolSize): void {
        const pool = this.getPool(emitterOptions.name);
        while (pool.length < size) {
            const emitter = new ParticleEmitter(emitterOptions);
            emitter.pool = this;
            pool.push(emitter);
        }
    }

    // Get an emitter from the pool
    public getParticleEmitter(emitterOptions: EmitterOptions, position: Vector3Like, direction?: Vector3Like): ParticleEmitter | null {
        const pool = this.getPool(emitterOptions.name);
        let emitter: ParticleEmitter | undefined = pool.pop();

        if (!emitter) {
            console.warn(`Pool empty for ${emitterOptions.name}, creating new instance.`);
            emitter = new ParticleEmitter(emitterOptions);
            emitter.pool = this;
        } 

        if (!emitter.isSpawned) {
            if (!world) {
                 console.error("Cannot spawn particle emitter: global world context is not available.");
                 pool.push(emitter); 
                 return null;
            }
            emitter.spawnEmitter(world, position);
        }

        emitter.reinitialize(position);
        this.activeEmitters.add(emitter);

        return emitter;
    }

    // Return an emitter to the pool
    public returnParticle(emitter: ParticleEmitter): void {
        if (!this.activeEmitters.has(emitter)) {
            return;
        }

        this.activeEmitters.delete(emitter);
        const pool = this.getPool(emitter.options.name);
        pool.push(emitter);
    }

    // Clean up all pools
    public destroy(): void {
        this.pools.forEach(pool => {
            pool.forEach(emitter => emitter.destroyEmitter());
        });
        this.pools.clear();
        this.activeEmitters.clear();
    }
} 