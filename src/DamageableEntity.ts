import { Entity, Light, PlayerEntity, SceneUI } from 'hytopia';
import { Player, EventRouter } from 'hytopia';
import type { PlayerDeathEventPayload } from './events';
import { PlayerEvents } from './events';
import { PlayerMatchStats } from './PlayerMatchStats';
import { gameManager } from './GlobalContext';



export class DamageableEntity extends PlayerEntity {

    public matchStats = new PlayerMatchStats();

    health: number;
    stamina: number;
    mana: number;
    light?: Light;
    nameplateUI?: SceneUI;
    hideNameplate: boolean = false;    

    onTick = (entity: Entity, tickDeltaMs: number) => {
        //super.onTick(entity, tickDeltaMs);
        //this.updateUI();
        if(entity.position.y <= 2.2) {
            this.takeDamage(1);
        }
    }




    constructor(options: any, initialHealth: number = 100, initialStamina: number = 100, initialMana: number = 100) {
        super(options);
        this.health = initialHealth;
        this.stamina = initialStamina;
        this.mana = initialMana;
    }

   
    updateUI() {
        if (!this.player || !this.player.ui) return;
        
        this.player.ui.sendData({
            type: 'statsUpdate',
            health: this.health,
            mana: this.mana,
            stamina: this.stamina
        });

        if (this.nameplateUI) {
            this.nameplateUI.setState({
                health: this.health,
                hidden: this.hideNameplate
            });
        }
    }


    takeDamage(amount: number, source?: DamageableEntity) {
        
        if (this.health <= 0) return;
        
        // Don't allow damage between teammates but can damage self
        if (source && source.id != this.id)

        {
            const sourceTeam = gameManager.getPlayerTeam(source?.player);
            const targetTeam = gameManager.getPlayerTeam(this.player);

            if (sourceTeam && targetTeam && sourceTeam.name === targetTeam.name) {
                return; // Don't allow damage between teammates
            }
        }


        this.health = Math.max(0, this.health - amount);
        this.updateUI();
        this.flashRed();

        if (this.health <= 0) {
            if (this.world) {
                this.world.eventRouter.emit<PlayerDeathEventPayload>(PlayerEvents.Death, {
                    player: this.player,
                    deathTime: Date.now(),
                    victim: this,
                    killer: source !== this ? source : undefined
                });
            }

            console.log('Player death event received' + this.player);
            this.startModelLoopedAnimations(['sleep']);

        }
    }

    // Add this method to flash the player model red
    private flashRed() {
        if (!this.isSpawned) return;

        console.log('Flashing red for ' + this.player.username);
        // Set tint to red
        //this.setTintColor({ r: 200, g: 0, b: 0 });
        this.light?.setColor({ r: 250, g: 0, b: 0 });
        //this.respawn();

        // Reset after delay

        setTimeout(() => {
            console.log('Resetting tint to white');
            //    this.setTintColor({ r: 255, g: 255, b: 255 }); // Reset to white
            this.light?.setColor({ r: 255, g: 255, b: 255 });
        }, 200);
    }

    public respawn() {
        this.health = 100;
        this.stamina = 100;
        this.mana = 100;
        this.updateUI();
    }

    // Add helper methods to check state
    isDead(): boolean {
        return this.health <= 0;
    }

    public hasFullHealth(): boolean {
        return this.health === 100;
    }
    
    heal(amount: number) {
        this.health = Math.min(this.health + amount, 100);

        this.updateUI();
        
        // Update nameplate health
        if (this.nameplateUI) {
            this.nameplateUI.setState({
                health: this.health
            });
        }
    }

    useStamina(amount: number) {
        this.stamina = Math.max(this.stamina - amount, 0);
        this.updateUI();
    }

    useMana(amount: number) {
        this.mana = Math.max(this.mana - amount, 0);
        this.updateUI();
    }

    regenerateStamina(amount: number) {
        this.stamina = Math.min(this.stamina + amount, 100);
        this.updateUI();
    }

    regenerateMana(amount: number) {
        this.mana = Math.min(this.mana + amount, 100);
        this.updateUI();
    }
}