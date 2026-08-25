/**
 * Reldens - AnimationEngine (generated from lib source at v4.0.0-beta.39.9).
 * Own members are typed from the source; values the source does not model are
 * `unknown`, never `any`.
 */
export declare class AnimationEngine {
    animPos: object;
    assetPath: string;
    asset_key: string;
    autoStart: unknown;
    currentAnimation: unknown;
    currentPreloader: unknown;
    destroyOnComplete: unknown;
    enabled: boolean;
    frameEnd: unknown;
    frameRate: unknown;
    frameStart: unknown;
    gameManager: unknown;
    hideOnComplete: unknown;
    highlightColor: unknown;
    highlightOnOver: unknown;
    id: unknown;
    isInteractive: unknown;
    key: string;
    layerName: unknown;
    positionFix: unknown;
    prefix: unknown;
    repeat: unknown;
    restartTime: unknown;
    sceneSprite: unknown;
    targetName: string;
    type: unknown;
    ui: boolean;
    x: unknown;
    y: unknown;
    zeroPad: unknown;
    autoPlayAnimation(frameNumbers: unknown): unknown;
    automaticDestroyOnComplete(): unknown;
    calculateAnimPosition(): unknown;
    createAnimation(): unknown;
    createObjectAnimations(animations: unknown): unknown;
    enableAutoRestart(): unknown;
    enableInteraction(currentScene: unknown): unknown;
    getPosition(): unknown;
    runAnimation(): unknown;
    updateObjectAndSpritePositions(x: unknown, y: unknown): unknown;
    updateObjectDepth(): unknown;
    [key: string]: unknown;
}
