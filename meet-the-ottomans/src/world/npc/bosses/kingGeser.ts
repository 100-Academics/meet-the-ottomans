import { Boss } from "./boss";
import { Entity } from "playcanvas";

export class KingGeser extends Boss {
    constructor(id: number, maxHealth: number) {
        super(id, maxHealth, new Entity("King Geser"), "King Geser");
    }
}