import { Resource } from '../Resource';
import { Entity, BlockType } from 'hytopia';
import type { Vector3Like } from 'hytopia';
import type { EmitterOptions } from '../particles/ParticleEmitter';
import type { ParticleEffectType } from '../particles/ParticleFX';

export type AbilityUseType = 
    'instant' |          // Single activation (e.g. fireball)
    'hold_continuous' |  // Active while holding input (e.g. beam)
    'toggle_continuous'; // Toggle on/off with input (e.g. aura)

export interface AbilityOptions {
    name: string;
    slot: 'primary' | 'secondary';
    cooldown: number;
    resourceCost: number;
    resourceType: Resource;
    icon?: string;
    iconStyle?: any;
    useType?: AbilityUseType; // Default: 'instant'
    useFX?: EmitterOptions;
    hitFX?: EmitterOptions;
    useSFX?: {
        uri: string;
        volume?: number;
        referenceDistance?: number;
    };
    hitSFX?: {
        uri: string;
        volume?: number;
        referenceDistance?: number;
    };
    chargeStartSFX?: {
        uri: string;
        volume?: number;
        referenceDistance?: number;
    };

    useImpulse?: {
        direction: 'forward' | 'backward' | 'up';
        force: number;
        useAimDirection?: boolean;  // If true, uses aim direction instead of facing
    };
}

export interface ChargeOptions {
    minChargeTime?: number;  // Minimum time needed to charge (seconds)
    maxChargeTime?: number;  // Maximum charge time (seconds)
    chargeEffects?: {
        speed?: {
            min: number;
            max: number;
        };
        damage?: {
            min: number;
            max: number;
        };
        gravity?: {
            min: number;
            max: number;
        };
        size?: {
            min: number;
            max: number;
        };
        impulseForce?: {
            min: number;
            max: number;
        };
    };
}

export interface PhysicsProjectileOptions extends AbilityOptions {
    speed: number;
    damage: number;
    maxRange: number;
    modelUri: string;
    modelScale: number;
    projectileRadius: number;
    knockback: number;
    torque?: number;
    lifeTime?: number;
    gravityScale?: number;
	destroyOnBlockCollision?: boolean;
    noHitOnEntityCollision?: boolean;
    noHitOnBlockCollision?: boolean;
	faceVelocity?: boolean;
    hitFX?: EmitterOptions;
    collisionGroups?: {
        belongsTo: number[];
        collidesWith: number[];
    };
    aoe?: {
        radius: number;
        damage: number;
        falloff?: boolean;
        knockback?: number;
    };
    charging?: ChargeOptions;
    onCollision?: (source: Entity, target: Entity | BlockType) => void;
    onProjectileTick?: (projectile: Entity, deltaTimeMs: number) => void;
    velocityReverse?: {
        time: number;      // Time in seconds before reversing
        duration?: number; // How long to take to reverse (gradual if set)
        speedMultiplier?: number; // Multiplier for return speed (default 1)
    };
    isSensor?: boolean;  // Whether the collider is a sensor (trigger) only
    multiHit?: {
        maxHits: number;       // Maximum number of hits before despawning
        hitCooldown?: number;  // Time in seconds before can hit same target again
    };
}

export interface RaycastOptions extends AbilityOptions {
    damage: number;
    maxRange: number;
}

export interface TargetedOptions extends AbilityOptions {
    healing: number;
    maxRange: number;
}

export interface AoeOptions extends AbilityOptions {
    radius: number;
    damage: number;
}

export interface SelfOptions extends AbilityOptions {
    distance: number;
    onUse?: (origin: Vector3Like, direction: Vector3Like, source: Entity) => void;
} 