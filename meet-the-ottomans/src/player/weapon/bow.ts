import { AppBase, Entity, Vec3 } from 'playcanvas';
import { Weapon } from "./weapon";

export class Bow extends Weapon {
    
    private arrows: number;
    private drawTimeMs: number;
    private isDrawing: boolean = false;

    constructor(damage: number, range: number, arrows: number, drawTimeMs: number = 800) {
        super("Bow", damage, range);
        this.arrows = arrows;
        this.drawTimeMs = drawTimeMs; 
    }

    public getArrows(): number {
        return this.arrows;
    }

    public shoot(app?: AppBase, origin?: Vec3, direction?: Vec3): boolean {
        if (this.arrows <= 0) {
            console.log(`${this.getName()} is out of arrows!`);
            return false;
        }

        if (this.isDrawing) {
            console.log(`${this.getName()} is currently being drawn...`);
            return false; 
        }

        this.isDrawing = true;
        console.log(`Drawing ${this.getName()}...`);

        window.setTimeout(() => {
            
            this.isDrawing = false;

            if (this.arrows <= 0) return;

            this.arrows -= 1;
            console.log(`${this.getName()} fired! Remaining arrows: ${this.arrows}`);

            const sceneApp = app ?? (globalThis as { app?: AppBase }).app;
            if (!sceneApp?.root) {
                return; 
            }

            const hitscanOrigin = origin?.clone() ?? new Vec3(0, 0, 0);
            const hitscanDirection = direction?.clone() ?? new Vec3(0, 0, -1);
            
            if (hitscanDirection.lengthSq() <= 0.0001) {
                hitscanDirection.set(0, 0, -1);
            }
            hitscanDirection.normalize();

            // ==========================================
            // OPTION 1: HITSCAN (Current Implementation)
            // ==========================================
            const hitscanLength = Math.max(this.getRange(), 1); 
            
            // NOTE: PlayCanvas physics instant raycast for Hitscan:
            // const endPos = hitscanOrigin.clone().add(hitscanDirection.clone().mulScalar(hitscanLength));
            // const hit = sceneApp.systems.rigidbody?.raycastFirst(hitscanOrigin, endPos);
            // if (hit) { 
            //     console.log("Hitscan struck an entity: ", hit.entity.name);
            //     // Apply damage to hit.entity here...
            //     // hitscanLength = hitOriginToHitDistance; // Shorten the visual beam to stop at the wall/enemy
            // }

            // Calculate midpoint so the box scales outwards perfectly from the origin
            const hitscanMidpoint = hitscanOrigin.clone().add(hitscanDirection.clone().mulScalar(hitscanLength * 0.5));
            
            const hitscanEntity = new Entity(`${this.getName()} hitscan beam`);
            hitscanEntity.setPosition(hitscanMidpoint);
            hitscanEntity.lookAt(hitscanMidpoint.clone().add(hitscanDirection));

            const hitscanMesh = new Entity(`${this.getName()} hitscan mesh`);
            hitscanMesh.addComponent('render', { type: 'box' } as any);
            hitscanMesh.setLocalScale(0.02, 0.02, hitscanLength);

            hitscanEntity.addChild(hitscanMesh);
            sceneApp.root.addChild(hitscanEntity);

            // Despawn the hitscan beam rapidly
            window.setTimeout(() => {
                hitscanEntity.destroy();
            }, 100);

            /*
            // ==========================================
            // OPTION 2: PHYSICAL PROJECTILE (Alternative)
            // ==========================================
            // Instead of an instant raycast and an instant beam, you would spawn 
            // a dynamic entity that travels through the world over time.
            
            const arrowEntity = new Entity(`${this.getName()} projectile`);
            arrowEntity.setPosition(hitscanOrigin);
            arrowEntity.lookAt(hitscanOrigin.clone().add(hitscanDirection));

            // Add visual mesh
            arrowEntity.addComponent('render', { type: 'cylinder' } as any);
            arrowEntity.setLocalScale(0.02, 0.02, 1.0);

            // Add physics components (Requires Ammo.js physics to be enabled in PlayCanvas)
            arrowEntity.addComponent('collision', { type: 'cylinder', radius: 0.01, height: 1.0 });
            arrowEntity.addComponent('rigidbody', { 
                type: 'dynamic', 
                mass: 0.1, 
                friction: 0.5, 
                restitution: 0 
            });

            sceneApp.root.addChild(arrowEntity);

            // Apply forward velocity/impulse to shoot the arrow
            const speed = 50; // Adjust for arrow speed
            const velocity = hitscanDirection.clone().mulScalar(speed);
            arrowEntity.rigidbody?.applyImpulse(velocity);

            // Listen for collisions to deal damage and stop the arrow
            arrowEntity.collision?.on('collisionstart', (result) => {
                console.log("Arrow hit: ", result.other.name);
                // Apply damage to result.other here...
                
                // Optional: Make the arrow stick to the target or destroy it
                arrowEntity.destroy(); 
            });
            */

        }, this.drawTimeMs);

        return true; 
    }

    public reload(amount: number): void {
        this.arrows += Math.max(0, amount);
        console.log(`${this.getName()} restocked! Current arrows: ${this.arrows}`);
    }

}