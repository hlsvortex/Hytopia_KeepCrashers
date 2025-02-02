import { Entity, EventRouter, type Vector3Like } from 'hytopia';
import { Ability } from '../Ability';
import { type AoeOptions } from './AbilityOptions';
import { DamageableEntity } from '../DamageableEntity';
import type { AbilityController } from '../AbilityController';

export class AoeAbility extends Ability {
    constructor(
        public options: AoeOptions,
        eventRouter: EventRouter,
        abilityController: AbilityController
    ) {
        super(options, eventRouter, abilityController);
    }
 
    
    use(origin: Vector3Like, direction: Vector3Like, source: Entity) {
        if (!source.world) return;

        /*
        const entities = source.world.simulation.getEntitiesInRadius(origin, this.options.radius);

        entities.forEach(entity => {
            if (entity instanceof DamageableEntity && entity !== source) {
                entity.takeDamage(this.options.damage);
            }
        });
        */
    }
} 