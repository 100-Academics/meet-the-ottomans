import { AppBase, Entity, Vec3 } from 'playcanvas';
import { Weapon } from "./weapon";

export class Gun extends Weapon {
    // Ammo mechanic removed: guns fire without consuming or tracking rounds.

    constructor(damage: number, range: number, _ammo: number, name: string = "Gun") {
        super(name, damage, range);
    }

    public getAmmo(): number {
        return Infinity;
    }

    public shoot(app?: AppBase, origin?: Vec3, direction?: Vec3): boolean {
        const sceneApp = app ?? (globalThis as { app?: AppBase }).app;
        if (!sceneApp?.root) {
            return false;
        }

        const shotOrigin = origin?.clone() ?? new Vec3(0, 0, 0);
        const shotDirection = direction?.clone() ?? new Vec3(0, 0, -1);
        if (shotDirection.lengthSq() <= 0.0001) {
            shotDirection.set(0, 0, -1);
        }
        shotDirection.normalize();

        // Tracer is just a visual effect — don't stretch it to the full
        // weapon range (1000+ units), that makes it look like a solid wall of
        // geometry floating in front of the camera. A short streak is enough
        // to sell the shot without obstructing the view.
        const tracerLength = Math.min(this.getRange(), 12);
        const shotMidpoint = shotOrigin.clone().add(shotDirection.clone().mulScalar(tracerLength * 0.5));
        const shotEntity = new Entity(`${this.getName()} shot`);
        shotEntity.setPosition(shotMidpoint);
        shotEntity.lookAt(shotMidpoint.clone().add(shotDirection));

        const tracer = new Entity(`${this.getName()} shot tracer`);
        tracer.addComponent('render', { type: 'box' } as any);
        tracer.setLocalScale(0.08, 0.08, tracerLength);

        shotEntity.addChild(tracer);
        sceneApp.root.addChild(shotEntity);

        window.setTimeout(() => {
            shotEntity.destroy();
        }, 150);

        return true;
    }
}
