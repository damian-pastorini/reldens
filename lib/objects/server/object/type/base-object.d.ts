/**
 * Reldens - BaseObject (generated from lib source at v4.0.0-beta.39.9).
 * Own members are typed from the source; values the source does not model are
 * `unknown`, never `any`. It extends the external `InteractionArea` base at runtime; those inherited members are reachable and typed `unknown` via the index signature.
 */
export declare class BaseObject {
    appendIndex: unknown;
    clientParams: object;
    content: unknown;
    eventsPrefix: string;
    key: string;
    objectBody: unknown;
    objectIndex: string;
    options: unknown;
    playerVisible: boolean;
    privateParamsRaw: unknown;
    roomVisible: boolean;
    runOnAction: boolean;
    runOnHit: boolean;
    uid: string;
    eventUniqueKey(suffix: unknown): unknown;
    mapClientParams(props: unknown): unknown;
    mapPrivateParams(props: unknown): unknown;
    runAdditionalSetup(): Promise<unknown>;
    setDefaultProperties(): unknown;
    [key: string]: unknown;
}
