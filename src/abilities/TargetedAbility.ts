import { Entity, EventRouter, type Vector3Like } from 'hytopia';
import { Ability } from '../Ability';
import { type TargetedOptions } from './AbilityOptions';
import { DamageableEntity } from '../DamageableEntity';
import type { AbilityController } from '../AbilityController';

export class TargetedAbility extends Ability {
    constructor(
        public options: TargetedOptions,
        eventRouter: EventRouter,
        abilityController: AbilityController
    ) {
        super(options, eventRouter, abilityController);
    }

    use(origin: Vector3Like, direction: Vector3Like, source: Entity) {
        if (!source.world) return;

        const ray = source.world.simulation.raycast(origin, direction, this.options.maxRange, {
            filterExcludeRigidBody: source.rawRigidBody,
        });

        if (ray?.hitEntity instanceof DamageableEntity) {
            ray.hitEntity.heal(this.options.healing);
        }
    }
} 