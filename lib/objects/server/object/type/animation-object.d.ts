import { BaseObject } from './base-object';

/**
 * Reldens - AnimationObject (generated from lib source at v4.0.0-beta.39.9).
 * Own members are typed from the source; values the source does not model are
 * `unknown`, never `any`.
 */
export declare class AnimationObject extends BaseObject {
    isAnimation: boolean;
    type: string;
    get animationData(): unknown;
    chaseBody(body: unknown): unknown;
    onAction(props: unknown): unknown;
    onHit(props: unknown): unknown;
    [key: string]: unknown;
}
