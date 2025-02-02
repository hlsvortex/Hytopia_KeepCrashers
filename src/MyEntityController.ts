import {
  Audio,
  BaseEntityController,
  ColliderShape,
  CoefficientCombineRule,
  CollisionGroup,
  Entity,
  PlayerEntity,
  BlockType,
} from 'hytopia';

import type {
  PlayerInput,
  PlayerCameraOrientation,
} from 'hytopia';

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

    if (this.pauseInput) {
      return;
    }

    const { w, a, s, d, sp, sh, ml } = input;
    const { yaw } = cameraOrientation;
    const currentVelocity = entity.linearVelocity;
    const targetVelocities = { x: 0, y: 0, z: 0 };
    const isRunning = sh;

    // Temporary, animations
    if (this.isGrounded && (w || a || s || d)) {
      if (isRunning) {
        const runAnimations = [ 'run_upper', 'run_lower' ];
        entity.stopModelAnimations(Array.from(entity.modelLoopedAnimations).filter(v => !runAnimations.includes(v)));
        entity.startModelLoopedAnimations(runAnimations);
        this._stepAudio?.setPlaybackRate(0.81);
      } else {
        const walkAnimations = [ 'walk_upper', 'walk_lower' ];
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

    /*
    if (ml) {
      entity.startModelOneshotAnimations([ 'simple_interact' ]);

      // break a block
      const ray = entity.world.simulation.raycast(
        entity.position,
        entity.player.camera.facingDirection,
        10,
        { filterExcludeRigidBody: entity.rawRigidBody },
      );

      if (ray?.hitBlock) {
        // Remove the block
        entity.world.chunkLattice.setBlock(ray.hitBlock.globalCoordinate, 0);
      }

      input.ml = false;
    }
    */
    
    // Calculate target horizontal velocities (run/walk)
    if ((isRunning && this.canRun(this)) || (!isRunning && this.canWalk(this))) {
      const velocity = isRunning ? this.runVelocity : this.walkVelocity;

      if (w) {
        targetVelocities.x -= velocity * Math.sin(yaw);
        targetVelocities.z -= velocity * Math.cos(yaw);
      }
  
      if (s) {
        targetVelocities.x += velocity * Math.sin(yaw);
        targetVelocities.z += velocity * Math.cos(yaw);
      }
      
      if (a) {
        targetVelocities.x -= velocity * Math.cos(yaw);
        targetVelocities.z += velocity * Math.sin(yaw);
      }
      
      if (d) {
        targetVelocities.x += velocity * Math.cos(yaw);
        targetVelocities.z -= velocity * Math.sin(yaw);
      }

      // Normalize for diagonals
      const length = Math.sqrt(targetVelocities.x * targetVelocities.x + targetVelocities.z * targetVelocities.z);
      if (length > velocity) {
        const factor = velocity / length;
        targetVelocities.x *= factor;
        targetVelocities.z *= factor;
      }
    }

    // Calculate target vertical velocity (jump)
    if (sp && this.canJump(this)) {
      if (this.isGrounded && currentVelocity.y > -0.001 && currentVelocity.y <= 3) {
        targetVelocities.y = this.jumpVelocity;
        input.sp = false;
      }
      
    }

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
}