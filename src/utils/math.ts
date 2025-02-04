import type { Vector3Like, QuaternionLike, Entity, Quaternion } from 'hytopia';
import { Vector3 } from 'hytopia';

export function getRotationFromDirection(direction: Vector3Like): QuaternionLike {
    // Calculate yaw (rotation around Y-axis)
    const yaw = Math.atan2(-direction.x, -direction.z);

    // Calculate pitch (rotation around X-axis)
    const pitch = Math.asin(direction.y);

    // Pre-calculate common terms
    const halfYaw = yaw * 0.5;
    const halfPitch = pitch * 0.5;
    const cosHalfYaw = Math.cos(halfYaw);
    const sinHalfYaw = Math.sin(halfYaw);
    const cosHalfPitch = Math.cos(halfPitch);
    const sinHalfPitch = Math.sin(halfPitch);

    // Convert to quaternion
    return {
        x: sinHalfPitch * cosHalfYaw,
        y: sinHalfYaw * cosHalfPitch,
        z: sinHalfYaw * sinHalfPitch,
        w: cosHalfPitch * cosHalfYaw,
    };
} 

export function scaleDirection(direction: Vector3, distance: number) : Vector3
{
    const normalizedDir = direction.normalize();
    const offset = new Vector3(
        normalizedDir.x * distance,
        normalizedDir.y * distance,
        normalizedDir.z * distance

    );

    return offset;
}


export function faceDirection(wantedDirection: Vector3Like): QuaternionLike {
    const direction = Vector3.fromVector3Like(wantedDirection).normalize();

    // Calculate yaw (rotation around Y-axis)
    const yaw = Math.atan2(direction.x, direction.z);

    // Calculate pitch (rotation around X-axis)
    const pitch = Math.asin(direction.y);

    // Create quaternions for each axis rotation
    const halfYaw = yaw * 0.5;
    const halfPitch = -pitch * 0.5;

    // Pre-calculate trigonometric values
    const cosY = Math.cos(halfYaw);
    const sinY = Math.sin(halfYaw);
    const cosP = Math.cos(halfPitch);
    const sinP = Math.sin(halfPitch);

    // Correct quaternion multiplication order: pitch first, then yaw (qPitch * qYaw)
    return {
        x: sinP * cosY,
        y: sinY * cosP,
        z: -sinY * sinP,  // Note the negative sign here
        w: cosY * cosP
    };
}