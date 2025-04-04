import { Entity, Light, PlayerEntity, SceneUI, Audio, EntityEvent } from 'hytopia';
import type { PlayerDeathEventPayload } from './events';
import { PlayerEvents } from './events';
import { PlayerMatchStats } from './PlayerMatchStats';
import { gameManager } from './GlobalContext';
import { world } from './GlobalContext';

export class DamageableEntity extends PlayerEntity {

    public matchStats = new PlayerMatchStats();

    public health: number;
    public stamina: number;
    public mana: number;
    public maxHealth: number = 100;
    light?: Light;
    nameplateUI?: SceneUI;
    hideNameplate: boolean = false;    
    private lastHeightDamageTime: number = 0;
    private readonly HEIGHT_DAMAGE_INTERVAL = 500; // 1 second in milliseconds

    private static readonly DAMAGE_SOUNDS = {
        LIGHT: {
            uri: 'audio/sfx/damage/hit.mp3',
            volume: 0.5
        },
        MEDIUM: {
            uri: 'audio/sfx/damage/hit.mp3',
            volume: 0.6
        },
        HEAVY: {
            uri: 'audio/sfx/damage/hit.mp3',
            volume: 0.7
        }
    };

	onTick = (payload: { entity: Entity; tickDeltaMs: number }) => {
		
		if (payload.entity.position.y > 2.2) {
			return;
		}
		// Use payload.tickDeltaMs
		const currentTime = Date.now();
		if (currentTime - this.lastHeightDamageTime >= this.HEIGHT_DAMAGE_INTERVAL) {
				this.takeDamage(25);
			this.lastHeightDamageTime = currentTime;
		}
	}

    constructor(options: any, initialHealth: number = 100, initialStamina: number = 100, initialMana: number = 100) {
        super(options);
        this.maxHealth = initialHealth;
        this.health = initialHealth;
        this.stamina = initialStamina;
        this.mana = initialMana;

		this.nametagSceneUI.setViewDistance(0);

		this.on(EntityEvent.TICK, this.onTick);
		

		console.log('DamageableEntity constructor', options.player.id);
    }

    updateUI() {
        if (!this.player || !this.player.ui) return;
        
        this.player.ui.sendData({
            type: 'statsUpdate',
            health: this.health,
            maxHealth: this.maxHealth,
            mana: this.mana,
            stamina: this.stamina
        });

        if (this.nameplateUI) {
            this.nameplateUI.setState({
                health: this.health,
                maxHealth: this.maxHealth,
                hidden: this.hideNameplate,
                playerId: this.player?.id
            });
        }
    }

    takeDamage(amount: number, source?: DamageableEntity) {
        if (this.health <= 0) return;
        
        // Don't allow damage between teammates but can damage self
        if (source && source.id != this.id) {
            const sourceTeam = gameManager.getPlayerTeam(source?.player);
            const targetTeam = gameManager.getPlayerTeam(this.player);

            if (sourceTeam && targetTeam && sourceTeam.name === targetTeam.name) {
                return;
            }
        }

        // Play damage sound based on amount
        this.handleDamageSound(amount);
        this.health = Math.max(0, this.health - amount);
        this.updateUI();
        this.flashRed();

        if (this.health <= 0) {
            if (this.world) {
				this.world.emit( PlayerEvents.Death, { 
                    player: this.player,
                    deathTime: Date.now(),
                    victim: this,
                    killer: source !== this ? source : undefined
                });
                
                // Send kill message to chat
                if (source && source !== this) {
                    const sourceTeam = gameManager.getPlayerTeam(source.player);
                    const victimTeam = gameManager.getPlayerTeam(this.player);
                    const killerColor = sourceTeam?.color?.replace('#', '') || 'FFFFFF';
                    const victimColor = victimTeam?.color?.replace('#', '') || 'FFFFFF';
                    
                    // Format: [Team] Killer eliminated [Team] Victim!
                    this.world.chatManager.sendBroadcastMessage(
                        `[${sourceTeam?.name}] ${source.player.username} eliminated [${victimTeam?.name}] ${this.player.username}!`,
                        killerColor
                    );
                } else {
                    // Self-elimination or environment kill
                    const victimTeam = gameManager.getPlayerTeam(this.player);
                    this.world.chatManager.sendBroadcastMessage(
                        `[${victimTeam?.name}] ${this.player.username} eliminated themselves!`,
                        'FF0000'
                    );
                }
            }

            console.log('Player death event received' + this.player);
            this.startModelLoopedAnimations(['sleep']);
        }
    }

    private handleDamageSound(amount: number) {
        if (amount > 0 && this.world) {
            let soundEffect;
            if (amount <= 10) {
                soundEffect = DamageableEntity.DAMAGE_SOUNDS.LIGHT;
            } else if (amount <= 25) {
                soundEffect = DamageableEntity.DAMAGE_SOUNDS.MEDIUM;
            } else {
                soundEffect = DamageableEntity.DAMAGE_SOUNDS.HEAVY;
            }

            const playbackRate = Math.random() * 0.2 + 0.8;

            const damageSound = new Audio({
                uri: soundEffect.uri,
                playbackRate: playbackRate,
                volume: soundEffect.volume,
                position: this.position,
                referenceDistance: 10
            });
            damageSound.play(this.world);
        }
    }


    private flashRed() {
        if (!this.isSpawned) return;

        console.log('Flashing red for ' + this.player.username);
        // Set tint to red
        this.setTintColor({ r: 220, g: 0, b: 0 });
        this.light?.setColor({ r: 250, g: 0, b: 0 });
        //this.respawn();

        // Reset after delay
        setTimeout(() => {
            console.log('Resetting tint to white');
                this.setTintColor({ r: 255, g: 255, b: 255 }); // Reset to white
            //this.light?.setColor({ r: 255, g: 255, b: 255 });
        }, 200);
    }

    public respawn() {
        this.health = this.maxHealth;
        this.stamina = 100;
        this.mana = 100;
        this.updateUI();
    }

    isDead(): boolean {
        return this.health <= 0;
    }

    public hasFullHealth(): boolean {
        return this.health >= this.maxHealth;
    }
    
    heal(amount: number) {
        this.health = Math.min(this.health + amount, this.maxHealth);
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