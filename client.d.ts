import { ReldensEventsManager } from './events';

/**
 * Reldens - GameManager (generated from lib source at v4.0.0-beta.39.9).
 * Own members are typed from the source; values the source does not model are
 * `unknown`, never `any`.
 */
export declare class GameManager {
    constructor();
    activeRoomEvents: unknown;
    appServerUrl: string;
    canInitEngine: boolean;
    config: unknown;
    createdAnimations: object;
    elements: Record<string, HTMLElement>;
    events: ReldensEventsManager;
    features: unknown;
    firebase: unknown;
    forcedDisconnection: boolean;
    gameClient: unknown;
    gameDom: unknown;
    gameEngine: unknown;
    gameOver: boolean;
    gameRoom: unknown;
    gameServerUrl: string;
    initialGameData: unknown;
    isChangingScene: boolean;
    joinedRooms: Record<string, unknown>;
    locale: string;
    playerData: unknown;
    plugins: Record<string, unknown>;
    room: unknown;
    services: Record<string, unknown>;
    startHandler: unknown;
    submitedForm: boolean;
    userData: Record<string, unknown>;
    activateResponsiveBehavior(): unknown;
    beforeStartGame(): Promise<unknown>;
    clientStart(): unknown;
    createRoomEventsInstance(roomName: unknown): unknown;
    currentPlayerName(): unknown;
    displayFormError(formId: unknown, message: unknown): unknown;
    emitActivatedRoom(sceneRoom: unknown, playerScene: unknown): Promise<unknown>;
    emitJoinedRoom(sceneRoom: unknown, playerScene: unknown): Promise<unknown>;
    getActiveScene(): unknown;
    getActiveScenePreloader(): unknown;
    getAnimationByKey(key: unknown): unknown;
    getAppServerUrl(): unknown;
    getCurrentPlayer(): unknown;
    getCurrentPlayerAnimation(): unknown;
    getFeature(featureKey: unknown): unknown;
    getGameServerUrl(): unknown;
    getUiElement(uiName: unknown, logError?: boolean): unknown;
    getUrlFromCurrentReferer(useWebSocket?: boolean): unknown;
    handleGameRoomMessages(): unknown;
    handleLoginError(formData: unknown): unknown;
    handleLoginSuccess(): unknown;
    initEngine(): Promise<unknown>;
    initializeClient(): unknown;
    joinFeaturesRooms(): Promise<unknown>;
    joinGame(formData: unknown, isNewUser?: boolean): Promise<unknown>;
    mapFormDataToUserData(formData: unknown, isNewUser: unknown): unknown;
    reconnectGameClient(message: unknown, previousRoom: unknown): Promise<unknown>;
    setChangingScene(changingScene: unknown): unknown;
    setupCustomClientPlugin(customPluginKey: unknown, customPlugin: unknown): unknown;
    startGame(formData: unknown, isNewUser: unknown): Promise<unknown>;
    [key: string]: unknown;
}
