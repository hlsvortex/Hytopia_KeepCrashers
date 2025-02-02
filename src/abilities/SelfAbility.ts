import { Entity, EventRouter, Vector3, type Vector3Like } from 'hytopia';
import { Ability } from '../Ability';
import { type SelfOptions } from './AbilityOptions';
import type { AbilityController } from '../AbilityController';

export class SelfAbility extends Ability {
    constructor(
        public options: SelfOptions,
        eventRouter: EventRouter,
        abilityController: AbilityController
    ) {
        super(options, eventRouter, abilityController);
    }

    use(origin: Vector3Like, direction: Vector3Like, source: Entity) {

        if (!source.world) return;

        if (this.options.onUse) {
            this.options.onUse(origin, direction, source);
            return;
        }
        
        // Perform raycast to check for obstacles
        const ray = source.world.simulation.raycast(origin, direction, this.options.distance, {
            filterExcludeRigidBody: source.rawRigidBody,
        });

        let teleportDistance = this.options.distance;
        
        // If we hit something, calculate distance from origin to hit point
        if (ray?.hitBlock || ray?.hitEntity) {
            const hitPoint = new Vector3(ray.hitPoint.x, ray.hitPoint.y, ray.hitPoint.z);
            const originVector = new Vector3(origin.x, origin.y, origin.z);
            const distance = originVector.distance(hitPoint);
            
            console.log(distance);
            if (distance < 2.5) {
                teleportDistance = 0;;
            }
            else { teleportDistance = Math.max(0, distance - 2); }// 0.5m buffer
        }

        if (teleportDistance == 0) {
            return;
        }
        // Calculate new position
        const directionVector = new Vector3(direction.x, direction.y, direction.z);
        directionVector.normalize();
        directionVector.scale(teleportDistance);

        const newPosition = new Vector3(origin.x, origin.y, origin.z);
        newPosition.add(directionVector);

        source.setPosition(newPosition);
    }
} 