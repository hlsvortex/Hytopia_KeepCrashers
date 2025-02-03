import { Resource } from '../Resource';
import { Entity, BlockType } from 'hytopia';
import type { Vector3Like } from 'hytopia';
import type { EmitterOptions } from '../particles/ParticleEmitter';

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
    useType?: AbilityUseType; // Default: 'instant'
    useFX?: EmitterOptions;
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
    lifeTime?: number;
    gravityScale?: number;
    noHitOnEntityCollision?: boolean;
    noHitOnBlockCollision?: boolean;
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