/**
 *
 * Reldens - Test Player Death Relocator Failures
 *
 */

const { BaseTest } = require('./base-test');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { PlayerDeathRelocator } = require('../lib/actions/server/player-death-relocator');
const { ActionsConst } = require('../lib/actions/constants');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');
const timersPromises = require('timers/promises');

class TestPlayerDeathRelocatorFailures extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.deathBuilder = new DeathRelocationBuilder();
        this.roomBuilder = this.deathBuilder.roomBuilder;
        this.deathTimeOutMs = 5;
        this.deathTimeOutWaitMs = 30;
    }

    createRelocator(configValues = {})
    {
        return new PlayerDeathRelocator({config: this.deathBuilder.createConfig(configValues)});
    }

    assertRevivedInTown(setup)
    {
        this.assert.deepStrictEqual(setup.sceneChanges, [{
            scene: this.roomBuilder.townRoom.roomName,
            prev: this.roomBuilder.forestRoom.roomName
        }]);
        this.assert.strictEqual(setup.savedStats, 1);
        this.assert.strictEqual(setup.revivedPlayers, 0);
    }

    async testFailedTownStateSaveRevivesWhereThePlayerDied()
    {
        await this.test('a failed town state save restores the state and revives the player where it died', async () => {
            let setup = this.deathBuilder.createSetup({saveResult: false});
            this.assert.strictEqual(await this.createRelocator().resolveDeath(setup.event), true);
            this.assert.strictEqual(setup.savedStates, 1);
            this.assert.deepStrictEqual(setup.playerSchema.state, setup.initialState);
            this.assert.deepStrictEqual(setup.broadcasts, []);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.playerBody.isChangingScene, false);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.strictEqual(setup.savedStats, 1);
            this.assert.deepStrictEqual(setup.client.sentMessages, [{act: GameConst.REVIVED, t: 'session-7'}]);
        });
    }

    async testFailedStateSaveInTownStillRevives()
    {
        await this.test('a failed state save in the town still revives the player on the return point', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let setup = this.deathBuilder.createSetup({currentRoomName: townRoom.roomName, saveResult: false});
            this.assert.strictEqual(await this.createRelocator().resolveDeath(setup.event), true);
            this.assert.strictEqual(setup.savedStates, 1);
            this.assert.deepStrictEqual(setup.positionedPlayers, [{
                id: 'session-7',
                x: townRoom.returnPointDefault.x,
                y: townRoom.returnPointDefault.y
            }]);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
        });
    }

    async testUnknownTownRoomRevivesWhereThePlayerDied()
    {
        await this.test('an unknown town room revives the player where it died', async () => {
            let setup = this.deathBuilder.createSetup();
            let relocator = this.createRelocator({[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID]: 999});
            this.assert.strictEqual(await relocator.resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.loadedRooms, [GameConst.ROOM_NAME_MAP]);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.savedStates, 0);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.deepStrictEqual(setup.playerSchema.state, setup.initialState);
        });
    }

    async testRestorationItemIsUsedWhileTheAdPlays()
    {
        await this.test('a restoration item is used without waiting the resurrection ad that is playing', async () => {
            let deathTimerKey = ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER;
            let setup = this.deathBuilder.createSetup({restorationQty: 1});
            setup.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, Date.now());
            this.assert.strictEqual(await this.createRelocator().resolveDeath(setup.event), true);
            this.assert.deepStrictEqual(
                setup.playerSchema.inventory.manager.decreasedItems,
                [{inventoryId: this.deathBuilder.restorationItemKey, qty: 1}]
            );
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.strictEqual(sc.hasOwn(setup.playerSchema.privateData, deathTimerKey), false);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
        });
    }

    async testUnusableRestorationItemRevivesInTown()
    {
        await this.test('a restoration item that is not configured, missing or without quantity is not used', async () => {
            let itemKeyPath = ActionsConst.DEATH.CONFIG_PATHS.RESTORATION_ITEM_KEY;
            let unusableCases = [
                {setupOptions: {restorationQty: 1}, configValues: {[itemKeyPath]: ''}},
                {setupOptions: {restorationQty: 1}, configValues: {[itemKeyPath]: 'other_item'}},
                {setupOptions: {restorationQty: -1}, configValues: {}},
                {setupOptions: {restorationQty: '0'}, configValues: {}},
                {setupOptions: {restorationQty: 'none'}, configValues: {}}
            ];
            for(let unusableCase of unusableCases){
                let setup = this.deathBuilder.createSetup(unusableCase.setupOptions);
                let relocator = this.createRelocator(unusableCase.configValues);
                this.assert.strictEqual(await relocator.resolveDeath(setup.event), true);
                this.assert.deepStrictEqual(setup.playerSchema.inventory.manager.decreasedItems, []);
                this.assertRevivedInTown(setup);
            }
        });
    }

    async testPlayerWithoutInventoryRevivesInTown()
    {
        await this.test('a player without inventory revives in town', async () => {
            let setup = this.deathBuilder.createSetup({restorationQty: 1});
            setup.playerSchema.inventory = null;
            this.assert.strictEqual(await this.createRelocator().resolveDeath(setup.event), true);
            this.assertRevivedInTown(setup);
        });
    }

    async testAdStartedAtTheMaximumWaitIsNotWaited()
    {
        await this.test('a resurrection ad started the maximum wait time ago is not waited', async () => {
            let deathTimerKey = ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_TIMER;
            let setup = this.deathBuilder.createSetup();
            let maximumWaitStart = Date.now() - ActionsConst.DEATH.DEFAULTS.RESURRECTION_AD_MAX_WAIT_MS;
            setup.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESURRECTION_AD_STARTED, maximumWaitStart);
            this.assert.strictEqual(await this.createRelocator().resolveDeath(setup.event), true);
            this.assert.strictEqual(sc.hasOwn(setup.playerSchema.privateData, deathTimerKey), false);
            this.assertRevivedInTown(setup);
        });
    }

    async testScheduledResolutionRevivesAfterTheTimeOut()
    {
        await this.test('the scheduled death resolution revives the player in town after the game over time', async () => {
            let setup = this.deathBuilder.createSetup();
            let relocator = this.createRelocator({
                [ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: this.deathTimeOutMs
            });
            this.assert.strictEqual(relocator.onPlayerDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            await timersPromises.setTimeout(this.deathTimeOutWaitMs);
            this.assertRevivedInTown(setup);
        });
    }

    async testNewDeathReplacesThePendingResolution()
    {
        await this.test('a new death replaces the pending death resolution so it runs once', async () => {
            let setup = this.deathBuilder.createSetup();
            let relocator = this.createRelocator({
                [ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: this.deathTimeOutMs
            });
            relocator.onPlayerDeath(setup.event);
            relocator.onPlayerDeath(setup.event);
            await timersPromises.setTimeout(this.deathTimeOutWaitMs);
            this.assertRevivedInTown(setup);
            this.assert.strictEqual(setup.client.sentMessages.length, 1);
        });
    }

    async testRejectedResolutionIsCaught()
    {
        await this.test('a rejected scheduled death resolution is caught and never revives the player', async () => {
            let setup = this.deathBuilder.createSetup({restorationQty: 1});
            setup.playerSchema.inventory.manager.decreaseItemQty = async () => Promise.reject({message: 'Storage.'});
            let relocator = this.createRelocator({
                [ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: this.deathTimeOutMs
            });
            this.assert.strictEqual(relocator.onPlayerDeath(setup.event), true);
            await timersPromises.setTimeout(this.deathTimeOutWaitMs);
            this.assert.strictEqual(setup.revivedPlayers, 0);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.savedStats, 0);
        });
    }

}

module.exports.TestPlayerDeathRelocatorFailures = TestPlayerDeathRelocatorFailures;
