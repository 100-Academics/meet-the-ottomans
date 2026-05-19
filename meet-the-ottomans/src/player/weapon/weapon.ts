import { AppBase, Entity, Vec3 } from 'playcanvas';
import { npc } from '../../world/npc/npc';

export class Weapon {

    private name: string;
    private damage: number;
    private range: number;

    constructor(name: string,
                damage: number,
                range: number) {
        this.name = name;
        this.damage = damage;
        this.range = range;
    }

    public getName(): string {
        return this.name;
    }

    public getDamage(): number {
        return this.damage;
    }

    public getRange(): number {
        return this.range;
    }

    // Raycast helper moved into Weapon so hit-checking is owned by weapons.
    public static getClickedNpcInRange(app: AppBase, cameraEntity: Entity | undefined | null, screenX: number, screenY: number, npcs: npc[], maxRange: number): npc | null {
        if (!Number.isFinite(maxRange) || maxRange <= 0) {
            return null;
        }

        const camera = cameraEntity?.camera;
        if (!camera) {
            return null;
        }

        const rigidbodySystem = (app.systems as {
            rigidbody?: {
                raycastFirst?: (start: Vec3, end: Vec3) => { entity?: Entity | null; point?: Vec3 } | null;
            };
        }).rigidbody;

        if (!rigidbodySystem || typeof rigidbodySystem.raycastFirst !== 'function') {
            return null;
        }

        const rayStart = camera.screenToWorld(screenX, screenY, camera.nearClip);
        const rayEnd = camera.screenToWorld(screenX, screenY, camera.farClip);
        const hit = rigidbodySystem.raycastFirst(rayStart, rayEnd);

        if (!hit?.entity) {
            return null;
        }

        const isEntityOrDescendantOf = (entity: Entity | null, root: Entity): boolean => {
            let current: Entity | null = entity;
            while (current) {
                if (current === root) {
                    return true;
                }
                current = (current.parent as Entity | null) ?? null;
            }
            return false;
        };

        const clickedNpc = npcs.find((currentNpc) => isEntityOrDescendantOf(hit.entity ?? null, currentNpc.getEntity()));
        if (!clickedNpc) {
            return null;
        }

        const distance = hit.point
            ? cameraEntity!.getPosition().distance(hit.point)
            : cameraEntity!.getPosition().distance(hit.entity.getPosition());

        return distance <= maxRange ? clickedNpc : null;
    }

}