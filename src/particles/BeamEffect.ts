import { ColliderShape, CollisionGroup, Entity, Quaternion, RigidBodyType, Vector3, World, type Vector3Like ,  type RgbColor, BlockType, PlayerEntity} from 'hytopia';
import { faceDirection, getRotationFromDirection } from '../utils/math';
import { BeamAbility } from '../abilities/BeamAbility';
import { DamageableEntity } from '../DamageableEntity';

export class BeamEffect {

    public beamAbility: BeamAbility;
    private beamSegments: Entity[] = [];
    private readonly segmentSpacing = 0.001;  // Increased from 0.2
    private readonly segmentScale = 0.05;
    private isActive = false;
    private numSegments = 10;

    constructor(private world: World, beamAbility: BeamAbility) {
        // Create all segments upfront but don't spawn them yet
        this.createPool(20); // Create a pool of 50 segments
        this.beamAbility = beamAbility;
    }


    private createPool(count: number) {
        for (let i = 0; i < count; i++) {

            let model = 'models/particles/beam_segment.gltf';
            let scale = 0.16;

            if(i == 0) {
                model = 'models/particles/beam_start.gltf';
                scale = 0.3;
            }

            if(i == 1) {
                model = 'models/particles/beam_start.gltf';
                scale = 0.35;
            }


            const segment = new Entity({
                modelUri: model,
                modelScale: scale,
                rigidBodyOptions: {
                    type: RigidBodyType.DYNAMIC,
                    gravityScale: 0,
                
                },
                
            });

            segment.createAndAddChildCollider({
                shape: ColliderShape.BALL,
                isSensor: true,
                radius: 0.001,
                

                onCollision: (otherEntity: Entity | BlockType, started: boolean) => {

                    //console.log("collision", otherEntity.name);

                    if(otherEntity instanceof DamageableEntity) {
                        //console.log("entity", otherEntity.name);
                        //otherEntity.takeDamage(this.beamAbility.options.damagePerTick);
                    }
                   
                }
            });




            segment.setCollisionGroupsForSolidColliders({
                belongsTo: [CollisionGroup.GROUP_2],
                collidesWith: [
                    CollisionGroup.ENTITY,
                ],
            });

            this.beamSegments.push(segment);

            
        }
    }

    public update(newStart: Vector3Like, newEnd: Vector3Like, direction: Vector3Like) {
        const distance = Vector3.fromVector3Like(direction).magnitude;
        const normalizedDir = Vector3.fromVector3Like(direction).normalize();
        const segmentDistance = 0.4;    

        //console.log("newEnd:", newEnd.toString());
        //console.log("newStart:", newStart.toString());
        //console.log("Normalized direction:", normalizedDir.toString());


        for (let i = 0; i < this.numSegments; i++) {
            const segment = this.beamSegments[i];
            const dis = i * segmentDistance;
            // Debug the scale operation
            //console.log(`Scaling ${normalizedDir.toString()} by ${dis}`);

            const offset = new Vector3(
                normalizedDir.x * dis,
                normalizedDir.y * dis,
                normalizedDir.z * dis
            );
            let position = Vector3.fromVector3Like(newStart).add(offset);

            if (i == 0) {
                position = Vector3.fromVector3Like(newStart);
            }
            else if (i == 1) {
                position = Vector3.fromVector3Like(newEnd);
            }


            if (!segment.isSpawned) {
                segment.spawn(this.world, position);
                const color = { r: 255, g: 154, b: 25 };
                segment.setOpacity(0.9);
                segment.setTintColor(color);
            } else {
                this.beamSegments[i].setPosition(position);
            }
            
            this.beamSegments[i].setRotation(faceDirection(direction));
        }

        // Despawn excess segments
        for (let i = this.numSegments; i < this.beamSegments.length; i++) {
            if (this.beamSegments[i].isSpawned) {
                this.beamSegments[i].despawn();
            }
        }

    }

    public despawn() {
        this.beamSegments.forEach(segment => {
            if (segment.isSpawned) {
                segment.despawn();
            }
        });
    }
} 