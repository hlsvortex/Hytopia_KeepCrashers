import { type RgbColor } from "hytopia";
import { type EmitterOptions } from "./ParticleEmitter";

export const ParticleFX = {
    BLOODHIT: {
        count: 6,
        speed: 1.5,
        spawnOptions: {
            radius: 0.5,
            shellOnly: false,
            useSpawnDirectionForVelocity: false,
            velocityRandomness: 0.8 // 30% randomness
        },
        particleOptions: {
            color: { r: 255, g: 0, b: 0 },
            size: 1.1,
            sizeRandomness: 0.3, // 30% size variation
            lifetime: 0.5,
            modelUri: 'models/particles/blooddrop.gltf',
            gravityScale: 0.4
        }
    } satisfies EmitterOptions,

    EXPLOSION: {
        count: 15,
        speed: 1.2,
        spawnOptions: {
            radius: 1,
            shellOnly: false,
            useSpawnDirectionForVelocity: true,
            velocityRandomness: 0.7 // 30% randomness
        },
        particleOptions: {
            color: { r: 255, g: 0, b: 0 },
            size: 6.0,
            sizeRandomness: 0.2, // 30% size variation
            lifetime: 0.4,
            lifetimeRandomness: 0.3, // 30% lifetime variation
            modelUri: 'models/particles/ember.gltf',
            gravityScale: 0.1
        }
    } satisfies EmitterOptions,

	EXPLOSION_SMALL: {
		count: 10,
		speed: 1.5,
		spawnOptions: {
			radius: 0.5,
			shellOnly: true,
			useSpawnDirectionForVelocity: true,
			velocityRandomness: 0.7 // 30% randomness
		},
		particleOptions: {
			color: { r: 255, g: 0, b: 0 },
			size: 5.0,
			sizeRandomness: 0.2, // 30% size variation
			lifetime: 0.4,
			lifetimeRandomness: 0.5, // 30% lifetime variation
			modelUri: 'models/particles/ember.gltf',
			gravityScale: 0.1
		}
	} satisfies EmitterOptions,


    FIREHIT: {
        count: 4,
        speed: 1,
        spawnOptions: {
            radius: 0.05,
            shellOnly: false,
            useSpawnDirectionForVelocity: true,
            velocityRandomness: 0.5 // 30% randomness
        },
        particleOptions: {
            color: { r: 255, g: 0, b: 0 },
            size: 1,
            sizeRandomness: 0.2, // 30% size variation
            lifetime: 0.5,
            lifetimeRandomness: 0.3, // 30% lifetime variation
            modelUri: 'models/particles/ember.gltf',
            gravityScale: 0.2
        }
    } satisfies EmitterOptions,    
    DUST: {
        count: 10,
        speed: 3,
        particleOptions: {
            color: { r: 0.8, g: 0.8, b: 0.7 },
            size: 0.2,
            lifetime: 1.5,
            modelUri: 'models/particles/ember.gltf',
            gravityScale: 0.2
        }
    } satisfies EmitterOptions,

    CLOUD_PUFF: {
        count: 10,
        speed: 0.5,
        spawnOptions: {
            radius: 0.05,
            shellOnly: true,
            useSpawnDirectionForVelocity: true,
            velocityRandomness: 0.3 // 30% randomness
            
        },
        particleOptions: {
            color: { r: 255, g: 0, b: 0 },
            size: 0.2,
            sizeRandomness: 0.5,
            lifetime: 0.8,
            lifetimeRandomness: 0.5,
            modelUri: 'models/particles/cloud.gltf',
            gravityScale: -0.05
        }
    } satisfies EmitterOptions,

    FOUNTAIN: {
        count: 20,
        speed: 5,
        spawnOptions: {
            radius: 0.2,
            direction: { x: 0, y: 1, z: 0 }, // Shoot upward
            velocityRandomness: 0.2
        },
        particleOptions: {
            color: { r: 0, g: 0.5, b: 1 },
            size: 0.2,
            lifetime: 2,
            modelUri: 'models/particles/water-drop.gltf',
            gravityScale: 0.8
        }
    } satisfies EmitterOptions
} as const;

// Type for accessing particle effects
export type ParticleEffectType = keyof typeof ParticleFX; 