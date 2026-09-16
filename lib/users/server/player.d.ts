/**
 * Reldens - Player (generated from lib source at v4.0.0-beta.39.9).
 * Own members are typed from the source; values the source does not model are
 * `unknown`, never `any`. It extends the external `Schema` base at runtime; those inherited members are reachable and typed `unknown` via the index signature.
 */
export declare class Player {
    avatarKey: unknown;
    broadcastKey: unknown;
    customData: object;
    eventsPrefix: string;
    physicalBody: boolean;
    playedTime: unknown;
    playerName: unknown;
    player_id: unknown;
    privateData: object;
    roleId: unknown;
    sessionId: unknown;
    state: unknown;
    stats: unknown;
    statsBase: unknown;
    status: unknown;
    userId: unknown;
    username: unknown;
    eventUniqueKey(): unknown;
    getCustom(key: unknown): unknown;
    getPosition(): unknown;
    getPrivate(key: unknown): unknown;
    inState(inStateValue: unknown): unknown;
    isDeath(): unknown;
    isDisabled(): unknown;
    setCustom(key: unknown, data: unknown): unknown;
    setPrivate(key: unknown, data: unknown): unknown;
    syncPlayer(playerSchema: unknown): unknown;
    [key: string]: unknown;
}
