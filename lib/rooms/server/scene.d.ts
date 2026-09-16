import { RoomLogin } from './login';

/**
 * Reldens - RoomScene (generated from lib source at v4.0.0-beta.39.9).
 * Own members are typed from the source; values the source does not model are
 * `unknown`, never `any`.
 */
export declare class RoomScene extends RoomLogin {
    allowSimultaneous: unknown;
    applyPlayersLastStateHandler: unknown;
    applyStateOnZeroAffectedProperty: unknown;
    autoDispose: unknown;
    collisionsManager: unknown;
    customData: unknown;
    disposeTimeoutMs: unknown;
    disposeTimeoutTimer: boolean;
    joinInRandomPlace: unknown;
    joinInRandomPlaceAlways: unknown;
    joinInRandomPlaceGuestAlways: unknown;
    lastCallTime: unknown;
    messageActions: object;
    movementInterval: object;
    objectsManager: unknown;
    paused: boolean;
    playerBodyHeight: unknown;
    playerBodyWidth: unknown;
    playersAffectedProperty: unknown;
    playersLastStateTimers: object;
    playersStateHandlerTimeOut: unknown;
    pointsValidator: unknown;
    randomPlayerState: unknown;
    roomData: unknown;
    roomWorld: object;
    sceneDataFilter: unknown;
    sceneId: unknown;
    worldTimer: unknown;
    worldTimerCallback: boolean;
    activateBody(bodyToMove: unknown, playerId: unknown, playerNewState: unknown): unknown;
    activatePlayer(playerSchema: unknown, playerNewState: unknown): unknown;
    addObjectStateSceneData(object: unknown): unknown;
    broadcastSceneChange(client: unknown, currentPlayer: unknown, data: unknown): unknown;
    cleanUpRoomWorld(): unknown;
    clearEntityActions(entityInstance: unknown): unknown;
    clearMovementIntervals(playerId: unknown): unknown;
    clearPlayersTimers(): unknown;
    clearWorldTimers(): unknown;
    createDropObjectInRoom(dropObjectData: unknown, worldObjectData: unknown): Promise<unknown>;
    createPlayerOnScene(client: unknown, userModel: unknown, isGuest: unknown): Promise<unknown>;
    createWorld(roomData: unknown, objectsManager: unknown): Promise<unknown>;
    createWorldInstance(data: unknown): unknown;
    deactivateBody(bodyToMove: unknown, playerId: unknown, playerNewState: unknown): unknown;
    deactivatePlayer(playerSchema: unknown, playerNewState: unknown): unknown;
    deleteObjectSceneData(object: unknown): unknown;
    deleteRespawnObjectInstances(): unknown;
    disableAutoDispose(): unknown;
    disconnectBySessionId(sessionId: unknown, client: unknown, userModel: unknown): Promise<unknown>;
    enableAutoDispose(): unknown;
    executeMovePlayerActions(playerSchema: unknown, messageData: unknown): Promise<unknown>;
    executePlayerStatsAction(messageData: unknown, client: unknown, playerSchema: unknown): unknown;
    executeSceneMessageActions(client: unknown, messageData: unknown, playerSchema: unknown): Promise<unknown>;
    fetchNewPosition(nextRoom: unknown, previousRoom: unknown): unknown;
    getClientById(clientId: unknown): unknown;
    handleObjectsManagerOnRoomDispose(): unknown;
    handlePlayerLastState(currentPlayer: unknown): unknown;
    handleRespawnOnRoomDispose(): unknown;
    hasActiveDroppedObjects(): unknown;
    initializeWorldTimer(): unknown;
    isAllowedAction(client: unknown, messageData: unknown, playerSchema: unknown): unknown;
    logEventsData(eventKey: unknown): unknown;
    nextSceneInitialPosition(client: unknown, data: unknown, playerBody: unknown): Promise<unknown>;
    objectAssetId(objectAsset: unknown): unknown;
    onJoin(client: unknown, options: unknown, userModel: unknown): Promise<unknown>;
    onLeave(client: unknown, consented: unknown): Promise<unknown>;
    playerByPlayerIdFromState(playerId: unknown): unknown;
    playerBySessionIdFromState(sessionId: unknown): unknown;
    playersCountInState(): unknown;
    playersKeysFromState(): unknown;
    removeAllPlayerReferences(playerSchema: unknown, sessionId: unknown): unknown;
    removeObject(roomObject: unknown): unknown;
    removePlayer(sessionId: unknown): Promise<unknown>;
    removeRespawnObjectsSubscribers(): unknown;
    savePlayedTime(playerSchema: unknown): Promise<unknown>;
    savePlayerState(sessionId: unknown): Promise<unknown>;
    savePlayerStats(playerSchema: unknown, client: unknown): Promise<unknown>;
    setObjectAutoDestroyTime(roomObject: unknown): unknown;
    validateWorldContents(roomMap: unknown): unknown;
    [key: string]: unknown;
}
