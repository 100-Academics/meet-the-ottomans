import { npc } from "../npc";
import { Entity } from "playcanvas";

export class Boss extends npc {
    private healthBarEl: HTMLElement | null = null;
  private fillEl: HTMLElement | null = null;

    
    constructor(id: number, maxHealth: number, entity: Entity = new Entity("boss")) {
        super(id, "foe", maxHealth, entity);
    }

    public drawHealthBar(): void {
        if (this.healthBarEl) return;

        const bar = document.createElement("div");
        bar.id = "boss-health-bar";
        bar.style.position = "fixed";
        bar.style.top = "16px";
        bar.style.left = "50%";
        bar.style.transform = "translateX(-50%)";
        bar.style.width = "min(600px, 80vw)";
        bar.style.height = "22px";
        bar.style.background = "rgba(0,0,0,0.75)";
        bar.style.border = "2px solid #fff";
        bar.style.zIndex = "9999";

        const fill = document.createElement("div");
        fill.style.height = "100%";
        fill.style.width = "100%";
        fill.style.background = "#b30000";

        bar.appendChild(fill);
        document.body.appendChild(bar);

        this.healthBarEl = bar;
        this.fillEl = fill;
        this.updateHealthBar();
    }

    public updateHealthBar(): void {
        if (!this.fillEl) return;
        const pct = (this.getHealth() / this.getMaxHealth()) * 100;
        this.fillEl.style.width = `${Math.max(0, pct)}%`;
    }

    public removeHealthBar(): void {
        this.healthBarEl?.remove();
        this.healthBarEl = null;
        this.fillEl = null;
    }
}