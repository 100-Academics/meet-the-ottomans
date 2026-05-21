import { Entity } from "playcanvas";
import { Boss } from "./boss";

export class GenghisKhan extends Boss {
    constructor(id: number, maxHealth: number, entity: Entity = new Entity("genghisKhan")) {
        super(id, maxHealth, entity);
    }
}