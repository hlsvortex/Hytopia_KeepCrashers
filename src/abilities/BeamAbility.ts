import { Ability } from '../Ability';
import { Entity, EventRouter, PlayerEntity, Vector3, type Vector3Like } from 'hytopia';
import { world } from '../GlobalContext';
import { DamageableEntity } from '../DamageableEntity';
import type { AbilityController } from '../AbilityController';
import type { AbilityOptions } from './AbilityOptions';
import { ParticleFX } from '../particles/ParticleFX';
import { ParticleEmitter } from '../particles/ParticleEmitter';
import { BeamEffect } from '../particles/BeamEffect';
import { scaleDirection } from '../utils/math';


export interface BeamAbilityOptions extends AbilityOptions {
    range: number;
    damagePerTick: number;
    useType: 'hold_continuous';
    tickInterval: number; // Time between ticks in milliseconds
}



export class BeamAbility extends Ability {
    private beamEffect: BeamEffect;
    public isActive = false;
    private lastTickTime = 0;
    private lastHitPoint: Vector3 | undefined;
    private readonly SPREAD_ANGLE = 1;  // Maximum spread angle in radians (about 5.7 degrees)

    constructor(
        public options: BeamAbilityOptions,
        eventRouter: EventRouter,
        abilityController: AbilityController
    ) {
        super(options, eventRouter, abilityController);
        this.beamEffect = new BeamEffect(world, this);


    }

    use(origin: Vector3Like, direction: Vector3Like, source: Entity) {
       // if (!source.world) return;

	    //source.setCcdEnabled(true);
	   

        const range = this.options.range;

        //console.log("use BeamAbility " + range);
        // Add random spread to direction
        const spreadDirection = Vector3.fromVector3Like(direction);
        
        // Add random deviation to x and z components
        spreadDirection.x += (Math.random() - 0.5) * this.SPREAD_ANGLE;
        spreadDirection.z += (Math.random() - 0.5) * this.SPREAD_ANGLE;
        
        // Re-normalize the direction vector
        spreadDirection.normalize();

        // Use spreadDirection instead of original direction for the raycast
        const raycastResult = world.simulation.raycast(
            origin,
            spreadDirection,
            this.options.range,
            { filterExcludeRigidBody: source.rawRigidBody }
        );

		
        let hitPoint = raycastResult?.hitPoint;
        if (!hitPoint) {
            const hitOffset = scaleDirection(spreadDirection, range);
            hitPoint = Vector3.fromVector3Like(origin).add(hitOffset);
        }
        else {
            
            console.log("hitPoint:", hitPoint);
        }

		if (raycastResult?.hitBlock) { // see if the result hit a block
			const breakPosition = raycastResult.hitBlock.globalCoordinate;
			console.log("breakPosition:", breakPosition);
			
		}


        const hitOffset = scaleDirection(spreadDirection, range);
        //hitPoint = Vector3.fromVector3Like(origin).add(hitOffset);

        if(hitPoint) {
            this.lastHitPoint = Vector3.fromVector3Like(hitPoint);
        }

        

        this.beamEffect.update(Vector3.fromVector3Like(origin), Vector3.fromVector3Like(hitPoint), Vector3.fromVector3Like(spreadDirection));
		
		
		if (raycastResult?.hitEntity instanceof DamageableEntity) {
			raycastResult.hitEntity.takeDamage(this.options.damagePerTick, source as DamageableEntity);
		}

        // Check if enough time has passed since last tick
        const currentTime = Date.now();
        if (currentTime - this.lastTickTime < this.options.tickInterval) {
            return;
        }

        this.consumeResources(source as DamageableEntity);

        this.lastTickTime = currentTime;


        if (raycastResult?.hitEntity instanceof DamageableEntity) {
            raycastResult.hitEntity.takeDamage(this.options.damagePerTick, source as DamageableEntity);
        }
    }

    cleanup() {
        //if (this.beamEffect) {
            //this.beamEffect.destroy();
            //this.beamEffect = undefined;
        //}
        //this.isActive = false;
    }

    


    
} 