import { npc } from "../npc";
import { Entity } from "playcanvas";

type BossTauntPhase = "highHigh" | "bossLowPlayerHigh" | "playerLowBossHigh" | "bothLow";

interface BossTauntContext {
    playerHealth: number;
    playerMaxHealth: number;
}

interface BossTauntPools {
    highHigh: string[];
    bossLowPlayerHigh: string[];
    playerLowBossHigh: string[];
    bothLow: string[];
    death: string[];
    bossDeath: string[];
}

export interface BossTauntSet {
    highHealth?: string[];
    bossLowPlayerHigh?: string[];
    playerLowBossHigh?: string[];
    bothLow?: string[];
    death?: string[];
    bossDeath?: string[];
}

export class Boss extends npc {
    private static activeBoss: Boss | null = null;
    private static lastBossDeathTaunt: string | null = null;
    private healthBarEl: HTMLElement | null = null;
    private fillEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private statusEl: HTMLElement | null = null;
    private statusTimeoutId: number | undefined;
    private title = "Boss";
    protected taunts: string[] = ["You cannot stop me."];
    private tauntPools: BossTauntPools = {
        highHigh: this.taunts,
        bossLowPlayerHigh: ["You are on borrowed time."],
        playerLowBossHigh: ["Your strength is fading."],
        bothLow: ["Only one of us leaves this field."],
        death: ["This is not the end."],
        bossDeath: ["I fall, but I am not forgotten."]
    };
    private tauntMinDelaySeconds = 6;
    private tauntMaxDelaySeconds = 12;
    private tauntDurationMs = 2200;
    private nextTauntAtSeconds: number | null = null;
    private lastTauntIndex: number | null = null;
    private lastTauntPhase: BossTauntPhase | null = null;
    private tauntContext: BossTauntContext | null = null;
    private bossLowHealthThreshold = 0.35;
    private playerLowHealthThreshold = 0.35;
    private bossDeathTauntDurationMs = 2800;

    constructor(id: number, maxHealth: number, entity: Entity = new Entity("boss"), title?: string) {
        super(id, "foe", maxHealth, entity);
        if (title && title.trim()) {
            this.title = title.trim();
        }
        this.aiConfig.detectionRange = Number.MAX_VALUE;
    }

    public static setActiveBoss(boss: Boss | null): void {
        Boss.activeBoss = boss;
    }

    public static getActiveDeathTaunt(): string | null {
        return Boss.activeBoss?.getDeathTaunt() ?? null;
    }

    public static getActivePlayerDeathTaunt(): string | null {
        return Boss.activeBoss?.getDeathTaunt() ?? null;
    }

    public static consumeLastBossDeathTaunt(): string | null {
        const taunt = Boss.lastBossDeathTaunt;
        Boss.lastBossDeathTaunt = null;
        return taunt;
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
        this.setHighHealthTaunts(taunts);
    }

    public setHighHealthTaunts(taunts: string[]): void {
        this.taunts = this.normalizeTaunts(taunts);
        this.tauntPools.highHigh = this.taunts;
        this.resetTauntTimer();
    }

    public setBossLowPlayerHighTaunts(taunts: string[]): void {
        this.tauntPools.bossLowPlayerHigh = this.normalizeTaunts(taunts);
        this.resetTauntTimer();
    }

    public setPlayerLowBossHighTaunts(taunts: string[]): void {
        this.tauntPools.playerLowBossHigh = this.normalizeTaunts(taunts);
        this.resetTauntTimer();
    }

    public setBothLowHealthTaunts(taunts: string[]): void {
        this.tauntPools.bothLow = this.normalizeTaunts(taunts);
        this.resetTauntTimer();
    }

    public setDeathTaunts(taunts: string[]): void {
        this.tauntPools.death = this.normalizeTaunts(taunts);
    }

    public setBossDeathTaunts(taunts: string[]): void {
        this.tauntPools.bossDeath = this.normalizeTaunts(taunts);
    }

    public setTauntSet(tauntSet: BossTauntSet): void {
        if (tauntSet.highHealth) {
            this.setHighHealthTaunts(tauntSet.highHealth);
        }
        if (tauntSet.bossLowPlayerHigh) {
            this.setBossLowPlayerHighTaunts(tauntSet.bossLowPlayerHigh);
        }
        if (tauntSet.playerLowBossHigh) {
            this.setPlayerLowBossHighTaunts(tauntSet.playerLowBossHigh);
        }
        if (tauntSet.bothLow) {
            this.setBothLowHealthTaunts(tauntSet.bothLow);
        }
        if (tauntSet.death) {
            this.setDeathTaunts(tauntSet.death);
        }
        if (tauntSet.bossDeath) {
            this.setBossDeathTaunts(tauntSet.bossDeath);
        }
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

    public setTauntHealthThresholds(bossLowHealthThreshold: number, playerLowHealthThreshold: number): void {
        if (Number.isFinite(bossLowHealthThreshold)) {
            this.bossLowHealthThreshold = Math.min(1, Math.max(0.01, bossLowHealthThreshold));
        }
        if (Number.isFinite(playerLowHealthThreshold)) {
            this.playerLowHealthThreshold = Math.min(1, Math.max(0.01, playerLowHealthThreshold));
        }
        this.resetTauntTimer();
    }

    public setCombatContext(playerHealth: number, playerMaxHealth: number): void {
        if (!Number.isFinite(playerHealth) || !Number.isFinite(playerMaxHealth) || playerMaxHealth <= 0) {
            this.tauntContext = null;
            return;
        }

        this.tauntContext = {
            playerHealth: Math.max(0, playerHealth),
            playerMaxHealth
        };
    }

    public getDeathTaunt(): string {
        return this.pickRandomTaunt(this.tauntPools.death) ?? this.title;
    }

    public getBossDeathTaunt(): string {
        return this.pickRandomTaunt(this.tauntPools.bossDeath) ?? this.title;
    }

    private resetTauntTimer(): void {
        this.lastTauntIndex = null;
        this.lastTauntPhase = null;
        this.nextTauntAtSeconds = null;
    }

    private normalizeTaunts(taunts: string[]): string[] {
        if (!Array.isArray(taunts)) {
            return [];
        }

        return taunts.map((taunt) => taunt.trim()).filter(Boolean);
    }

    private scheduleNextTaunt(nowSeconds: number): void {
        const min = Math.max(1, this.tauntMinDelaySeconds);
        const max = Math.max(min, this.tauntMaxDelaySeconds);
        this.nextTauntAtSeconds = nowSeconds + min + (Math.random() * (max - min));
    }

    private pickRandomTaunt(taunts: string[]): string | null {
        if (taunts.length === 0) {
            return null;
        }

        if (taunts.length === 1) {
            this.lastTauntIndex = 0;
            return taunts[0];
        }

        let index = Math.floor(Math.random() * taunts.length);
        if (this.lastTauntIndex !== null && taunts.length > 1 && index === this.lastTauntIndex) {
            index = (index + 1) % taunts.length;
        }

        this.lastTauntIndex = index;
        return taunts[index];
    }

    private getTauntPhase(): BossTauntPhase {
        const bossHealthRatio = this.getHealth() / this.getMaxHealth();
        const playerHealthRatio = this.tauntContext
            ? this.tauntContext.playerHealth / this.tauntContext.playerMaxHealth
            : 1;

        const bossLow = bossHealthRatio <= this.bossLowHealthThreshold;
        const playerLow = playerHealthRatio <= this.playerLowHealthThreshold;

        if (bossLow && playerLow) {
            return "bothLow";
        }

        if (bossLow) {
            return "bossLowPlayerHigh";
        }

        if (playerLow) {
            return "playerLowBossHigh";
        }

        return "highHigh";
    }

    private updateTaunt(nowSeconds: number, playerEntity?: Entity | null): void {
        if (!this.isAlive()) {
            return;
        }

        if (!playerEntity) {
            return;
        }

        const tauntPhase = this.getTauntPhase();
        const tauntPool = this.tauntPools[tauntPhase];

        if (tauntPool.length === 0) {
            return;
        }

        if (this.lastTauntPhase !== tauntPhase) {
            this.lastTauntPhase = tauntPhase;
            this.lastTauntIndex = null;
            this.nextTauntAtSeconds = nowSeconds + 0.5;
        }

        if (this.nextTauntAtSeconds === null) {
            this.scheduleNextTaunt(nowSeconds);
            return;
        }

        if (nowSeconds < this.nextTauntAtSeconds) {
            return;
        }

        const taunt = this.pickRandomTaunt(tauntPool);
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
            if (Boss.activeBoss === this) {
                Boss.activeBoss = null;
            }
            try {
                this.resetTauntTimer();
                const deathTaunt = this.getBossDeathTaunt();
                Boss.lastBossDeathTaunt = deathTaunt;
                if (deathTaunt) {
                    this.showStatusText(deathTaunt, this.bossDeathTauntDurationMs);
                }
                window.setTimeout(() => {
                    this.removeHealthBar();
                }, this.bossDeathTauntDurationMs);
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
            detectionRange: Number.MAX_VALUE
        };
    }
}