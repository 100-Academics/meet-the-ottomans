import { AppBase, Entity, Color, Vec3 } from 'playcanvas';
import { FirstPersonCamera } from './FirstPersonCamera';

export class Player {
    private cameraEntity: Entity;
    private cameraController: FirstPersonCamera | undefined;
    private app: AppBase;

    constructor(app: AppBase, initialPosition: Vec3 = new Vec3(0, 8, 8)) {
        this.app = app;

        // Create the camera entity
        this.cameraEntity = new Entity('camera');
        this.cameraEntity.addComponent('camera', {
            clearColor: new Color(0.14117647, 0.14117647, 0.14117647),  // Dark gray background
            fov: 90  // 90-degree field of view
        });
        this.cameraEntity.setPosition(initialPosition);
        this.cameraEntity.lookAt(Vec3.ZERO);

        // Add first-person camera controls (WASD movement, mouse look, gravity)
        this.cameraEntity.addComponent('script');
        this.cameraController = this.cameraEntity.script?.create(FirstPersonCamera) as FirstPersonCamera | undefined;
        if (this.cameraController) {
            this.cameraController.groundTag = 'ground';  // The camera will use raycasts to detect ground collision
        }

        // Add to app root so it renders
        this.app.root.addChild(this.cameraEntity);
    }

    public getCameraEntity(): Entity {
        return this.cameraEntity;
    }

    public getCameraController(): FirstPersonCamera | undefined {
        return this.cameraController;
    }

    public setPosition(position: Vec3): void {
        this.cameraEntity.setPosition(position);
    }

    public getPosition(): Vec3 {
        return this.cameraEntity.getPosition();
    }
}