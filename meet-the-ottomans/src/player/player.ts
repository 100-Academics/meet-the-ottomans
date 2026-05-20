import { AppBase, Entity, Color, Vec3 } from 'playcanvas';
import { FirstPersonCamera } from './FirstPersonCamera';
import { unloadAll } from '../util/unloadall';
import { changeScene } from '../App';
import { npc } from '../world/npc/npc';
import { Weapon } from './weapon/weapon';
import { Gun } from './weapon/gun';
import { Sword } from './weapon/sword';
import { Bow } from './weapon/bow';


export class Player{
    private cameraEntity: Entity;
    private cameraController: FirstPersonCamera | undefined;
    private app: AppBase;
    private maxHealth = 100;
    private health = this.maxHealth;
    private team = 'friend'; // Player is always on the 'friend' team
    private readonly swordWeapon = new Sword(4, 25);
    private readonly gunWeapon = new Gun(100, 100, 12);
    private readonly bowWeapon = new Bow(50, 100, 20);
    private equippedWeapon: Weapon = this.swordWeapon;

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
        return this.equippedWeapon.getDamage();
    }

    public getAttackRange(): number {
        return this.equippedWeapon.getRange();
    }

    public getEquippedWeaponName(): string {
        return this.equippedWeapon.getName();
    }

    public equipWeapon(slot: 1 | 2 | 3): void {
        if (slot === 1) {
            this.equippedWeapon = this.swordWeapon;
        } else if (slot === 2) {
            this.equippedWeapon = this.gunWeapon;
        } else {
            this.equippedWeapon = this.bowWeapon;
        }
        console.log(`Equipped ${this.equippedWeapon.getName()}`);
    }

    public reloadEquippedWeapon(amount: number = 12): void {
        if (this.equippedWeapon instanceof Gun) {
            this.equippedWeapon.reload(amount);
        }
    }

    public attack(target?: npc | null): void {
        if (this.equippedWeapon instanceof Bow) {
            this.equippedWeapon.shoot(this.app, this.cameraEntity.getPosition(), this.cameraEntity.forward, target ?? null);
            return;
        }

        let canDealDamage = true;

        if (this.equippedWeapon instanceof Gun) {
            canDealDamage = this.equippedWeapon.shoot(this.app, this.cameraEntity.getPosition(), this.cameraEntity.forward);
        }

        if (!target || !canDealDamage) {
            return;
        }

        if (target.getTeam() !== 'foe') {
            console.log('Attempted to deal damage to a friendly NPC. No damage applied.');
            return;
        }

        target.takeDamage(this.getDamageAmount());
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