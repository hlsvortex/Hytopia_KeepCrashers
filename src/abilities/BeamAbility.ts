import { Ability } from '../Ability';
import { Entity, EventRouter, PlayerEntity, Vector3, type Vector3Like } from 'hytopia';
import { world } from '../GlobalContext';
import { DamageableEntity } from '../DamageableEntity';
import type { AbilityController } from '../AbilityController';
import type { AbilityOptions } from './AbilityOptions';
import { ParticleFX } from '../particles/ParticleFX';
import { ParticleEmitter } from '../particles/ParticleEmitter';
import { BeamEffect } from '../BeamEffect';
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

        const range = this.options.range;

        console.log("use BeamAbility " + range);
        // Perform raycast for damage
        const dir = Vector3.fromVector3Like(direction).normalize();

        const hitResult = world.simulation.raycast(
            origin,
            dir,
            range,
            { filterExcludeRigidBody: source.rawRigidBody }
        );

        let hitPoint = hitResult?.hitPoint;
        if (!hitPoint) {
            const hitOffset = scaleDirection(dir, range);
            hitPoint = Vector3.fromVector3Like(origin).add(hitOffset);
        }
        else {
            
            console.log("hitPoint:", hitPoint);
        }


        if(hitPoint) {
            this.lastHitPoint = Vector3.fromVector3Like(hitPoint);
        }

        

        this.beamEffect.update(Vector3.fromVector3Like(origin), Vector3.fromVector3Like(hitPoint), Vector3.fromVector3Like(direction));

        // Check if enough time has passed since last tick
        const currentTime = Date.now();
        if (currentTime - this.lastTickTime < this.options.tickInterval) {
       //     return;
        }

        //this.consumeResources(source as DamageableEntity);

        this.lastTickTime = currentTime;


        if (hitResult?.hitEntity instanceof DamageableEntity) {
            hitResult.hitEntity.takeDamage(this.options.damagePerTick, source as DamageableEntity);
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