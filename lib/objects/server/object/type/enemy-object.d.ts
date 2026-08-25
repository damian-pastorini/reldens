import { NpcObject } from './npc-object';

/**
 * Reldens - EnemyObject (generated from lib source at v4.0.0-beta.39.9).
 * Own members are typed from the source; values the source does not model are
 * `unknown`, never `any`.
 */
export declare class EnemyObject extends NpcObject {
    actions: object;
    actionsKeys: unknown[];
    actionsTargets: object;
    aggression: unknown;
    battle: unknown;
    broadcastKey: unknown;
    defaultAffectedProperty: unknown;
    defaultSkillKey: unknown;
    defaultSkillTarget: unknown;
    enemiesDefaults: unknown;
    hasState: boolean;
    initialStats: unknown;
    interactionRadio: unknown;
    isAggressive: unknown;
    originalType: unknown;
    randomMovement: unknown;
    respawnLayer: boolean;
    respawnStateTime: unknown;
    respawnTime: boolean;
    skillsExtraDataMapper: unknown;
    startBattleOnHit: unknown;
    stats: unknown;
    statsBase: unknown;
    updateInitialPosition: unknown;
    addSkillByKey(skillKey: unknown, skillTarget: unknown): unknown;
    executePhysicalSkill(target: unknown, executedSkill: unknown): Promise<unknown>;
    getBattleEndEvent(): unknown;
    getPosition(): unknown;
    getSkillExtraData(params: unknown): unknown;
    onAfterRestore(room: unknown): Promise<unknown>;
    onBattleEnd(): Promise<unknown>;
    onBeforeRestore(room: unknown): unknown;
    onSetActive(room: unknown): unknown;
    respawn(room: unknown): Promise<unknown>;
    runAdditionalRespawnSetup(): Promise<unknown>;
    setupActions(): Promise<unknown>;
    setupDefaultAction(): unknown;
    startBattleWithPlayer(props: unknown): unknown;
    [key: string]: unknown;
}
