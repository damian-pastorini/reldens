/**
 *
 * Reldens - Test Player Death Auto Revive
 *
 */

const { BaseTest } = require('./base-test');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { ActionsConst } = require('../lib/actions/constants');
const { GameConst } = require('../lib/game/constants');
const { once } = require('events');

class TestPlayerDeathAutoRevive extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.deathBuilder = new DeathRelocationBuilder();
        this.paths = ActionsConst.DEATH.CONFIG_PATHS;
        this.privateData = ActionsConst.DEATH.PRIVATE_DATA;
        this.manualRevive = this.deathBuilder.manualReviveConfig;
        this.inPlaceManualRevive = Object.assign({[this.paths.TELEPORT_ENABLED]: false}, this.manualRevive);
        this.reviveReadyEventKey = 'reldens.playerReviveReady';
        this.revivedMessage = {act: GameConst.REVIVED, t: 'session-7'};
        this.townChange = this.deathBuilder.townSceneChange;
    }

    async createReadySetup(configValues = this.manualRevive, setupOptions = {})
    {
        let setup = await this.deathBuilder.createRelocatorSetup(configValues, setupOptions);
        this.deathBuilder.startDeath(setup);
        await setup.relocator.markReviveReady(setup.event);
        return setup;
    }

    async testDisabledAutoReviveReplacesTheBattleReviveTimer()
    {
        await this.test('the disabled auto revive replaces the battle timer with or without teleport', async () => {
            for(let teleportEnabled of [false, true]){
                let setup = await this.deathBuilder.createRelocatorSetup(
                    Object.assign({}, this.manualRevive, {[this.paths.TELEPORT_ENABLED]: teleportEnabled})
                );
                let battleTimer = {battleRevive: true};
                setup.playerSchema.setPrivate(this.privateData.PLAYER_DEATH_TIMER, battleTimer);
                setup.playerSchema.setPrivate(
                    this.privateData.RESTORATION_ITEM_CHOICE,
                    ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE
                );
                setup.playerSchema.setPrivate(this.privateData.REVIVE_READY, true);
                let deathTime = Date.now();
                this.assert.strictEqual(this.deathBuilder.startDeath(setup), true);
                let deathTimer = setup.playerSchema.getPrivate(this.privateData.PLAYER_DEATH_TIMER);
                this.assert.notStrictEqual(deathTimer, battleTimer);
                let reviveAt = setup.playerSchema.getPrivate(this.privateData.REVIVE_AT);
                this.assert.strictEqual(deathTime + 60000 <= reviveAt, true);
                this.assert.strictEqual(reviveAt <= Date.now() + 60000, true);
                this.assert.strictEqual(setup.playerSchema.getPrivate(this.privateData.RESTORATION_ITEM_CHOICE), null);
                this.assert.strictEqual(setup.playerSchema.getPrivate(this.privateData.REVIVE_READY), null);
                this.assert.strictEqual(
                    setup.playerSchema.getPrivate(this.privateData.PLAYER_DEATH_EVENT),
                    setup.event
                );
                this.assert.strictEqual(setup.revivedPlayers, 0);
            }
            let battleReviveSetup = await this.deathBuilder.createRelocatorSetup({[this.paths.TELEPORT_ENABLED]: false});
            this.assert.strictEqual(this.deathBuilder.startDeath(battleReviveSetup), false);
            this.assert.strictEqual(battleReviveSetup.playerSchema.getPrivate(this.privateData.REVIVE_AT), null);
        });
    }

    async testReviveTimeMarksTheReviveReady()
    {
        await this.test('the revive time of the disabled auto revive tells the revive can be asked', async () => {
            let setup = await this.createReadySetup();
            this.assert.strictEqual(setup.playerSchema.getPrivate(this.privateData.REVIVE_READY), true);
            this.assert.deepStrictEqual(
                setup.emittedEvents,
                [{eventKey: this.reviveReadyEventKey, eventData: setup.event}]
            );
            this.assert.strictEqual(setup.revivedPlayers, 0);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            this.assert.strictEqual(setup.savedStats, 0);
        });
    }

    async testReviveTimeOfALeftOrAlivePlayerIsIgnored()
    {
        await this.test('the revive time of a player that left or is alive marks and tells nothing', async () => {
            for(let setupOptions of [{activePlayers: []}, {inState: GameConst.STATUS.ACTIVE}]){
                let setup = await this.createReadySetup(this.manualRevive, setupOptions);
                this.assert.strictEqual(await setup.relocator.markReviveReady(setup.event), false);
                this.assert.strictEqual(setup.playerSchema.getPrivate(this.privateData.REVIVE_READY), null);
                this.assert.deepStrictEqual(setup.emittedEvents, []);
            }
        });
    }

    async testFailedReviveRequestCanBeAskedAgain()
    {
        await this.test('a revive request that fails keeps the revive ready, so the player can ask again', async () => {
            let setup = await this.createReadySetup();
            setup.room.savePlayerStats = async () => Promise.reject({message: 'Storage.'});
            this.assert.strictEqual(await setup.relocator.requestRevive(setup.playerSchema, setup.room), false);
            this.assert.strictEqual(setup.playerSchema.isDeath(), true);
            this.assert.strictEqual(setup.playerSchema.getPrivate(this.privateData.REVIVE_READY), true);
            this.assert.strictEqual(setup.playerSchema.privateData[this.privateData.REVIVE_REQUESTED], false);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            setup.room.savePlayerStats = async () => true;
            this.assert.strictEqual(await setup.relocator.requestRevive(setup.playerSchema, setup.room), true);
            this.assert.deepStrictEqual(setup.sceneChanges, this.townChange);
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.revivedMessage]);
        });
    }

    async testScheduledReviveTimeTellsTheReviveReady()
    {
        await this.test('the scheduled game over time of the disabled auto revive tells the revive ready', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup(
                Object.assign({[this.paths.GAME_OVER_TIME_OUT]: 1}, this.manualRevive)
            );
            let reviveReadyEvent = once(setup.eventsEmitter, this.reviveReadyEventKey);
            this.assert.strictEqual(setup.relocator.onPlayerDeath(setup.event), true);
            this.assert.strictEqual((await reviveReadyEvent).shift(), setup.event);
            this.assert.strictEqual(setup.playerSchema.getPrivate(this.privateData.REVIVE_READY), true);
            this.assert.strictEqual(setup.revivedPlayers, 0);
        });
    }

    async testReviveRequestRevivesOnlyOnceAfterTheWait()
    {
        await this.test('the revive request revives in place only once and only after the wait', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup(this.inPlaceManualRevive);
            this.deathBuilder.startDeath(setup);
            this.assert.strictEqual(await setup.relocator.requestRevive(setup.playerSchema, setup.room), false);
            this.assert.strictEqual(setup.revivedPlayers, 0);
            await setup.relocator.markReviveReady(setup.event);
            this.assert.strictEqual(await setup.relocator.requestRevive(setup.playerSchema, setup.room), true);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.strictEqual(setup.playerSchema.isDeath(), false);
            this.assert.strictEqual(setup.playerSchema.privateData[this.privateData.REVIVE_REQUESTED], false);
            this.assert.strictEqual(await setup.relocator.requestRevive(setup.playerSchema, setup.room), false);
            this.assert.strictEqual(setup.revivedPlayers, 1);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
        });
    }

    async testConcurrentReviveRequestsReviveOnce()
    {
        await this.test('two revive requests at the same time revive the player once', async () => {
            let setup = await this.createReadySetup(this.inPlaceManualRevive);
            let requestResults = await Promise.all([
                setup.relocator.requestRevive(setup.playerSchema, setup.room),
                setup.relocator.requestRevive(setup.playerSchema, setup.room)
            ]);
            this.assert.deepStrictEqual(requestResults, [true, false]);
            this.assert.strictEqual(setup.revivedPlayers, 1);
        });
    }

    async testReviveRequestsOfOtherRoomsOrPlayersAreRejected()
    {
        await this.test('revive requests from another room, of a missing or alive player are rejected', async () => {
            let setup = await this.createReadySetup();
            this.assert.strictEqual(await setup.relocator.requestRevive(setup.playerSchema, {}), false);
            this.assert.strictEqual(await setup.relocator.requestRevive(false, setup.room), false);
            this.assert.strictEqual(await setup.relocator.requestRevive(null, setup.room), false);
            this.assert.strictEqual(setup.playerSchema.getPrivate(this.privateData.REVIVE_READY), true);
            setup.playerSchema.inState = GameConst.STATUS.ACTIVE;
            this.assert.strictEqual(await setup.relocator.requestRevive(setup.playerSchema, setup.room), false);
            this.assert.strictEqual(setup.revivedPlayers, 0);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
        });
    }

    async testReviveRequestWithTeleportRevivesInTown()
    {
        await this.test('the revive request with teleport revives the player without item in town', async () => {
            let setup = await this.createReadySetup();
            this.assert.strictEqual(await setup.relocator.requestRevive(setup.playerSchema, setup.room), true);
            this.assert.deepStrictEqual(setup.sceneChanges, this.townChange);
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.revivedMessage]);
            this.assert.strictEqual(setup.revivedPlayers, 0);
        });
    }

    async testReviveRequestWaitsThePlayingAdWithoutAskingAgain()
    {
        await this.test('the revive request waits the playing ad and then revives without asking again', async () => {
            let setup = await this.createReadySetup();
            let recordSceneChange = setup.room.broadcastSceneChange;
            setup.room.broadcastSceneChange = (client, playerSchema, data) => {
                recordSceneChange(client, playerSchema, data);
                setup.eventsEmitter.emit('sceneChange', data);
            };
            let townRevive = once(setup.eventsEmitter, 'sceneChange');
            setup.playerSchema.setPrivate(this.privateData.RESURRECTION_AD_STARTED, Date.now());
            this.assert.strictEqual(await setup.relocator.requestRevive(setup.playerSchema, setup.room), true);
            this.assert.deepStrictEqual(setup.sceneChanges, []);
            setup.playerSchema.setPrivate(this.privateData.RESURRECTION_AD_FAILED, true);
            await townRevive;
            this.assert.deepStrictEqual(setup.sceneChanges, this.townChange);
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.revivedMessage]);
            this.assert.strictEqual(setup.emittedEvents.length, 1);
            this.assert.strictEqual(setup.playerSchema.privateData[this.privateData.REVIVE_REQUESTED], false);
        });
    }

    async testReviveOptionsAndTheirDefaults()
    {
        await this.test('auto revive and auto consume are enabled when missing and follow the config', async () => {
            let defaultRelocator = (await this.deathBuilder.createRelocatorSetup()).relocator;
            this.assert.strictEqual(defaultRelocator.isAutoReviveEnabled(), true);
            this.assert.strictEqual(defaultRelocator.isAutoConsumeEnabled(), true);
            let disabledRelocator = (await this.deathBuilder.createRelocatorSetup(
                Object.assign({[this.paths.AUTO_CONSUME_RESTORATION_ITEM]: false}, this.manualRevive)
            )).relocator;
            this.assert.strictEqual(disabledRelocator.isAutoReviveEnabled(), false);
            this.assert.strictEqual(disabledRelocator.isAutoConsumeEnabled(), false);
        });
    }

    async testReviveWaitSecondsAreRoundedUp()
    {
        await this.test('the revive wait seconds are rounded up and never below one second', async () => {
            let setup = await this.deathBuilder.createRelocatorSetup();
            let waitCases = [
                {reviveAt: Date.now() + 10000, seconds: 10},
                {reviveAt: Date.now() - 5000, seconds: 1},
                {reviveAt: null, seconds: 1}
            ];
            for(let waitCase of waitCases){
                setup.playerSchema.setPrivate(this.privateData.REVIVE_AT, waitCase.reviveAt);
                this.assert.strictEqual(setup.relocator.fetchReviveWaitSeconds(setup.playerSchema), waitCase.seconds);
            }
        });
    }

}

module.exports.TestPlayerDeathAutoRevive = TestPlayerDeathAutoRevive;
