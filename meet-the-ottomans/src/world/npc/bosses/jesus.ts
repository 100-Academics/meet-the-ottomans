import { Boss } from "./boss";
import { Entity } from "playcanvas";

export class Christ extends Boss {
    constructor(id: number, maxHealth: number) {
        super(id, maxHealth, new Entity("Jesus Christ"), "Jesus Christ");
    }
}