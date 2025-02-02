import { Resource } from '../Resource';
import { Entity, BlockType } from 'hytopia';
import type { Vector3Like } from 'hytopia';
import type { EmitterOptions } from '../particles/ParticleEmitter';

export interface AbilityOptions {
    name: string;
    cooldown: number;
    resourceCost: number;
    resourceType: Resource;
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
    gravityScale?: number;
    hitFX?: EmitterOptions;
    collisionGroups?: {
        belongsTo: number[];
        collidesWith: number[];
    };
    onCollision?: (source: Entity, target: Entity | BlockType) => void;
    aoe?: {
        radius: number;
        damage: number;
        falloff?: boolean;
        knockback?: number;
    };
    charging?: ChargeOptions;
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