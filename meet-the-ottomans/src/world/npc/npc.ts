import { AppBase, Entity } from "playcanvas";

export class npc {
    private id: number;
    private team: string;
    private maxHealth: number;
    private health: number;
    private entity: Entity;

    constructor(id: number, team: string, maxHealth: number, entity: Entity = new Entity()) {
        if(team !== "friend" && team !== "foe"){ 
            //ensure the game knows how to handle the npc behavior based on team
            throw new Error("Team must be either 'friend' or 'foe'");
        }
        this.entity = entity;
        this.id = id;
        this.team = team;
        this.maxHealth = maxHealth;
        this.health = maxHealth;
    }

    public getId(): number {
        return this.id;
    }

    public getTeam(): string {
        return this.team;
    }

    public getHealth(): number {
        return this.health;
    }

    public getEntity(): Entity {
        return this.entity;
    }

    public takeDamage(damage: number): boolean {
        this.health -= damage;
        console.log(`NPC ${this.id} took ${damage} damage, health now ${this.health}`);
        if (this.kill()){
            return true; // NPC is killed
        }
        return false; // NPC is still alive
    }

    public kill(): boolean {
        if (this.health <= 0) {
            this.entity.destroy();
            return true;
        }
        return false;
    }
}