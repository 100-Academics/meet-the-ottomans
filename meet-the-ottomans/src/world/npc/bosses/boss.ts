import { npc } from "../npc";
import { Entity } from "playcanvas";

export class Boss extends npc {
    private healthBarEl: HTMLElement | null = null;
    private fillEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private statusEl: HTMLElement | null = null;
    private statusTimeoutId: number | undefined;
    private title = "Boss";
    private taunts: string[] = [
        "You cannot stop me.",
        "Your courage ends here.",
        "This battle is mine.",
        "Kneel before me.",
        "You are already defeated."
    ];
    private tauntMinDelaySeconds = 6;
    private tauntMaxDelaySeconds = 12;
    private tauntDurationMs = 2200;
    private nextTauntAtSeconds: number | null = null;
    private lastTauntIndex: number | null = null;

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

    public setTaunts(taunts: string[]): void {
        if (!Array.isArray(taunts)) {
            return;
        }

        const trimmed = taunts.map(taunt => taunt.trim()).filter(Boolean);
        this.taunts = trimmed;
        this.lastTauntIndex = null;
        this.nextTauntAtSeconds = null;
    }

    public setTauntIntervalSeconds(minSeconds: number, maxSeconds: number): void {
        if (!Number.isFinite(minSeconds) || !Number.isFinite(maxSeconds)) {
            return;
        }

        const safeMin = Math.max(1, minSeconds);
        const safeMax = Math.max(safeMin, maxSeconds);
        this.tauntMinDelaySeconds = safeMin;
        this.tauntMaxDelaySeconds = safeMax;
        this.nextTauntAtSeconds = null;
    }

    private scheduleNextTaunt(nowSeconds: number): void {
        const min = Math.max(1, this.tauntMinDelaySeconds);
        const max = Math.max(min, this.tauntMaxDelaySeconds);
        this.nextTauntAtSeconds = nowSeconds + min + (Math.random() * (max - min));
    }

    private pickRandomTaunt(): string | null {
        if (this.taunts.length === 0) {
            return null;
        }

        if (this.taunts.length === 1) {
            this.lastTauntIndex = 0;
            return this.taunts[0];
        }

        let index = Math.floor(Math.random() * this.taunts.length);
        if (this.lastTauntIndex !== null && this.taunts.length > 1) {
            if (index === this.lastTauntIndex) {
                index = (index + 1) % this.taunts.length;
            }
        }

        this.lastTauntIndex = index;
        return this.taunts[index];
    }

    private updateTaunt(nowSeconds: number, playerEntity?: Entity | null): void {
        if (!this.isAlive()) {
            return;
        }

        if (!playerEntity) {
            return;
        }

        if (this.taunts.length === 0) {
            return;
        }

        if (this.nextTauntAtSeconds === null) {
            this.scheduleNextTaunt(nowSeconds);
            return;
        }

        if (nowSeconds < this.nextTauntAtSeconds) {
            return;
        }

        const taunt = this.pickRandomTaunt();
        if (taunt) {
            this.showStatusText(taunt, this.tauntDurationMs);
        }

        this.scheduleNextTaunt(nowSeconds);
    }

    private buildHealthBar(bar: HTMLElement): void {
        bar.className = "boss-health-bar";
        bar.innerHTML = "";
        this.statusEl = null;

        const title = document.createElement("div");
        title.className = "boss-health-title";
        title.textContent = this.title;

        const track = document.createElement("div");
        track.className = "boss-health-track";

        const fill = document.createElement("div");
        fill.className = "boss-health-fill";

        const status = document.createElement("div");
        status.className = "boss-health-status";
        status.style.display = "none";

        track.appendChild(fill);
        bar.appendChild(title);
        bar.appendChild(track);
        bar.appendChild(status);

        this.healthBarEl = bar;
        this.titleEl = title;
        this.fillEl = fill;
        this.statusEl = status;
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

    public override updateCombatAI(
        deltaTime: number,
        currentTimeSeconds: number,
        allNpcs: npc[],
        onNpcAttack?: (attacker: npc, target: npc, damage: number) => void,
        playerEntity?: Entity | null,
        onPlayerAttack?: (attacker: npc, damage: number) => void
    ): void {
        super.updateCombatAI(deltaTime, currentTimeSeconds, allNpcs, onNpcAttack, playerEntity, onPlayerAttack);
        this.updateTaunt(currentTimeSeconds, playerEntity);
    }

    public showStatusText(message: string, durationMs: number = 3000): void {
        if (!message || !message.trim()) {
            return;
        }

        if (!this.healthBarEl) {
            this.drawHealthBar();
        }

        if (!this.healthBarEl) {
            return;
        }

        if (!this.statusEl) {
            const status = document.createElement("div");
            status.className = "boss-health-status";
            status.style.display = "none";
            this.healthBarEl.appendChild(status);
            this.statusEl = status;
        }

        this.statusEl.textContent = message.trim();
        this.statusEl.style.display = "block";

        if (this.statusTimeoutId !== undefined) {
            window.clearTimeout(this.statusTimeoutId);
            this.statusTimeoutId = undefined;
        }

        this.statusTimeoutId = window.setTimeout(() => {
            if (this.statusEl) {
                this.statusEl.textContent = "";
                this.statusEl.style.display = "none";
            }
            this.statusTimeoutId = undefined;
        }, Math.max(0, durationMs));
    }

    public removeHealthBar(): void {
        if (this.statusTimeoutId !== undefined) {
            window.clearTimeout(this.statusTimeoutId);
            this.statusTimeoutId = undefined;
        }
        this.statusEl?.remove();
        this.statusEl = null;
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
                this.nextTauntAtSeconds = null;
                this.lastTauntIndex = null;
                this.removeHealthBar();
            } catch (e) {
                // ignore
            }
        }
        return didKill;
    }

    protected override getCombatProfile() {
        const baseProfile = super.getCombatProfile();
        return {
            ...baseProfile,
            detectionRange: Number.POSITIVE_INFINITY
        };
    }
}