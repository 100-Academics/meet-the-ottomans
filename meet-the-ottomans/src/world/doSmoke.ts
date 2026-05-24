import { AppBase, BLEND_NORMAL, Curve, CurveSet, Entity, Texture, Vec3 } from "playcanvas";
import smokeTextureUrl from '../assets/textures/smoke.jpeg';

let smokeTexturePromise: Promise<Texture> | null = null;

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        image.src = url;
    });
}

async function createSmokeTexture(app: AppBase): Promise<Texture> {
    const image = await loadImage(smokeTextureUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to create smoke texture canvas context');
    }

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];
        const luminance = (red * 0.299) + (green * 0.587) + (blue * 0.114);
        const alpha = Math.max(0, Math.min(255, Math.round(((luminance / 255) ** 0.65) * 255)));

        pixels[index] = 235;
        pixels[index + 1] = 235;
        pixels[index + 2] = 235;
        pixels[index + 3] = alpha;
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new Texture(app.graphicsDevice!, {
        mipmaps: true,
        name: 'smoke-particle-texture'
    });
    texture.setSource(canvas);
    return texture;
}

function loadSmokeTexture(app: AppBase): Promise<Texture> {
    if (!smokeTexturePromise) {
        smokeTexturePromise = createSmokeTexture(app);
    }

    return smokeTexturePromise;
}

export class Smoke {
    private position: Vec3;
    private radius: number;
    private app: AppBase;
    
    constructor(position: Vec3, radius: number, app: AppBase) {
        this.position = position;
        this.radius = radius;
        this.app = app;

        void this.createSmoke();
    }

    public createSmoke(): Entity {
        const smokeEntity = new Entity();
        smokeEntity.setPosition(this.position);
        smokeEntity.setLocalScale(new Vec3(this.radius * 2, this.radius * 2, this.radius * 2));
        smokeEntity.addComponent('particleSystem',{
            numParticles: 320,
            lifetime: 8,
            rate: 35,
            autoPlay: true,
            blendType: BLEND_NORMAL,
            colorMap: null,
            depthWrite: false,
            loop: true,
            localSpace: false,
            preWarm: true,
            stretch: 0.75,
            initialVelocity: 0.15,

            localVelocityGraph: new CurveSet([
                [0, 0],
                [0, 1.8],
                [0, 0]
            ]),

            scaleGraph: new Curve([0, 1.0, 0.25, 2.2, 0.7, 4.5, 1, 6.0]),
            alphaGraph: new Curve([0, 0, 0.08, 0.7, 0.4, 0.85, 1, 0]),

            //TODO texture
        });

        void loadSmokeTexture(this.app)
            .then((texture) => {
                const particleSystem = smokeEntity.particlesystem;
                if (particleSystem) {
                    particleSystem.colorMap = texture;
                    particleSystem.blendType = BLEND_NORMAL;
                }
            })
            .catch((error) => {
                console.warn('[Smoke] failed to load smoke texture', error);
            });

        this.app.root.addChild(smokeEntity);
        return smokeEntity;
    }
}