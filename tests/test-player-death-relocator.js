/**
 *
 * Reldens - Test Player Death Relocator
 *
 */

const { BaseTest } = require('./base-test');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { PlayerDeathRelocator } = require('../lib/actions/server/player-death-relocator');
const { ConfigProcessor } = require('../lib/config/processor');
const { ActionsConst } = require('../lib/actions/constants');
const { AdsConst } = require('../lib/ads/constants');
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
        this.privateDataKeys = ActionsConst.DEATH.PRIVATE_DATA;
        this.deathTimerKey = this.privateDataKeys.PLAYER_DEATH_TIMER;
        this.resetAdKeys = [
            this.privateDataKeys.RESURRECTION_AD_REQUESTED,
            this.privateDataKeys.RESURRECTION_AD_STARTED,
            this.privateDataKeys.RESURRECTION_AD_ENDED,
            this.privateDataKeys.RESURRECTION_AD_FAILED
        ];
    }

    async testConfigProcessorInstancesAreKept()
    {
        await this.test('a ConfigProcessor or ConfigManager instance is valid and drives the death teleport', async () => {
            let emptyConfigSetup = this.deathBuilder.createSetup();
            let emptyConfigRelocator = new PlayerDeathRelocator({config: new ConfigProcessor(), events: {}});
            this.assert.strictEqual(emptyConfigRelocator.validate(), true);
            this.assert.strictEqual(emptyConfigRelocator.isTeleportEnabled(), false);
            this.assert.strictEqual(emptyConfigRelocator.onPlayerDeath(emptyConfigSetup.event), false);
            this.assert.strictEqual(sc.hasOwn(emptyConfigSetup.playerSchema.privateData, this.deathTimerKey), false);
            let setup = await this.deathBuilder.createRelocatorSetup();
            this.assert.strictEqual(setup.relocator.validate(), true);
            this.assert.strictEqual(setup.isTownRoomLoaded, true);
            this.assert.strictEqual(setup.relocator.townRoom, this.roomBuilder.townRoom);
            this.assert.strictEqual(setup.relocator.onPlayerDeath(setup.event), true);
            clearTimeout(setup.playerSchema.getPrivate(this.deathTimerKey));
            this.assert.strictEqual(setup.revivedPlayers, 0);
        });
    }

    async testDisabledTeleportKeepsTheBattleRevive()
    {
        await this.test('the disabled death teleport keeps the battle revive and resets the ad flags', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup(
                {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false}
            );
            for(let adKey of this.resetAdKeys){
                setup.playerSchema.setPrivate(adKey, Date.now());
            }
            this.assert.strictEqual(setup.relocator.onPlayerDeath(setup.event), false);
            for(let adKey of this.resetAdKeys){
                this.assert.strictEqual(setup.playerSchema.privateData[adKey], false);
            }
            this.assert.strictEqual(sc.hasOwn(setup.playerSchema.privateData, this.deathTimerKey), false);
        });
    }

    async testDeathWithoutCallbackOrAlivePlayerIsNotHandled()
    {
        await this.test('a death without revive callback or of an alive player is not handled', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup();
            setup.event.revivePlayerCallback = false;
            this.assert.strictEqual(setup.relocator.onPlayerDeath(setup.event), false);
            this.assert.strictEqual(sc.hasOwn(setup.playerSchema.privateData, this.deathTimerKey), false);
            let aliveSetup = await this.deathBuilder.createRelocatorSetup({}, {inState: GameConst.STATUS.ACTIVE});
            this.assert.strictEqual(aliveSetup.relocator.onPlayerDeath(aliveSetup.event), false);
            this.assert.strictEqual(sc.hasOwn(aliveSetup.playerSchema.privateData, this.deathTimerKey), false);
        });
    }

    async testTeleportReplacesTheBattleReviveTimer()
    {
        await this.test('the death teleport replaces the battle revive timer by its own', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup();
            let battleRevived = false;
            let battleTimer = setTimeout(() => battleRevived = true, this.battleTimerMs);
            setup.playerSchema.setPrivate(this.deathTimerKey, battleTimer);
            this.assert.strictEqual(setup.relocator.onPlayerDeath(setup.event), true);
            let deathTimer = setup.playerSchema.getPrivate(this.deathTimerKey);
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
            let leftSetup = await this.deathBuilder.createRelocatorSetup({}, {activePlayers: []});
            this.assert.strictEqual(await leftSetup.relocator.resolveDeath(leftSetup.event), false);
            this.assert.strictEqual(leftSetup.revivedPlayers, 0);
            let aliveSetup = await this.deathBuilder.createRelocatorSetup({}, {inState: GameConst.STATUS.ACTIVE});
            this.assert.strictEqual(await aliveSetup.relocator.resolveDeath(aliveSetup.event), false);
            this.assert.strictEqual(aliveSetup.revivedPlayers, 0);
            this.assert.deepStrictEqual(aliveSetup.sceneChanges, []);
        });
    }

    async testRestorationItemRevivesWhereThePlayerDied()
    {
        await this.test('a restoration item is consumed and the player revives where it died', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup({}, {restorationQty: 2});
            this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
            this.deathBuilder.assertRevivedWithRestorationItem(this.assert, setup);
            this.assert.deepStrictEqual(setup.positionedPlayers, []);
        });
    }

    async testPlayingResurrectionAdDelaysTheResolution()
    {
        await this.test('a started resurrection ad not ended delays the death resolution to wait its reward', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup();
            setup.playerSchema.setPrivate(this.privateDataKeys.RESURRECTION_AD_STARTED, Date.now());
            this.assert.strictEqual(setup.relocator.isWaitingResurrectionAd(setup.playerSchema), true);
            this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
            clearTimeout(setup.playerSchema.getPrivate(this.deathTimerKey));
            this.assert.strictEqual(sc.hasOwn(setup.playerSchema.privateData, this.deathTimerKey), true);
            this.assert.strictEqual(setup.revivedPlayers, 0);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.savedStats, 0);
        });
    }

    async testResurrectionAdWaitEndsWithTheAd()
    {
        await this.test('the resurrection ad is not waited when it was not started, ended, failed or too long', async () => {
            let keys = this.privateDataKeys;
            let maximumDuration = 100;
            let notWaitedCases = [
                {[keys.RESURRECTION_AD_REQUESTED]: true},
                {[keys.RESURRECTION_AD_STARTED]: Date.now(), [keys.RESURRECTION_AD_ENDED]: true},
                {[keys.RESURRECTION_AD_STARTED]: Date.now(), [keys.RESURRECTION_AD_FAILED]: true},
                {[keys.RESURRECTION_AD_STARTED]: Date.now() - maximumDuration}
            ];
            for(let privateData of notWaitedCases){
                let setup = await this.deathBuilder.createRelocatorSetup(
                    {[AdsConst.CONFIG_PATHS.VIDEOS_MAXIMUM_DURATION]: maximumDuration}
                );
                Object.assign(setup.playerSchema.privateData, privateData);
                this.assert.strictEqual(setup.relocator.isWaitingResurrectionAd(setup.playerSchema), false);
                this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
                this.assert.deepStrictEqual(setup.sceneChanges, this.deathBuilder.townSceneChange);
            }
        });
    }

    async testDeathOutOfTownRevivesInTown()
    {
        await this.test('a death out of town after the ads maximum duration revives the player in town', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup();
            let expiredStart = Date.now() - AdsConst.VIDEOS_MAXIMUM_DURATION - 1;
            setup.playerSchema.setPrivate(this.privateDataKeys.RESURRECTION_AD_STARTED, expiredStart);
            this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.playerSchema.stats, {hp: 100});
            this.assert.strictEqual(setup.savedStats, 1);
            this.assert.deepStrictEqual(setup.client.sentMessages, [{act: GameConst.REVIVED, t: 'session-7'}]);
            this.assert.deepStrictEqual(setup.sceneChanges, this.deathBuilder.townSceneChange);
            this.assert.strictEqual(setup.revivedPlayers, 0);
        });
    }

    async testDeathInTownRevivesOnTheReturnPoint()
    {
        await this.test('a death in the town places the player on the town return point and revives it', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup(
                {},
                {currentRoomName: this.roomBuilder.townRoom.roomName}
            );
            this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.positionedPlayers, [{id: 'session-7', x: 400, y: 500}]);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.savedStats, 0);
        });
    }

    async testFailedTownRelocationRevivesWhereThePlayerDied()
    {
        await this.test('an unavailable town room revives the player where it died', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup({}, {isRoomAvailable: false});
            this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
        });
    }

    async testInitialRoomIsTheTownWithoutTeleportRoom()
    {
        await this.test('without the teleport room the players initial room is the town', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup({
                [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID]: 0,
                ['server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH]: this.roomBuilder.forestRoom.roomId
            });
            this.assert.strictEqual(setup.relocator.townRoom, this.roomBuilder.forestRoom);
            this.assert.strictEqual(await setup.relocator.resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.positionedPlayers, [{id: 'session-7', x: 96, y: 64}]);
            this.assert.strictEqual(setup.revivedPlayers, 1);
        });
    }

}

module.exports.TestPlayerDeathRelocator = TestPlayerDeathRelocator;
