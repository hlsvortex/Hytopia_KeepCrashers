import { Entity, ColliderShape, RigidBodyType, Vector3, type RgbColor, CollisionGroup, BlockType } from 'hytopia';
import { DamageableEntity } from '../DamageableEntity';
import { world } from '../GlobalContext';

interface HealthPickupOptions {
    size: 'small' | 'large';
    position: Vector3;
    respawnTime?: number; // Time in seconds
}

export class HealthPickup {
    private entity: Entity | undefined;
    private healAmount: number;
    private spawnPosition: Vector3;
    private respawnTime: number;
    private respawnTimer: ReturnType<typeof setTimeout> | null = null;
    
    constructor(options: HealthPickupOptions) {
        this.healAmount = options.size === 'large' ? 60 : 25;
        this.respawnTime = options.respawnTime ?? 15; // Default 30 seconds
        this.spawnPosition = options.position;
        
        this.createPickup();
    }

    private createPickup() {
        const scale = this.healAmount === 50 ? 1 : 0.9;

        this.entity = new Entity({
            name: 'HealthPickup',
            modelUri: 'models/items/heal-potion.gltf',
            modelScale: scale,
            rigidBodyOptions: {
                type: RigidBodyType.DYNAMIC,
                gravityScale: 0,
            }
        });

        // Add collider with trigger
        this.entity.createAndAddChildCollider({
            shape: ColliderShape.BALL,
            radius: scale ,
            isSensor: true,
            onCollision: (other: Entity | BlockType, started: boolean) => {
                if (started && other instanceof DamageableEntity) {
                    this.onPickup(other);
                }
            }
        });

        // Set collision groups
        this.entity.setCollisionGroupsForSolidColliders({
            belongsTo: [CollisionGroup.GROUP_1],
            collidesWith: [CollisionGroup.ENTITY]
        });

        // Set glowing effect
        //const color: RgbColor = { r: 0, g: 255, b: 0 };
        //this.entity.setTintColor(color);
       // this.entity.setOpacity(0.9);

        this.spawn();

        //const color: RgbColor = { r: 255, g: 25, b: 0 };
        //this.entity.setTintColor(color);

    }

    private spawn() {
        if (this.entity) {
            this.entity.spawn(world, this.spawnPosition);
            this.entity.setPosition(this.spawnPosition);
            // Add floating animation
            this.startFloatingAnimation();
        }
    }


    private onPickup(player: DamageableEntity) {
        
        if (player.hasFullHealth()) return;
        
        player.heal(this.healAmount);


        this.entity?.despawn();
        
        // Start respawn timer
        this.respawnTimer = setTimeout(() => {
            this.spawn();

            this.entity?.setCollisionGroupsForSolidColliders({
                belongsTo: [CollisionGroup.GROUP_1],
                collidesWith: [CollisionGroup.ENTITY]
            });
            this.entity?.createAndAddChildCollider({
                shape: ColliderShape.BALL,
                radius: 1,
                isSensor: true,
                onCollision: (other: Entity | BlockType, started: boolean) => {

                    if (started && other instanceof DamageableEntity) {
                        this.onPickup(other);
                    }
                }
            });


            this.respawnTimer = null;
        }, this.respawnTime * 1000);
    }

    private startFloatingAnimation() {
        
        if (!this.entity)  return;

        const startY = this.entity?.position.y;
        let time = 0;

        //setInterval(() => {
        this.entity.onTick = (entity: Entity, deltaMs: number) => {
            time += deltaMs / 1000;
            const newY = startY + Math.sin(time * 2) * 0.2;

            this.entity?.setPosition(new Vector3(
                this.entity.position.x,
                newY,
                this.entity.position.z
            ));

            this.entity?.setRotation({ x: 0, y: time * 2, z: 0, w: 1 });
        };
    }

    public despawn() {
        if (this.respawnTimer) {
            clearTimeout(this.respawnTimer);
            this.respawnTimer = null;
        }
        this.entity?.despawn();
        
    }
} 