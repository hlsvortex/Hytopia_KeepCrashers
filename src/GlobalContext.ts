import { World } from 'hytopia';
import { GameManager } from './GameManager';
import { ParticlePool } from './particles/ParticlePool';


export let world: World;
export let gameManager: GameManager;
export let particlePool: ParticlePool;

// Chat utility functions
export function sendChatMessage(message: string, color?: string) {
    if (world && world.chatManager) {
        if (color) {
            // First, ensure the color is a valid hex color (either with or without #)
            let formattedColor = color.startsWith('#') ? color.substring(1) : color;
            
            // Ensure it's exactly 6 characters long
            if (formattedColor.length !== 6) {
                console.warn(`Invalid color format: ${color}. Using default color.`);
                world.chatManager.sendBroadcastMessage(message);
            } else {
                // Log the message and color for debugging
                console.log(`Sending broadcast message with color: ${formattedColor}`);
                world.chatManager.sendBroadcastMessage(message, formattedColor);
            }
        } else {
            world.chatManager.sendBroadcastMessage(message);
        }
    } else {
        console.warn('Cannot send chat message: world or chatManager not initialized');
    }
}

export function sendPlayerChatMessage(player: any, message: string, color?: string) {
    if (world && world.chatManager && player) {
        if (color) {
            // First, ensure the color is a valid hex color (either with or without #)
            let formattedColor = color.startsWith('#') ? color.substring(1) : color;
            
            // Ensure it's exactly 6 characters long
            if (formattedColor.length !== 6) {
                console.warn(`Invalid color format: ${color}. Using default color.`);
                world.chatManager.sendPlayerMessage(player, message);
            } else {
                // Log the message and color for debugging
                console.log(`Sending player message to ${player.username} with color: ${formattedColor}`);
                world.chatManager.sendPlayerMessage(player, message, formattedColor);
            }
        } else {
            world.chatManager.sendPlayerMessage(player, message);
        }
    } else {
        console.warn('Cannot send player chat message: world, chatManager, or player not available');
    }
}

export function setWorld(newWorld: World) {
    world = newWorld;
    particlePool = new ParticlePool();
    
    // Pre-warm pools for commonly used effects to prevent lag on first use
    console.log("Pre-warming particle pools...");
    
    // Import ParticleFX to initialize common pools
    import('./particles/ParticleFX').then(({ ParticleFX }) => {
        // Common combat effects
        particlePool.initializePool(ParticleFX.BLOODHIT, 20);
        particlePool.initializePool(ParticleFX.EXPLOSION_SMALL, 10);
        particlePool.initializePool(ParticleFX.CLOUD_PUFF, 20);
        
        console.log("Particle pools initialized");
    }).catch(err => {
        console.error("Failed to pre-warm particle pools:", err);
    });
}

export function initializeGameManager() {
    gameManager = new GameManager(world);
} 