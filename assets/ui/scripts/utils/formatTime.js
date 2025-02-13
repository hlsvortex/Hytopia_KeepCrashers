export function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
     
} 