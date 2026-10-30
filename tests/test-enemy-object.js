/**
 *
 * Reldens - Test Enemy Object
 *
 */

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

}

module.exports.TestEnemyObject = TestEnemyObject;
