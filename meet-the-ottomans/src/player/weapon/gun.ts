// TODO: Implement gun mechanics, including shooting and reloading. 
// A bow is just a gun with a slow bullet speed and slow reload time, 
// so just make a weapon of Gun class for early time periods. 
// Or make a bow class tha extends Gun if we can 

import { Weapon } from "./weapon";

export class Gun extends Weapon {
    
    private ammo: number;

    constructor(name: string, damage: number, range: number, ammo: number) {
        super(name, damage, range);
        this.ammo = ammo;
    }

    public getAmmo(): number {
        return this.ammo;
    }

    public shoot(): void {
        if (this.ammo > 0) {
            this.ammo--;
            console.log(`${this.getName()} fired! Remaining ammo: ${this.ammo}`);
        } else {
            console.log(`${this.getName()} is out of ammo!`);
        }
    }

    public reload(amount: number): void {
        this.ammo += amount;
        console.log(`${this.getName()} reloaded! Current ammo: ${this.ammo}`);
    }

}