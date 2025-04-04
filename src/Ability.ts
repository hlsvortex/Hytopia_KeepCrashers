import {
    Entity,
    EventRouter,
    type Vector3Like,
    Audio,
    Vector3,
} from 'hytopia';

import { DamageableEntity } from './DamageableEntity';
import { Resource } from './Resource';
import type { AbilityOptions } from './abilities/AbilityOptions';
import type { AbilityController } from './AbilityController';
import { world } from './GlobalContext';
import type MyEntityController from './MyEntityController';


export abstract class Ability {

    protected abilityController: AbilityController;
    protected chargeStartTime: number = 0;
    protected isCharging: boolean = false;
    protected lastUseTime: number = 0;

    
    constructor(
        public options: AbilityOptions,
        protected eventRouter: EventRouter,
        abilityController: AbilityController
    ) { 
        this.abilityController = abilityController;
    }


    public getAbilityController(): AbilityController {
        return this.abilityController;
    }

    public getIsCharging(): boolean {
        return this.isCharging;
    }

    startCharge() {
        if (!this.hasCharging()) return;
        this.isCharging = true;
        this.chargeStartTime = Date.now();
        
        // Play charge start sound if configured
        if (this.options.chargeStartSFX) {
            const playbackRate = Math.random() * 0.2 + 0.9;
            const chargeSound = new Audio({
                uri: this.options.chargeStartSFX.uri,
                volume: this.options.chargeStartSFX.volume ?? 0.6,
                position: this.abilityController.getAttachedEntity()?.position,
                referenceDistance: this.options.chargeStartSFX.referenceDistance ?? 10,
                playbackRate: playbackRate
            });
            chargeSound.play(world);
        }
        
        const entity = this.abilityController.getAttachedEntity();
        if (entity) {
            const controller = entity.controller as MyEntityController;
            controller.isWalking = true;
        }

        this.abilityController.updateChargeUI(true, 0);

    }

    endCharge(): number {
        const chargeLevel = this.getChargeLevel();
        this.isCharging = false;
        
        this.abilityController.updateChargeUI(false, 0);
        
        const entity = this.abilityController.getAttachedEntity();
        if (entity) {
            const controller = entity.controller as MyEntityController;
            controller.isWalking = false;
        }


        return chargeLevel;
    }

     hasCharging(): boolean {
        return 'charging' in this.options && this.options.charging !== undefined;
    }

    public getChargeLevel(): number {
        if (!this.isCharging || !this.hasCharging()) return 0;

        const charging = (this.options as any).charging;
        const chargeTime = (Date.now() - this.chargeStartTime) / 1000;
        const minTime = charging.minChargeTime ?? 0;
        const maxTime = charging.maxChargeTime ?? 1;

        const chargeLevel = Math.min(Math.max((chargeTime - minTime) / (maxTime - minTime), 0), 1);
        
      
        this.abilityController.updateChargeUI(this.isCharging, chargeLevel);

        return chargeLevel;
    }

    protected getChargedValue(chargeLevel: number, min: number, max: number): number {
        return min + (max - min) * chargeLevel;
    }

    public isOnCooldown(): boolean {
        const currentTime = Date.now();
        const cooldownMs = this.options.cooldown * 1000;
        return (currentTime - this.lastUseTime) < cooldownMs;
    }

    public getRemainingCooldown(): number {
        const currentTime = Date.now();
        const cooldownMs = this.options.cooldown * 1000;
        const remaining = cooldownMs - (currentTime - this.lastUseTime);
        return Math.max(0, remaining / 1000); // Return remaining in seconds
    }

    public startCooldown() {
        this.lastUseTime = Date.now();
        
        if (this.abilityController.getAttachedEntity()?.player) {
            this.abilityController.getAttachedEntity()?.player.ui.sendData({
                type: 'abilityUpdate',
                ability: this.options.slot || 'primary',
                cooldown: this.options.cooldown
            });
        }
    }

    public canUseAbility(source: DamageableEntity): boolean {
        // Check cooldown first
        if (this.isOnCooldown()) {
            return false;
        }

        // Then check resources
        switch (this.options.resourceType) {
            case Resource.Mana:
                return source.mana >= this.options.resourceCost;
            case Resource.Stamina:
                return source.stamina >= this.options.resourceCost;
            case Resource.Health:
                return source.health > this.options.resourceCost;
            default:
                return false;
        }
    }
    
    public consumeResources(source: DamageableEntity) {
        switch (this.options.resourceType) {
            case Resource.Mana:
                source.useMana(this.options.resourceCost);
                break;
            case Resource.Stamina:
                source.useStamina(this.options.resourceCost);
                break;
            case Resource.Health:
                source.takeDamage(this.options.resourceCost);
                break;
        }
    }

    abstract use(origin: Vector3Like, direction: Vector3Like, source: Entity): void;

    // Call this at the start of use() in derived classes
    protected beforeUse(source: Entity) {
        if (source instanceof DamageableEntity) {
            this.consumeResources(source);
        }
        this.startCooldown();
    }

    cleanup?(): void;

    protected playUseSound(source: Entity) {
        if (!this.options.useSFX) return;

        const playbackRate = Math.random() * 0.2 + 0.8;

        const useSound = new Audio({
            uri: this.options.useSFX.uri,
            volume: this.options.useSFX.volume ?? 1,
            position: source.position,
            referenceDistance: this.options.useSFX.referenceDistance ?? 10,
            playbackRate: playbackRate
        });


        useSound.play(world);

    }

    protected playHitSound(position: Vector3Like) {
        if (!this.options.hitSFX) return;

        const playbackRate = Math.random() * 0.2 + 0.8;

        const hitSound = new Audio({
            uri: this.options.hitSFX.uri,
            volume: this.options.hitSFX.volume ?? 1,
            position: position,
            referenceDistance: this.options.hitSFX.referenceDistance ?? 10,
            playbackRate: playbackRate
        });

        hitSound.play(world);
    }

    protected applyUseImpulse(source: Entity, aimDirection?: Vector3Like) {
        if (!this.options.useImpulse) return;

        let impulseDirection: Vector3;
        if (this.options.useImpulse.useAimDirection && aimDirection) {
            impulseDirection = Vector3.fromVector3Like(aimDirection).normalize();
        } else {
            impulseDirection = Vector3.fromVector3Like(source.directionFromRotation);
        }

        switch (this.options.useImpulse.direction) {
            case 'backward':
                impulseDirection.scale(-this.options.useImpulse.force);
                break;
            case 'forward':
                impulseDirection.scale(this.options.useImpulse.force);
                break;
            case 'up':
                impulseDirection = new Vector3(0, this.options.useImpulse.force, 0);
                break;
        }
        impulseDirection.y += 0.1;
        source.setLinearVelocity(impulseDirection);
        source.applyImpulse(impulseDirection);
    }


    /*
    protected emitAbilityUsed(payload: T) {
        this.eventRouter.emit('ABILITY_USED', payload);
    }
        */
}

