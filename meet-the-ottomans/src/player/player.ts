import { AppBase, Entity, Color, Vec3 } from 'playcanvas';
import { FirstPersonCamera } from './FirstPersonCamera';
import { unloadAll } from '../util/unloadall';
import { changeScene } from '../App';
import { npc } from '../world/npc/npc';


export class Player{
    private cameraEntity: Entity;
    private cameraController: FirstPersonCamera | undefined;
    private app: AppBase;
    private maxHealth = 100;
    private health = this.maxHealth;
    private team = 'friend'; // Player is always on the 'friend' team

    constructor(app: AppBase, initialPosition: Vec3 = new Vec3(0, 8, 8)) {
        this.app = app;

        // Create the camera entity
        this.cameraEntity = new Entity('camera');
        this.cameraEntity.addComponent('camera', {
            clearColor: new Color(0.14117647, 0.14117647, 0.14117647),  // Dark gray background
            fov: 90  // 90-degree field of view
        });
        this.cameraEntity.setPosition(initialPosition);
        this.cameraEntity.lookAt(Vec3.ZERO);

        // Add first-person camera controls (WASD movement, mouse look, gravity)
        this.cameraEntity.addComponent('script');
        this.cameraController = this.cameraEntity.script?.create(FirstPersonCamera) as FirstPersonCamera | undefined;
        if (this.cameraController) {
            this.cameraController.groundTag = 'ground';  // The camera will use raycasts to detect ground collision
        }

        // Add to app root so it renders
        this.app.root.addChild(this.cameraEntity);
    }

    public getCameraEntity(): Entity {
        return this.cameraEntity;
    }

    public getCameraController(): FirstPersonCamera | undefined {
        return this.cameraController;
    }

    public setPosition(position: Vec3): void {
        this.cameraEntity.setPosition(position);
    }

    public getPosition(): Vec3 {
        return this.cameraEntity.getPosition();
    }

    public getHealth(): number {
        return this.health;
    }

    public getTeam(): string {
        return this.team;
    }

    public takeDamage(damage: number): void {
        this.health -= damage;
        if(!this.isAlive()) {
            this.health = 0; // prevent negative health
        }
        this.die(this.isAlive()); // checks for death
    }

    private die(isAlive: boolean): void {
        if (!isAlive) {
            console.log("You have failed to bring glory to the Ottoman Empire. Game Over.");
            unloadAll(this.app);
            changeScene(this.app.graphicsDevice.canvas, this.app, 666); 
            // Show death screen ^^
        }
    }

    public isAlive(): boolean {
        return this.health > 0;
    }

    private getDamageAmount(): number {
        return 25; // TODO GET WEAPON DAMAGE DYNAMICALLY 
                   // ALSO TODO set up equipped weapon etc but its midnight rn will do later
    }

    public dealDamage(npc: npc): void {
        if (npc.getTeam() === 'foe') {
            npc.takeDamage(this.getDamageAmount());
        }
        else {
            console.log("Attempted to deal damage to a friendly NPC. No damage applied.");
        }
    }
}