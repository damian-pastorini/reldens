/**
 * Reldens - RoomLogin (generated from lib source at v4.0.0-beta.39.9).
 * Own members are typed from the source; values the source does not model are
 * `unknown`, never `any`. It extends the external `Room` base at runtime; those inherited members are reachable and typed `unknown` via the index signature.
 */
export declare class RoomLogin {
    config: unknown;
    dataServer: unknown;
    events: unknown;
    featuresManager: unknown;
    guestEmailDomain: string;
    loginManager: unknown;
    roomType: string;
    validRooms: unknown;
    validateRoomData: boolean;
    validateRoomOnServer: unknown;
    validateRoomsOriginRequest: boolean;
    activePlayerByPlayerId(playerId: unknown, roomId: unknown, withPlayer?: boolean): unknown;
    activePlayerByPlayerName(playerName: unknown, roomId: unknown, withPlayer?: boolean): unknown;
    activePlayerBySessionId(sessionId: unknown, roomId: unknown, withPlayer?: boolean): unknown;
    activePlayerByUserName(userName: unknown, roomId: unknown, withPlayer?: boolean): unknown;
    disconnectFromOtherServers(userModel: unknown, options: unknown): Promise<unknown>;
    getPlayerByIdFromArray(players: unknown, playerId: unknown): unknown;
    handleReceivedMessage(client: unknown, message: unknown): Promise<unknown>;
    isValidOriginRequest(request: unknown): unknown;
    isValidRoomOnServer(options: unknown): unknown;
    onAuth(client: unknown, options: unknown, request: unknown): Promise<unknown>;
    onCreate(options: unknown): unknown;
    onDispose(): Promise<unknown>;
    removeActivePlayer(playerSchema: unknown, client: unknown, isChangingScene: unknown): unknown;
    validateRoom(playerRoomName: unknown, isGuest: unknown, isChangePointHit?: boolean): unknown;
    [key: string]: unknown;
}
