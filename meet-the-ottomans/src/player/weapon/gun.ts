import { AppBase, Entity, Vec3 } from 'playcanvas';
import { Weapon } from "./weapon";

export class Gun extends Weapon {
    
    private ammo: number;

    constructor(damage: number, range: number, ammo: number) {
        super("Gun", damage, range);
        this.ammo = ammo;
    }

    public getAmmo(): number {
        return this.ammo;
    }

    public shoot(app?: AppBase, origin?: Vec3, direction?: Vec3): boolean {
        if (this.ammo <= 0) {
            console.log(`${this.getName()} is out of ammo!`);
            return false;
        }

        this.ammo -= 1;
        console.log(`${this.getName()} fired! Remaining ammo: ${this.ammo}`);

        const sceneApp = app ?? (globalThis as { app?: AppBase }).app;
        if (!sceneApp?.root) {
            return false; // Can't create shot effect without a valid app and root entity
        }

        const shotOrigin = origin?.clone() ?? new Vec3(0, 0, 0);
        const shotDirection = direction?.clone() ?? new Vec3(0, 0, -1);
        if (shotDirection.lengthSq() <= 0.0001) {
            shotDirection.set(0, 0, -1);
        }
        shotDirection.normalize();

        const shotLength = Math.max(this.getRange(), 1);
        const shotMidpoint = shotOrigin.clone().add(shotDirection.clone().mulScalar(shotLength * 0.5));
        const shotEntity = new Entity(`${this.getName()} shot`);
        shotEntity.setPosition(shotMidpoint);
        shotEntity.lookAt(shotMidpoint.clone().add(shotDirection));

        const tracer = new Entity(`${this.getName()} shot tracer`);
        tracer.addComponent('render', { type: 'box' } as any);
        tracer.setLocalScale(0.08, 0.08, shotLength);

        shotEntity.addChild(tracer);
        sceneApp.root.addChild(shotEntity);

        window.setTimeout(() => {
            shotEntity.destroy();
        }, 500);

        return true;
    }

    public reload(amount: number): void {
        this.ammo += Math.max(0, amount);
        console.log(`${this.getName()} reloaded! Current ammo: ${this.ammo}`);
    }

}