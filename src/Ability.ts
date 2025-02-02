import {
    Entity,
    EventRouter,
    type Vector3Like,
} from 'hytopia';

import { DamageableEntity } from './DamageableEntity';
import { Resource } from './Resource';
import type { AbilityOptions } from './abilities/AbilityOptions';
import type { AbilityController } from './AbilityController';


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

    getIsCharging(): boolean {
        return this.isCharging;
    }

    startCharge() {
        if (!this.hasCharging()) return;
        this.isCharging = true;
        this.chargeStartTime = Date.now();
        
        this.abilityController.updateChargeUI(true, 0);

    }

    endCharge(): number {
        const chargeLevel = this.getChargeLevel();
        this.isCharging = false;
        
        this.abilityController.updateChargeUI(false, 0);
        
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
        
        console.log('chargeLevel', chargeLevel);

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
        
        /*
        // Notify UI of cooldown start
        if (this.abilityController.attachedEntity?.player) {
            this.abilityController.attachedEntity.player.ui.sendData({
                type: 'abilityUpdate',
                ability: this.options.name,
                cooldown: this.options.cooldown
            });
        }
        */
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

    /*
    protected emitAbilityUsed(payload: T) {
        this.eventRouter.emit('ABILITY_USED', payload);
    }
        */
}

