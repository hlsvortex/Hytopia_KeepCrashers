import {
  Audio,
  BaseEntityController,
  ColliderShape,
  CoefficientCombineRule,
  CollisionGroup,
  Entity,
  PlayerEntity,
  BlockType,
  Vector3,
} from 'hytopia';

import type {
  PlayerInput,
  PlayerCameraOrientation,
  Vector3Like,
} from 'hytopia';

import AbilityEntityController from './AbilityEntityController';
import { DamageableEntity } from './DamageableEntity';

/** Options for creating a MyEntityController instance. @public */
export interface MyEntityControllerOptions {
  /** The upward velocity applied to the entity when it jumps. */
  jumpVelocity?: number;

  /** The normalized horizontal velocity applied to the entity when it runs. */
  runVelocity?: number;

  /** The normalized horizontal velocity applied to the entity when it walks. */
  walkVelocity?: number;

  /** A function allowing custom logic to determine if the entity can jump. */
  canJump?: () => boolean;

  /** A function allowing custom logic to determine if the entity can walk. */
  canWalk?: () => boolean;

  /** A function allowing custom logic to determine if the entity can run. */
  canRun?: () => boolean;
}

/**
 * A custom entity controller implementation.
 * 
 * @remarks
 * This class extends {@link BaseEntityController}
 * and implements the default movement logic for a
 * entity. 
 * 
 * @public
 */
export default class MyEntityController extends BaseEntityController {
  /** The upward velocity applied to the entity when it jumps. */
  public jumpVelocity: number = 10;

  /** The normalized horizontal velocity applied to the entity when it runs. */
  public runVelocity: number = 8;

  /** The normalized horizontal velocity applied to the entity when it walks. */
  public walkVelocity: number = 4;

  public pauseInput: boolean = false;

  public isWalking: boolean = false;

  public useCustomJump: boolean = false;

  public isJumping: boolean = false;

  /**
   * A function allowing custom logic to determine if the entity can walk.
   * @param myEntityController - The entity controller instance.
   * @returns Whether the entity of the entity controller can walk.
   */
  public canWalk: (myEntityController: MyEntityController) => boolean = () => true;

  /**
   * A function allowing custom logic to determine if the entity can run.
   * @param myEntityController - The entity controller instance.
   * @returns Whether the entity of the entity controller can run.
   */
  public canRun: (myEntityController: MyEntityController) => boolean = () => true;

  /**
   * A function allowing custom logic to determine if the entity can jump.
   * @param myEntityController - The entity controller instance.
   * @returns Whether the entity of the entity controller can jump.
   */
  public canJump: (myEntityController: MyEntityController) => boolean = () => true;

  //public updateJump: (myEntityController: MyEntityController) => void = () => {};

  /** @internal */
  private _stepAudio: Audio | undefined;

  /** @internal */
  private _groundContactCount: number = 0;

  /** @internal */
  private _platform: Entity | undefined;

  /**
   * @param options - Options for the controller.
   */
  public constructor(options: MyEntityControllerOptions = {}) {
    super();

    this.jumpVelocity = options.jumpVelocity ?? this.jumpVelocity;
    this.runVelocity = options.runVelocity ?? this.runVelocity;
    this.walkVelocity = options.walkVelocity ?? this.walkVelocity;
    this.canWalk = options.canWalk ?? this.canWalk;
    this.canRun = options.canRun ?? this.canRun;
    this.canJump = options.canJump ?? this.canJump;

    this.isWalking = false//isCharging;

  }

  /** Whether the entity is grounded. */
  public get isGrounded(): boolean { return this._groundContactCount > 0; }

  /** Whether the entity is on a platform, a platform is any entity with a kinematic rigid body. */
  public get isOnPlatform(): boolean { return !!this._platform; }

  /** The platform the entity is on, if any. */
  public get platform(): Entity | undefined { return this._platform; }

  /**
   * Called when the controller is attached to an entity.
   * @param entity - The entity to attach the controller to.
   */
  public attach(entity: Entity) {
    this._stepAudio = new Audio({
      uri: 'audio/sfx/step/stone/stone-step-04.mp3',
      loop: true,
      volume: 0.1,
      attachedToEntity: entity,
    });

    
    entity.lockAllRotations(); // prevent physics from applying rotation to the entity, we can still explicitly set it.
  };

  /**
   * Called when the controlled entity is spawned.
   * In MyEntityController, this function is used to create
   * the colliders for the entity for wall and ground detection.
   * @param entity - The entity that is spawned.
   */
  public spawn(entity: Entity) {
    if (!entity.isSpawned) {
      throw new Error('MyEntityController.createColliders(): Entity is not spawned!');
    }

    // Ground sensor
    entity.createAndAddChildCollider({
      shape: ColliderShape.CYLINDER,
      radius: 0.23,
      halfHeight: 0.125,
      collisionGroups: {
        belongsTo: [ CollisionGroup.ENTITY_SENSOR ],
        collidesWith: [ CollisionGroup.BLOCK, CollisionGroup.ENTITY ],
      },
      isSensor: true,
      relativePosition: { x: 0, y: -0.75, z: 0 },
      tag: 'groundSensor',
      onCollision: (_other: BlockType | Entity, started: boolean) => {
        // Ground contact
        this._groundContactCount += started ? 1 : -1;
  
        if (!this._groundContactCount) {
          entity.startModelOneshotAnimations([ 'jump_loop' ]);
        } else {
          entity.stopModelAnimations([ 'jump_loop' ]);
        }

        // Platform contact
        if (!(_other instanceof Entity) || !_other.isKinematic) return;
        
        if (started) {
          this._platform = _other;
        } else if (_other === this._platform && !started) {
          this._platform = undefined;
        }
      },
    });


    // Wall collider
    entity.createAndAddChildCollider({
      shape: ColliderShape.CAPSULE,
      halfHeight: 0.30,
      radius: 0.37,
      collisionGroups: {
        belongsTo: [ CollisionGroup.ENTITY_SENSOR ],
        collidesWith: [ CollisionGroup.BLOCK ],
      },
      friction: 0,
      frictionCombineRule: CoefficientCombineRule.Min,
      tag: 'wallCollider',
    });
  };

  /**
   * Ticks the player movement for the entity controller,
   * overriding the default implementation.
   * 
   * @param entity - The entity to tick.
   * @param input - The current input state of the player.
   * @param cameraOrientation - The current camera orientation state of the player.
   * @param deltaTimeMs - The delta time in milliseconds since the last tick.
   */
  public tickWithPlayerInput(entity: PlayerEntity, input: PlayerInput, cameraOrientation: PlayerCameraOrientation, deltaTimeMs: number) {
    if (!entity.isSpawned || !entity.world) return;

    super.tickWithPlayerInput(entity, input, cameraOrientation, deltaTimeMs);

    if (this.pauseInput) return;

    const { w, a, s, d, sp } = input;
    const { yaw } = cameraOrientation;
    const currentVelocity = entity.linearVelocity;
    const targetVelocities = { x: 0, y: 0, z: 0 };

    // Get ability controller to check charging state
    const abilityController = entity.controller as AbilityEntityController;
    //const isCharging = abilityController?.currentAbilityController?.isAnyAbilityCharging() ?? false;
    
    // Use charging state to determine if walking
   
    // Temporary, animations
    if (this.isGrounded && (w || a || s || d)) {
        if (!this.isWalking) {
            const runAnimations = ['run_upper', 'run_lower'];
            entity.stopModelAnimations(Array.from(entity.modelLoopedAnimations).filter(v => !runAnimations.includes(v)));
            entity.startModelLoopedAnimations(runAnimations);
            this._stepAudio?.setPlaybackRate(0.81);
        } else {
            const walkAnimations = ['walk_upper', 'walk_lower'];
            entity.stopModelAnimations(Array.from(entity.modelLoopedAnimations).filter(v => !walkAnimations.includes(v)));
            entity.startModelLoopedAnimations(walkAnimations);
            this._stepAudio?.setPlaybackRate(0.55);
        }

        this._stepAudio?.play(entity.world, !this._stepAudio?.isPlaying);
    } else {
        this._stepAudio?.pause();
        const idleAnimations = [ 'idle_upper', 'idle_lower' ];
        entity.stopModelAnimations(Array.from(entity.modelLoopedAnimations).filter(v => !idleAnimations.includes(v)));
        entity.startModelLoopedAnimations(idleAnimations);
    }

    // Use walking speed when charging, running speed otherwise
    const moveSpeed = this.isWalking ? this.walkVelocity : this.runVelocity;
    
    // Calculate target horizontal velocities (run/walk)
    if ((!this.isWalking && this.canRun(this)) || (this.isWalking && this.canWalk(this))) {
      if (w) {
        targetVelocities.x -= moveSpeed * Math.sin(yaw);
        targetVelocities.z -= moveSpeed * Math.cos(yaw);
      }
  
      if (s) {
        targetVelocities.x += moveSpeed * Math.sin(yaw);
        targetVelocities.z += moveSpeed * Math.cos(yaw);
      }
      
      if (a) {
        targetVelocities.x -= moveSpeed * Math.cos(yaw);
        targetVelocities.z += moveSpeed * Math.sin(yaw);
      }
      
      if (d) {
        targetVelocities.x += moveSpeed * Math.cos(yaw);
        targetVelocities.z -= moveSpeed * Math.sin(yaw);
      }

      // Normalize for diagonals
      const length = Math.sqrt(targetVelocities.x * targetVelocities.x + targetVelocities.z * targetVelocities.z);
      if (length > moveSpeed) {
        const factor = moveSpeed / length;
        targetVelocities.x *= factor;
        targetVelocities.z *= factor;
      }
    }

    targetVelocities.y = this.handleJump(entity, input, this, Vector3.fromVector3Like(targetVelocities)).y;
    /*
    // Jump handling
    if (sp && this.canJump(this)) {
        if (this.isGrounded && currentVelocity.y > -0.001 && currentVelocity.y <= 3) {
            const damageableEntity = entity as DamageableEntity;
            //if (damageableEntity.stamina < this.JUMP_STAMINA_COST) return;

            //damageableEntity.useStamina(this.JUMP_STAMINA_COST);
            targetVelocities.y = this.jumpVelocity;
            this.isJumping = true;
            console.log('Jump ' + this.isJumping);
            //input.sp = false;
        }
    } 
    
    if (!input.sp && this.isJumping && currentVelocity.y > 4) {
        // Cut jump short if space released and still moving upward
        console.log('Cut jump short');
        entity.setLinearVelocity(new Vector3(
            currentVelocity.x,
            4,
            currentVelocity.z 
        ));
        
        //entity.applyImpulse(new Vector3(0, this.JUMP_GRAVITY_MULTIPLIER, 0));
        this.isJumping = false;
    }

    if (this.isGrounded) {
        //this.isJumping = false;
    }
    */

    // Apply impulse relative to target velocities, taking platform velocity into account
    const platformVelocity = this._platform ? this._platform.linearVelocity : { x: 0, y: 0, z: 0 };
    const deltaVelocities = {
      x: targetVelocities.x - currentVelocity.x + platformVelocity.x,
      y: targetVelocities.y + platformVelocity.y,
      z: targetVelocities.z - currentVelocity.z + platformVelocity.z,
    };

    const hasExternalVelocity = 
      Math.abs(currentVelocity.x) > this.runVelocity ||
      Math.abs(currentVelocity.y) > this.jumpVelocity ||
      Math.abs(currentVelocity.z) > this.runVelocity;

    if (!hasExternalVelocity) { // allow external velocities to resolve, otherwise our deltas will cancel them out.
      if (Object.values(deltaVelocities).some(v => v !== 0)) {
        const mass = entity.mass;        

        entity.applyImpulse({ // multiply by mass for the impulse to result in applying the correct target velocity
          x: deltaVelocities.x * mass,
          y: deltaVelocities.y * mass,
          z: deltaVelocities.z * mass,
        });
      }
    }

    // Apply rotation
    if (yaw !== undefined) {
      const halfYaw = yaw / 2;
      
      entity.setRotation({
        x: 0,
        y: Math.fround(Math.sin(halfYaw)),
        z: 0,
        w: Math.fround(Math.cos(halfYaw)),
      });
    }
  }

  public handleJump(entity: Entity, input: PlayerInput, enittyController: MyEntityController, targetVelocities: Vector3Like): Vector3 {
   
    const currentVelocity = entity.linearVelocity;
    const newVelocities = targetVelocities;
    
    if (this.useCustomJump) { return Vector3.fromVector3Like(newVelocities); }

    if (input.sp && this.canJump(this)) {
      if (this.isGrounded && currentVelocity.y > -0.001 && currentVelocity.y <= 3) {
        const damageableEntity = entity as DamageableEntity;
        newVelocities.y = this.jumpVelocity;
        this.isJumping = true;
      }
    }
    
    if (!input.sp && this.isJumping && currentVelocity.y > 5) {
     
      // Cut jump short if space released and still moving upward
      entity.setLinearVelocity(new Vector3(
        currentVelocity.x,
        6,
        currentVelocity.z
      ));

      //entity.applyImpulse(new Vector3(0, this.JUMP_GRAVITY_MULTIPLIER, 0));
      this.isJumping = false;
    }
  
    return Vector3.fromVector3Like(newVelocities);
  }
}