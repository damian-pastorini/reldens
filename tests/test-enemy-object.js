/**
 *
 * Reldens - Test Enemy Object
 *
 */

const { Body } = require('p2');
const { BaseTest } = require('./base-test');
const { EnemyObject } = require('../lib/objects/server/object/type/enemy-object');
const { Pve } = require('../lib/actions/server/pve');
const { GameConst } = require('../lib/game/constants');

class TestEnemyObject extends BaseTest
{

    createKilledEnemy()
    {
        let enemyObject = Object.create(EnemyObject.prototype);
        let objectBody = {world: {bodyTypes: {DYNAMIC: 1}}, bodyState: {inState: GameConst.STATUS.DEATH}};
        let battle = new Pve({});
        battle.targetObject = enemyObject;
        battle.isBattleEndProcessing = true;
        return Object.assign(enemyObject, {
            objectBody,
            objectIndex: 'enemy_1',
            initialStats: {hp: 10},
            stats: {hp: 0},
            battle
        });
    }

    async testRestoredEnemyIsNotEndingItsPreviousBattle()
    {
        await this.test('a restored enemy can be killed again before it attacks anyone', async () => {
            let enemyObject = this.createKilledEnemy();
            enemyObject.onBeforeRestore({objectsManager: {roomObjects: {enemy_1: enemyObject}}});
            this.assert.strictEqual(enemyObject.battle.isBattleEndProcessing, false);
            this.assert.deepStrictEqual(enemyObject.stats, {hp: 10});
        });
    }

    async testEnemyWithoutLifeBumpedStartsNoBattle()
    {
        await this.test('a player bumping into an enemy without life starts no battle, with life it starts one', async () => {
            let enemyObject = this.createKilledEnemy();
            let startedBattles = [];
            enemyObject.battle.startBattleWith = async (playerSchema) => startedBattles.push(playerSchema.sessionId);
            let room = {
                config: {get: (path, defaultValue) => defaultValue},
                playerBySessionIdFromState: (sessionId) => ({sessionId})
            };
            enemyObject.defaultAffectedProperty = 'hp';
            let bumpProps = {room, bodyA: {playerId: 'session-1'}, bodyB: enemyObject.objectBody};
            this.assert.strictEqual(enemyObject.startBattleWithPlayer(bumpProps), false);
            enemyObject.stats = Object.assign({}, enemyObject.initialStats);
            await enemyObject.startBattleWithPlayer(bumpProps);
            this.assert.deepStrictEqual(startedBattles, ['session-1']);
        });
    }

    async testKilledEnemyDoesNotCollideWithThePlayers()
    {
        await this.test('a killed enemy waiting its respawn stops and does not collide with the players', async () => {
            let enemyObject = this.createKilledEnemy();
            let steps = [];
            Object.assign(enemyObject.objectBody, {
                type: Body.DYNAMIC,
                collisionResponse: true,
                resetAuto: () => steps.push('resetAuto'),
                stopMove: () => steps.push('stopMove')
            });
            enemyObject.objectBody.world.bodyTypes = {STATIC: Body.STATIC, DYNAMIC: Body.DYNAMIC};
            enemyObject.respawnBehavior = {execute: async () => steps.push('respawn')};
            await enemyObject.respawn({});
            this.assert.deepStrictEqual(steps, ['resetAuto', 'stopMove', 'respawn']);
            this.assert.deepStrictEqual(
                [enemyObject.objectBody.collisionResponse, enemyObject.objectBody.type, enemyObject.originalType],
                [false, Body.STATIC, Body.DYNAMIC]
            );
        });
    }

}

module.exports.TestEnemyObject = TestEnemyObject;
