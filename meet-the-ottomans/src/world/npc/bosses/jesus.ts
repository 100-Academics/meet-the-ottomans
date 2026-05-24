import { Boss } from "./boss";
import { Entity } from "playcanvas";

export class Christ extends Boss {
    constructor(id: number, maxHealth: number, entity: Entity = new Entity("Jesus Christ")) {
        super(id, maxHealth, entity, "Jesus Christ");
    }
}