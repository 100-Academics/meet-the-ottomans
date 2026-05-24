import { Boss } from "./boss";
import { Entity } from "playcanvas";

export class KingGeser extends Boss {
    constructor(id: number, maxHealth: number, entity: Entity = new Entity("King Geser")) {
        super(id, maxHealth, entity, "King Geser");
    }
}