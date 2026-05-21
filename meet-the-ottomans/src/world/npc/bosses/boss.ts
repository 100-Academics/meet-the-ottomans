import { npc } from "../npc";
import { Entity } from "playcanvas";

export class Boss extends npc {
    private healthBarEl: HTMLElement | null = null;
    private fillEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private title = "Boss";

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("boss"), title?: string) {
        super(id, "foe", maxHealth, entity);
        if (title && title.trim()) {
            this.title = title.trim();
        }
    }

    public getTitle(): string {
        return this.title;
    }

    public setTitle(title: string): void {
        if (!title || !title.trim()) {
            return;
        }

        this.title = title.trim();
        if (this.titleEl) {
            this.titleEl.textContent = this.title;
        }
    }

    private buildHealthBar(bar: HTMLElement): void {
        bar.className = "boss-health-bar";
        bar.innerHTML = "";

        const title = document.createElement("div");
        title.className = "boss-health-title";
        title.textContent = this.title;

        const track = document.createElement("div");
        track.className = "boss-health-track";

        const fill = document.createElement("div");
        fill.className = "boss-health-fill";

        track.appendChild(fill);
        bar.appendChild(title);
        bar.appendChild(track);

        this.healthBarEl = bar;
        this.titleEl = title;
        this.fillEl = fill;
    }

    public drawHealthBar(): void {
        if (this.healthBarEl) {
            if (!this.titleEl || !this.fillEl) {
                this.buildHealthBar(this.healthBarEl);
            }
            if (this.titleEl) {
                this.titleEl.textContent = this.title;
            }
            this.updateHealthBar();
            return;
        }

        const existingBar = document.getElementById("boss-health-bar");
        if (existingBar) {
            this.buildHealthBar(existingBar);
            this.updateHealthBar();
            return;
        }

        const bar = document.createElement("div");
        bar.id = "boss-health-bar";
        this.buildHealthBar(bar);

        document.body.appendChild(bar);
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
        this.titleEl = null;
        this.fillEl = null;
    }

    // Ensure health bar is removed when boss dies
    public kill(): boolean {
        const didKill = super.kill();
        if (didKill) {
            try {
                this.removeHealthBar();
            } catch (e) {
                // ignore
            }
        }
        return didKill;
    }
}