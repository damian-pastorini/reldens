import { AnimationObject } from './animation-object';

/**
 * Reldens - NpcObject (generated from lib source at v4.0.0-beta.39.9).
 * Own members are typed from the source; values the source does not model are
 * `unknown`, never `any`.
 */
export declare class NpcObject extends AnimationObject {
    closeInteractionOnOutOfReach: unknown;
    collisionResponse: boolean;
    hasAnimation: boolean;
    interactionArea: unknown;
    invalidOptionMessage: unknown;
    listenMessages: boolean;
    sendInvalidOptionMessage: boolean;
    executeMessageActions(client: unknown, data: unknown, room: unknown, playerSchema: unknown): Promise<unknown>;
    isObjectInteractionMessage(data: unknown): unknown;
    isObjectOptionInteractionMessage(data: unknown): unknown;
    isValidId(data: unknown): unknown;
    isValidOptionIndexValue(optionIdx: unknown, client: unknown): unknown;
    outOfReachClose(client: unknown): unknown;
    [key: string]: unknown;
}
