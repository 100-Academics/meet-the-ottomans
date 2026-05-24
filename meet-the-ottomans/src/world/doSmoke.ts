import {
    AppBase,
    BLEND_PREMULTIPLIED,
    Color,
    CULLFACE_NONE,
    createSphere,
    Entity,
    MeshInstance,
    StandardMaterial,
    Vec2,
    Vec3,
} from "playcanvas";

type SmokeBlob = {
    shell: Entity;
    offset: Vec3;
    size: Vec3;
    wobblePhase: number;
};

type SmokePuff = {
    pivot: Entity;
    material: StandardMaterial;
    blobs: SmokeBlob[];
    baseOffset: Vec3;
    riseSpeed: number;
    drift: Vec2;
    maxRise: number;
    baseScale: number;
    wobblePhase: number;
    age: number;
    lifetime: number;
};

export class Smoke {
    private position: Vec3;
    private radius: number;
    private app: AppBase;
    private emitAccumulator = 0;

    constructor(position: Vec3, radius: number, app: AppBase) {
        this.position = position;
        this.radius = radius;
        this.app = app;

        void this.createSmoke();
    }

    public createSmoke(): Entity {
        const smokeRoot = new Entity('smoke-root');
        smokeRoot.setPosition(this.position);
        this.app.root.addChild(smokeRoot);

        const smokeMesh = createSphere(this.app.graphicsDevice!, {
            radius: 1,
            latitudeBands: 10,
            longitudeBands: 10
        });

        const smokePuffs: SmokePuff[] = [];

        const spawnPuff = () => {
            const puffIndex = smokePuffs.length + Math.floor(Math.random() * 1000);
            const pivot = new Entity(`smoke-puff-pivot-${puffIndex}`);
            const material = new StandardMaterial();
            const shade = 0.34 + (Math.random() * 0.18);
            const opacity = 0.10 + (Math.random() * 0.10);

            material.useLighting = false;
            material.diffuse = new Color(shade, shade, shade);
            material.emissive = new Color(shade, shade, shade);
            material.opacity = opacity;
            material.blendType = BLEND_PREMULTIPLIED;
            material.depthWrite = false;
            material.cull = CULLFACE_NONE;
            material.update();

            const startRadius = this.radius * (1.6 + Math.random() * 1.1);
            const angle = Math.random() * Math.PI * 2;
            const baseOffset = new Vec3(
                Math.cos(angle) * startRadius,
                Math.random() * this.radius * 0.2,
                Math.sin(angle) * startRadius
            );
            const baseScale = this.radius * (0.5 + Math.random() * 0.45);
            const blobs: SmokeBlob[] = [];
            const blobCount = 9 + Math.floor(Math.random() * 4);

            pivot.setLocalPosition(baseOffset);

            for (let blobIndex = 0; blobIndex < blobCount; blobIndex += 1) {
                const shell = new Entity(`smoke-puff-${puffIndex}-blob-${blobIndex}`);
                const meshInstance = new MeshInstance(smokeMesh, material);
                const layerT = blobCount <= 1 ? 0 : blobIndex / (blobCount - 1);
                const horizontalOffset = this.radius * (0.2 + (Math.random() * 0.45));
                const heightOffset = this.radius * (0.05 + (layerT * 1.45));
                const angleOffset = Math.random() * Math.PI * 2;
                const offset = new Vec3(
                    Math.cos(angleOffset) * horizontalOffset,
                    heightOffset,
                    Math.sin(angleOffset) * horizontalOffset
                );
                const size = new Vec3(
                    baseScale * (1.25 + Math.random() * 0.8),
                    baseScale * (0.9 + Math.random() * 0.95),
                    baseScale * (1.25 + Math.random() * 0.8)
                );

                shell.addComponent('render', {
                    meshInstances: [meshInstance]
                });
                shell.setLocalPosition(offset);
                shell.setLocalScale(size.x, size.y, size.z);
                pivot.addChild(shell);
                blobs.push({
                    shell,
                    offset,
                    size,
                    wobblePhase: (Math.random() * Math.PI * 2) + (blobIndex * 0.7)
                });
            }

            smokeRoot.addChild(pivot);

            smokePuffs.push({
                pivot,
                material,
                blobs,
                baseOffset,
                riseSpeed: 1.3 + Math.random() * 1.2,
                drift: new Vec2((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06),
                maxRise: this.radius * (24 + Math.random() * 16),
                baseScale,
                wobblePhase: Math.random() * Math.PI * 2,
                age: 0,
                lifetime: 7 + Math.random() * 5
            });
        };

        const initialBurst = 4;
        for (let burstIndex = 0; burstIndex < initialBurst; burstIndex += 1) {
            spawnPuff();
        }

        const updateKey = '__smokeCloudUpdate';
        const keyedApp = this.app as AppBase & Record<string, unknown>;
        const existingUpdate = keyedApp[updateKey];
        if (typeof existingUpdate === 'function') {
            this.app.off('update', existingUpdate as (dt: number) => void);
        }

        const updateSmoke = (deltaTime: number) => {
            const dt = Math.max(0, Math.min(deltaTime, 0.05));
            const camera = this.app.root.findByName('camera');
            const cameraPosition = camera?.getPosition();

            this.emitAccumulator += dt;
            const spawnInterval = 0.28;
            while (this.emitAccumulator >= spawnInterval) {
                this.emitAccumulator -= spawnInterval;
                if (smokePuffs.length < 40) {
                    spawnPuff();
                }
            }

            for (let puffIndex = smokePuffs.length - 1; puffIndex >= 0; puffIndex -= 1) {
                const puff = smokePuffs[puffIndex];
                puff.age += dt;

                const currentPosition = puff.pivot.getLocalPosition();
                const lifeProgress = Math.min(1, Math.max(0, (currentPosition.y - puff.baseOffset.y) / puff.maxRise));
                const ageProgress = Math.min(1, puff.age / puff.lifetime);
                let nextY = currentPosition.y + ((puff.riseSpeed + (lifeProgress * 2.2)) * dt);
                let nextX = currentPosition.x + (puff.drift.x * dt);
                let nextZ = currentPosition.z + (puff.drift.y * dt);

                if (puff.age >= puff.lifetime || (nextY - puff.baseOffset.y) > puff.maxRise) {
                    puff.pivot.destroy();
                    smokePuffs.splice(puffIndex, 1);
                    continue;
                }

                puff.pivot.setLocalPosition(nextX, nextY, nextZ);

                if (cameraPosition) {
                    puff.pivot.lookAt(cameraPosition);
                }

                const pulse = 0.92 + (Math.sin((performance.now() * 0.0015) + puff.wobblePhase) * 0.07);
                const puffScale = puff.baseScale * (1.1 + (lifeProgress * 1.45)) * (1 - (ageProgress * 0.12)) * pulse;

                for (const blob of puff.blobs) {
                    const blobPulse = 0.92 + (Math.sin((performance.now() * 0.0011) + blob.wobblePhase) * 0.08);
                    const bob = Math.sin((performance.now() * 0.0018) + blob.wobblePhase) * this.radius * 0.06;
                    const stretch = 1 + (lifeProgress * 0.8);
                    const wobbleX = Math.sin((performance.now() * 0.0012) + blob.wobblePhase) * this.radius * 0.05;
                    const wobbleZ = Math.cos((performance.now() * 0.0011) + blob.wobblePhase) * this.radius * 0.05;

                    blob.shell.setLocalPosition(blob.offset.x + wobbleX, blob.offset.y + bob, blob.offset.z + wobbleZ);
                    blob.shell.setLocalScale(
                        blob.size.x * puffScale * blobPulse,
                        blob.size.y * puffScale * stretch * blobPulse,
                        blob.size.z * puffScale * blobPulse
                    );
                }
            }
        };

        keyedApp[updateKey] = updateSmoke;
        this.app.on('update', updateSmoke);

        return smokeRoot;
    }
}
