import { Ability } from '../Ability';
import { Entity, EventRouter, Vector3, type Vector3Like } from 'hytopia';
import { world } from '../GlobalContext';
import { DamageableEntity } from '../DamageableEntity';
import type { AbilityController } from '../AbilityController';
import type { AbilityOptions } from './AbilityOptions';
import { ParticleFX } from '../particles/ParticleFX';
import { ParticleEmitter } from '../particles/ParticleEmitter';

export interface BeamAbilityOptions extends AbilityOptions {
    range: number;
    damagePerTick: number;
    useType: 'hold_continuous';
    tickInterval: number; // Time between ticks in milliseconds
}

export class BeamAbility extends Ability {
    private beamEffect?: ParticleEmitter;
    public isActive = false;
    private lastTickTime = 0;

    constructor(
        public options: BeamAbilityOptions,
        eventRouter: EventRouter,
        abilityController: AbilityController
    ) {
        super(options, eventRouter, abilityController);
    }

    use(origin: Vector3Like, direction: Vector3Like, source: Entity) {
        if (!source.world) return;

        // Check if enough time has passed since last tick
        const currentTime = Date.now();
        if (currentTime - this.lastTickTime < this.options.tickInterval) {
            return;
        }
        this.lastTickTime = currentTime;

        /*
        // Create beam effect if not exists
        if (!this.beamEffect) {
            this.beamEffect = new ParticleEmitter({
                ...ParticleFX.EXPLOSION,
                continuous: true,
                count: 5,
                speed: 0.1,
            });
            this.beamEffect.spawn(world, origin);
        }

        // Update beam position and direction
        this.beamEffect.setPosition(origin);
        */
       
        // Perform raycast for damage
        const hitResult = world.simulation.raycast(
            origin,
            direction,
            this.options.range,
            { filterExcludeRigidBody: source.rawRigidBody }
        );

        if (hitResult?.hitEntity instanceof DamageableEntity) {
            hitResult.hitEntity.takeDamage(this.options.damagePerTick, source as DamageableEntity);
        }
    }

    cleanup() {
        if (this.beamEffect) {
            this.beamEffect.destroy();
            this.beamEffect = undefined;
        }
        this.isActive = false;
    }
} 