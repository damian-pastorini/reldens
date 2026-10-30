/**
 *
 * Reldens - Test Objects Auto Recovery
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectsAutoRecovery } = require('../lib/actions/server/objects-auto-recovery');
const { ObjectsConst } = require('../lib/objects/constants');
const { UsersConst } = require('../lib/users/constants');
const { ActionsConst } = require('../lib/actions/constants');
const { GameConst } = require('../lib/game/constants');

class TestObjectsAutoRecovery extends BaseTest
{

    createEnemy(broadcastKey, props = {})
    {
        return Object.assign({
            type: ObjectsConst.TYPE_ENEMY,
            broadcastKey,
            stats: {hp: 10, mp: 10},
            initialStats: {hp: 100, mp: 100},
            objectBody: {bodyState: {inState: GameConst.STATUS.ACTIVE}},
            battle: {inBattleWithPlayers: {}}
        }, props);
    }

    createRoom(roomObjects)
    {
        let room = {broadcasts: [], objectsManager: {roomObjects}};
        room.broadcast = (messageKey, message) => room.broadcasts.push(message);
        return room;
    }

    async testMissingOrDisabledConfigRecoversNothing()
    {
        await this.test('a missing or disabled objects config recovers no enemy', async () => {
            let enemy = this.createEnemy('enemy-1');
            let room = this.createRoom({enemy1: enemy});
            let objectsAutoRecovery = new ObjectsAutoRecovery();
            this.assert.strictEqual(objectsAutoRecovery.recoverRoomObjects(room, false, 'hp'), 0);
            let disabledConfig = {enabled: false, properties: {hp: 5}};
            this.assert.strictEqual(objectsAutoRecovery.recoverRoomObjects(room, disabledConfig, 'hp'), 0);
            this.assert.deepStrictEqual(enemy.stats, {hp: 10, mp: 10});
            this.assert.deepStrictEqual(room.broadcasts, []);
        });
    }

    async testActiveEnemyRecoversAndBroadcastsTheLifeBar()
    {
        await this.test('an active enemy recovers the configured stats and its life bar is broadcast', async () => {
            let enemy = this.createEnemy('enemy-1');
            let room = this.createRoom({enemy1: enemy});
            let recovered = new ObjectsAutoRecovery().recoverRoomObjects(
                room,
                {enabled: true, properties: {hp: 5}},
                'hp'
            );
            this.assert.strictEqual(recovered, 1);
            this.assert.deepStrictEqual(enemy.stats, {hp: 15, mp: 10});
            this.assert.deepStrictEqual(room.broadcasts, [{
                act: UsersConst.ACTION_LIFEBAR_UPDATE,
                [ActionsConst.DATA_OWNER_TYPE]: ActionsConst.DATA_TYPE_VALUE_OBJECT,
                [ActionsConst.DATA_OWNER_KEY]: 'enemy-1',
                newValue: 15,
                totalValue: 100
            }]);
        });
    }

    async testEnemyAmountsOverrideTheConfig()
    {
        await this.test('the enemy auto recovery amounts override the configured amounts', async () => {
            let enemy = this.createEnemy('enemy-1', {autoRecovery: {hp: 20}});
            let room = this.createRoom({enemy1: enemy});
            new ObjectsAutoRecovery().recoverRoomObjects(room, {enabled: true, properties: {hp: 5}}, 'hp');
            this.assert.deepStrictEqual(enemy.stats, {hp: 30, mp: 10});
        });
    }

    async testOtherStatsRecoverWithoutLifeBar()
    {
        await this.test('an enemy recovering a stat that is not the life is counted without a life bar', async () => {
            let enemy = this.createEnemy('enemy-1');
            let room = this.createRoom({enemy1: enemy});
            let recovered = new ObjectsAutoRecovery().recoverRoomObjects(
                room,
                {enabled: true, properties: {mp: 3}},
                'hp'
            );
            this.assert.strictEqual(recovered, 1);
            this.assert.deepStrictEqual(enemy.stats, {hp: 10, mp: 13});
            this.assert.deepStrictEqual(room.broadcasts, []);
        });
    }

    async testNotRecoverableObjectsAreSkipped()
    {
        await this.test('the non enemy objects and the dead, full or excluded enemies are skipped', async () => {
            let roomObjects = {
                npc: this.createEnemy('npc-1', {type: ObjectsConst.TYPE_NPC}),
                excluded: this.createEnemy('enemy-2', {autoRecovery: false}),
                dead: this.createEnemy('enemy-3', {objectBody: {bodyState: {inState: GameConst.STATUS.DEATH}}}),
                full: this.createEnemy('enemy-4', {stats: {hp: 100, mp: 100}})
            };
            let room = this.createRoom(roomObjects);
            let recovered = new ObjectsAutoRecovery().recoverRoomObjects(
                room,
                {enabled: true, properties: {hp: 5}},
                'hp'
            );
            this.assert.strictEqual(recovered, 0);
            let lifeValues = Object.keys(roomObjects).map(objectKey => roomObjects[objectKey].stats.hp);
            this.assert.deepStrictEqual(lifeValues, [10, 10, 10, 100]);
            this.assert.deepStrictEqual(room.broadcasts, []);
        });
    }

    async testEnemyInBattleRecoversOnlyWithoutTheBattleRule()
    {
        await this.test('an enemy in battle is skipped only while the out of battle rule is enabled', async () => {
            let enemy = this.createEnemy('enemy-1', {battle: {inBattleWithPlayers: {'7': true}}});
            let room = this.createRoom({enemy1: enemy});
            let objectsAutoRecovery = new ObjectsAutoRecovery();
            let onlyOutOfBattleConfig = {enabled: true, onlyOutOfBattle: true, properties: {hp: 5}};
            this.assert.strictEqual(objectsAutoRecovery.recoverRoomObjects(room, onlyOutOfBattleConfig, 'hp'), 0);
            this.assert.strictEqual(enemy.stats.hp, 10);
            let anyBattleConfig = {enabled: true, onlyOutOfBattle: false, properties: {hp: 5}};
            this.assert.strictEqual(objectsAutoRecovery.recoverRoomObjects(room, anyBattleConfig, 'hp'), 1);
            this.assert.strictEqual(enemy.stats.hp, 15);
        });
    }

    async testRoomWithoutObjectsRecoversNothing()
    {
        await this.test('a room without objects manager recovers nothing', async () => {
            let objectsConfig = {enabled: true, properties: {hp: 5}};
            this.assert.strictEqual(new ObjectsAutoRecovery().recoverRoomObjects({}, objectsConfig, 'hp'), 0);
        });
    }

}

module.exports.TestObjectsAutoRecovery = TestObjectsAutoRecovery;
