/**
 *
 * Reldens - Test Player Death Relocator
 *
 */

const { BaseTest } = require('./base-test');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { PlayerDeathRelocator } = require('../lib/actions/server/player-death-relocator');
const { ActionsConst } = require('../lib/actions/constants');
const { RoomsConst } = require('../lib/rooms/constants');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');
const timersPromises = require('timers/promises');

class TestPlayerDeathRelocator extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.deathBuilder = new DeathRelocationBuilder();
        this.roomBuilder = this.deathBuilder.roomBuilder;
        this.battleTimerMs = 5;
        this.battleTimerWaitMs = 30;
    }

    async testDisabledTeleportKeepsTheBattleRevive()
    {
        await this.test('the disabled death teleport keeps the battle revive and resets the ad flag', async () => {
            let setup = this.deathBuilder.createSetup();
            let deathTimerKey = ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER;
            setup.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, Date.now());
            let relocator = new PlayerDeathRelocator({
                config: this.deathBuilder.createConfig({[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false})
            });
            this.assert.strictEqual(relocator.onPlayerDeath(setup.event), false);
            let adStarted = setup.playerSchema.privateData[ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED];
            this.assert.strictEqual(adStarted, false);
            this.assert.strictEqual(sc.hasOwn(setup.playerSchema.privateData, deathTimerKey), false);
        });
    }

    async testDeathWithoutCallbackOrAlivePlayerIsNotHandled()
    {
        await this.test('a death without revive callback or of an alive player is not handled', async () => {
            let deathTimerKey = ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER;
            let relocator = new PlayerDeathRelocator({config: this.deathBuilder.createConfig()});
            let setup = this.deathBuilder.createSetup();
            setup.event.revivePlayerCallback = false;
            this.assert.strictEqual(relocator.onPlayerDeath(setup.event), false);
            this.assert.strictEqual(sc.hasOwn(setup.playerSchema.privateData, deathTimerKey), false);
            let aliveSetup = this.deathBuilder.createSetup({inState: GameConst.STATUS.ACTIVE});
            this.assert.strictEqual(relocator.onPlayerDeath(aliveSetup.event), false);
            this.assert.strictEqual(sc.hasOwn(aliveSetup.playerSchema.privateData, deathTimerKey), false);
        });
    }

    async testTeleportReplacesTheBattleReviveTimer()
    {
        await this.test('the death teleport replaces the battle revive timer by its own', async () => {
            let setup = this.deathBuilder.createSetup();
            let deathTimerKey = ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER;
            let battleRevived = false;
            let battleTimer = setTimeout(() => battleRevived = true, this.battleTimerMs);
            setup.playerSchema.setPrivate(deathTimerKey, battleTimer);
            let relocator = new PlayerDeathRelocator({config: this.deathBuilder.createConfig()});
            this.assert.strictEqual(relocator.onPlayerDeath(setup.event), true);
            let deathTimer = setup.playerSchema.getPrivate(deathTimerKey);
            this.assert.notStrictEqual(deathTimer, battleTimer);
            await timersPromises.setTimeout(this.battleTimerWaitMs);
            clearTimeout(deathTimer);
            this.assert.strictEqual(battleRevived, false);
            this.assert.strictEqual(setup.revivedPlayers, 0);
        });
    }

    async testPlayerThatLeftOrIsAliveIsNotRevived()
    {
        await this.test('a player that left the room or is alive again is not revived', async () => {
            let relocator = new PlayerDeathRelocator({config: this.deathBuilder.createConfig()});
            let leftSetup = this.deathBuilder.createSetup({activePlayers: []});
            this.assert.strictEqual(await relocator.resolveDeath(leftSetup.event), false);
            this.assert.strictEqual(leftSetup.revivedPlayers, 0);
            let aliveSetup = this.deathBuilder.createSetup({inState: GameConst.STATUS.ACTIVE});
            this.assert.strictEqual(await relocator.resolveDeath(aliveSetup.event), false);
            this.assert.strictEqual(aliveSetup.revivedPlayers, 0);
            this.assert.deepStrictEqual(aliveSetup.sceneChanges, []);
        });
    }

    async testRestorationItemRevivesWhereThePlayerDied()
    {
        await this.test('a restoration item is consumed and the player revives where it died', async () => {
            let setup = this.deathBuilder.createSetup({restorationQty: 2});
            let relocator = new PlayerDeathRelocator({config: this.deathBuilder.createConfig()});
            this.assert.strictEqual(await relocator.resolveDeath(setup.event), true);
            let decreasedItems = setup.playerSchema.inventory.manager.decreasedItems;
            this.assert.deepStrictEqual(decreasedItems, [{inventoryId: this.deathBuilder.restorationItemKey, qty: 1}]);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.deepStrictEqual(setup.positionedPlayers, []);
        });
    }

    async testPlayingResurrectionAdDelaysTheResolution()
    {
        await this.test('a playing resurrection ad delays the death resolution to wait its reward', async () => {
            let setup = this.deathBuilder.createSetup();
            let deathTimerKey = ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER;
            setup.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, Date.now());
            let relocator = new PlayerDeathRelocator({config: this.deathBuilder.createConfig()});
            this.assert.strictEqual(await relocator.resolveDeath(setup.event), true);
            let deathTimer = setup.playerSchema.getPrivate(deathTimerKey);
            clearTimeout(deathTimer);
            this.assert.strictEqual(sc.hasOwn(setup.playerSchema.privateData, deathTimerKey), true);
            this.assert.strictEqual(setup.revivedPlayers, 0);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.savedStats, 0);
        });
    }

    async testDeathOutOfTownRevivesInTown()
    {
        await this.test('a death out of town after an expired ad wait revives the player in town', async () => {
            let setup = this.deathBuilder.createSetup();
            let expiredStart = Date.now() - ActionsConst.DEATH.DEFAULTS.RESURRECTION_AD_MAX_WAIT_MS - 1;
            setup.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, expiredStart);
            let relocator = new PlayerDeathRelocator({config: this.deathBuilder.createConfig()});
            this.assert.strictEqual(await relocator.resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.playerSchema.stats, {hp: 100});
            this.assert.strictEqual(setup.savedStats, 1);
            this.assert.deepStrictEqual(setup.client.sentMessages, [{act: GameConst.REVIVED, t: 'session-7'}]);
            this.assert.deepStrictEqual(setup.sceneChanges, [{
                scene: this.roomBuilder.townRoom.roomName,
                prev: this.roomBuilder.forestRoom.roomName
            }]);
            this.assert.strictEqual(setup.revivedPlayers, 0);
        });
    }

    async testDeathInTownRevivesOnTheReturnPoint()
    {
        await this.test('a death in the town places the player on the town return point and revives it', async () => {
            let setup = this.deathBuilder.createSetup({currentRoomName: this.roomBuilder.townRoom.roomName});
            let relocator = new PlayerDeathRelocator({config: this.deathBuilder.createConfig()});
            this.assert.strictEqual(await relocator.resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.positionedPlayers, [{id: 'session-7', x: 400, y: 500}]);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.savedStats, 0);
        });
    }

    async testFailedTownRelocationRevivesWhereThePlayerDied()
    {
        await this.test('an unavailable town room revives the player where it died', async () => {
            let setup = this.deathBuilder.createSetup({isRoomAvailable: false});
            let relocator = new PlayerDeathRelocator({config: this.deathBuilder.createConfig()});
            this.assert.strictEqual(await relocator.resolveDeath(setup.event), true);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
        });
    }

    async testInitialRoomIsTheTownWithoutTeleportRoom()
    {
        await this.test('without the teleport room the players initial room is the town', async () => {
            let setup = this.deathBuilder.createSetup();
            let relocator = new PlayerDeathRelocator({
                config: this.deathBuilder.createConfig({
                    [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID]: 0,
                    ['server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH]: this.roomBuilder.forestRoom.roomId
                })
            });
            this.assert.strictEqual(await relocator.resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.positionedPlayers, [{id: 'session-7', x: 96, y: 64}]);
            this.assert.strictEqual(setup.revivedPlayers, 1);
        });
    }

}

module.exports.TestPlayerDeathRelocator = TestPlayerDeathRelocator;
