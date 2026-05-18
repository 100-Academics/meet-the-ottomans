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

}