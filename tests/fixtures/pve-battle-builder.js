/**
 *
 * Reldens - PveBattleBuilder
 *
 * Builds the PvE battle of the chase and battle turns tests: a Pve with the given chase time out over an active enemy
 * whose chase records the chased bodies (always finding a path) and whose origin walk is counted, the delayed battle
 * start counted instead of scheduled, a group player already in battle with it and the room a battle turn runs in. The
 * enemy action fails its validation while it can activate and its owner is not casting (so the enemy chases) unless
 * the given action props say otherwise, and it is set as the only enemy action with the enemy and the player in the same
 * world and the player with life.
 *
 */

const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { Pve } = require('../../lib/actions/server/pve');
const { GameConst } = require('../../lib/game/constants');

class PveBattleBuilder
{

    static createChaseSetup(chaseTimeOut)
    {
        let setup = {chasedBodies: [], originMoves: 0, delayedStarts: 0, emittedEvents: [], chaseTimeOut};
        let events = {emit: async (eventName) => setup.emittedEvents.push(eventName)};
        setup.pve = new Pve({fetchChaseTimeOut: () => setup.chaseTimeOut, events});
        setup.pve.setTargetObject({
            id: 'enemy-1',
            uid: 'enemy-uid',
            state: {inState: GameConst.STATUS.ACTIVE},
            stats: {hp: 50},
            chaseBody: (body) => {
                setup.chasedBodies.push(body);
                return [[1, 1]];
            },
            objectBody: {
                bodyState: {inState: GameConst.STATUS.ACTIVE},
                velocity: [1, 1],
                resetAuto: () => true,
                moveToOriginalPoint: () => setup.originMoves++
            }
        });
        setup.pve.startBattleWithDelay = async () => setup.delayedStarts++;
        setup.playerSchema = GameplayPlayerBuilder.createPlayerSchema({physicalBody: {id: 'player-body'}});
        setup.pve.inBattleWithPlayers[setup.playerSchema.player_id] = true;
        setup.room = {roomWorld: {}, state: {}, playerBySessionIdFromState: () => true, config: {get: () => 'hp'}};
        return setup;
    }

    /**
     * @param {Object} [actionProps]
     * @returns {Object}
     */
    static createEnemyAction(actionProps = {})
    {
        return Object.assign({
            key: 'bite',
            skillDelay: 1000,
            castTime: 0,
            canActivate: true,
            owner: {isCasting: false},
            validate: () => false
        }, actionProps);
    }

    /**
     * @param {Object} setup
     * @param {Object} [actionProps]
     * @returns {Object}
     */
    static setEnemyAction(setup, actionProps = {})
    {
        setup.pve.targetObject.actionsKeys = ['bite'];
        setup.pve.targetObject.actions = {bite: PveBattleBuilder.createEnemyAction(actionProps)};
        setup.pve.targetObject.objectBody.world = {worldKey: 'forest'};
        setup.playerSchema.physicalBody.world = {worldKey: 'forest'};
        setup.playerSchema.stats = {hp: 10};
        return setup;
    }

}

module.exports.PveBattleBuilder = PveBattleBuilder;
