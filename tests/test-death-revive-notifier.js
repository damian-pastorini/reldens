/**
 *
 * Reldens - Test Death Revive Notifier
 *
 */

const { BaseTest } = require('./base-test');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { DeathReviveNotifier } = require('../lib/actions/server/death-revive-notifier');
const { PlayerDeathRelocator } = require('../lib/actions/server/player-death-relocator');
const { ActionsConst } = require('../lib/actions/constants');
const { AdsConst } = require('../lib/ads/constants');
const { GameConst } = require('../lib/game/constants');

class TestDeathReviveNotifier extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.deathBuilder = new DeathRelocationBuilder();
        this.resurrectionAd = {
            id: 7,
            key: 'resurrection-video',
            eventKey: 'reldens.resurrectionAd',
            enabled: 1,
            provider: {enabled: 1}
        };
        this.otherAd = {id: 8, key: 'other-video', enabled: 1, provider: {enabled: 1}};
        let reviveAction = ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE;
        this.inPlaceMessage = {act: reviveAction, mode: ActionsConst.DEATH.REVIVE_MODES.IN_PLACE};
        this.itemMessage = {
            act: reviveAction,
            mode: ActionsConst.DEATH.REVIVE_MODES.RESTORATION_ITEM,
            itemLabel: this.deathBuilder.restorationItemKey
        };
        this.townMessage = {
            act: reviveAction,
            mode: ActionsConst.DEATH.REVIVE_MODES.TOWN,
            townLabel: this.deathBuilder.roomBuilder.townRoom.roomTitle,
            resurrectionAdEventKey: this.resurrectionAd.eventKey
        };
    }

    createNotifierSetup(configValues = {}, setupOptions = {})
    {
        let config = this.deathBuilder.createConfig(Object.assign({
            [ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY]: this.resurrectionAd.key,
            [AdsConst.CONFIG_PATHS.COLLECTION]: {
                [this.resurrectionAd.id]: this.resurrectionAd,
                [this.otherAd.id]: this.otherAd
            }
        }, configValues));
        let setup = this.deathBuilder.createSetup(setupOptions);
        setup.room.getClientById = (sessionId) => sessionId === setup.playerSchema.sessionId ? setup.client : false;
        setup.rewardEvent = {
            playedAd: Object.assign({}, this.resurrectionAd),
            room: setup.room,
            playerSchema: setup.playerSchema
        };
        setup.notifier = new DeathReviveNotifier({config, playerDeathRelocator: new PlayerDeathRelocator({config})});
        return setup;
    }

    async testDisabledTeleportTellsTheRevivePlace()
    {
        await this.test('the disabled death teleport tells the player it revives where it died', async () => {
            let setup = this.createNotifierSetup(
                {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false},
                {restorationQty: 1}
            );
            this.assert.strictEqual(await setup.notifier.onPlayerDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.inPlaceMessage]);
            this.assert.strictEqual(setup.playerSchema.inventory.manager.items.restoration_scroll.qty, 1);
        });
    }

    async testInvalidRelocatorConfigTellsTheRevivePlace()
    {
        await this.test('a relocator without a valid config keeps the battle revive and tells the place', async () => {
            let setup = this.createNotifierSetup();
            setup.notifier.playerDeathRelocator = new PlayerDeathRelocator({config: {getWithoutLogs: () => true}});
            this.assert.strictEqual(setup.notifier.playerDeathRelocator.config, false);
            this.assert.strictEqual(await setup.notifier.onPlayerDeath(setup.event), true);
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.inPlaceMessage]);
        });
    }

    async testRestorationItemTellsTheRevivePlace()
    {
        await this.test('a carried restoration item tells the revive where it died with the item label', async () => {
            for(let restorationQty of [1, 3]){
                let setup = this.createNotifierSetup({}, {restorationQty});
                this.assert.strictEqual(await setup.notifier.onPlayerDeath(setup.event), true);
                this.assert.deepStrictEqual(setup.client.sentMessages, [this.itemMessage]);
                this.assert.strictEqual(
                    setup.playerSchema.inventory.manager.items.restoration_scroll.qty,
                    restorationQty,
                    'The notification must not consume the item'
                );
                this.assert.deepStrictEqual(setup.playerSchema.inventory.manager.decreasedItems, []);
            }
        });
    }

    async testTownReviveOffersTheEnabledResurrectionAd()
    {
        await this.test('the town revive tells the town title and offers only an enabled resurrection ad', async () => {
            let collectionPath = AdsConst.CONFIG_PATHS.COLLECTION;
            let adsKeyPath = ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY;
            let disabledAd = Object.assign({}, this.resurrectionAd, {enabled: 0});
            let disabledProviderAd = Object.assign({}, this.resurrectionAd, {provider: {enabled: 0}});
            let customEventAd = Object.assign({}, this.resurrectionAd, {eventKey: 'custom.resurrectionEvent'});
            let bannerAd = Object.assign({}, this.resurrectionAd);
            delete bannerAd.eventKey;
            let adCases = [
                {configValues: {}, eventKey: this.resurrectionAd.eventKey},
                {
                    configValues: {[collectionPath]: {[customEventAd.id]: customEventAd}},
                    eventKey: customEventAd.eventKey
                },
                {configValues: {[collectionPath]: {[bannerAd.id]: bannerAd}}, eventKey: ''},
                {configValues: {[collectionPath]: {[disabledAd.id]: disabledAd}}, eventKey: ''},
                {configValues: {[collectionPath]: {[disabledAd.id]: disabledProviderAd}}, eventKey: ''},
                {configValues: {[collectionPath]: {}}, eventKey: ''},
                {configValues: {[adsKeyPath]: ''}, eventKey: ''},
                {configValues: {[adsKeyPath]: 'missing-video'}, eventKey: ''}
            ];
            for(let adCase of adCases){
                let setup = this.createNotifierSetup(adCase.configValues, {restorationQty: 0});
                this.assert.strictEqual(await setup.notifier.onPlayerDeath(setup.event), true);
                this.assert.deepStrictEqual(
                    setup.client.sentMessages,
                    [Object.assign({}, this.townMessage, {resurrectionAdEventKey: adCase.eventKey})]
                );
            }
        });
    }

    async testPlayerWithoutInventoryIsToldTheTownRevive()
    {
        await this.test('a player without inventory is told the town revive', async () => {
            let setup = this.createNotifierSetup({}, {restorationQty: 1});
            setup.playerSchema.inventory = false;
            await setup.notifier.onPlayerDeath(setup.event);
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.townMessage]);
        });
    }

    async testUnknownTownRoomIsToldWithoutTitle()
    {
        await this.test('an unknown town room or a town room without title is told without title', async () => {
            let roomIdPath = ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID;
            let untitledTownMessage = Object.assign({}, this.townMessage, {townLabel: ''});
            let unknownRoomSetup = this.createNotifierSetup({[roomIdPath]: 999});
            await unknownRoomSetup.notifier.onPlayerDeath(unknownRoomSetup.event);
            this.assert.deepStrictEqual(unknownRoomSetup.client.sentMessages, [untitledTownMessage]);
            let forestSetup = this.createNotifierSetup({[roomIdPath]: this.deathBuilder.roomBuilder.forestRoom.roomId});
            await forestSetup.notifier.onPlayerDeath(forestSetup.event);
            this.assert.deepStrictEqual(forestSetup.client.sentMessages, [untitledTownMessage]);
        });
    }

    async testDeathThatCanNotBeToldSendsNothing()
    {
        await this.test('an alive player, a missing client, config or relocator are not told anything', async () => {
            for(let inState of [GameConst.STATUS.ACTIVE, GameConst.STATUS.DISABLED]){
                let aliveSetup = this.createNotifierSetup({}, {inState});
                this.assert.strictEqual(await aliveSetup.notifier.onPlayerDeath(aliveSetup.event), false);
                this.assert.deepStrictEqual(aliveSetup.client.sentMessages, []);
            }
            let setup = this.createNotifierSetup();
            let notifier = setup.notifier;
            let notToldCases = [
                {notifier, event: Object.assign({}, setup.event, {targetClient: false})},
                {notifier, event: Object.assign({}, setup.event, {targetSchema: false})},
                {notifier: new DeathReviveNotifier({}), event: setup.event},
                {notifier: new DeathReviveNotifier({config: notifier.config}), event: setup.event},
                {
                    notifier: new DeathReviveNotifier({playerDeathRelocator: notifier.playerDeathRelocator}),
                    event: setup.event
                }
            ];
            for(let notToldCase of notToldCases){
                this.assert.strictEqual(await notToldCase.notifier.onPlayerDeath(notToldCase.event), false);
            }
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
        });
    }

    async testResurrectionAdRewardTellsTheRevivePlace()
    {
        await this.test('the resurrection ad reward of a dead player tells the revive where it died', async () => {
            let setup = this.createNotifierSetup({}, {restorationQty: 0});
            await setup.notifier.onPlayerDeath(setup.event);
            setup.playerSchema.inventory.manager.items.restoration_scroll.qty = 1;
            this.assert.strictEqual(await setup.notifier.onAfterGiveAdRewardItem(setup.rewardEvent), true);
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.townMessage, this.itemMessage]);
        });
    }

    async testOtherRewardsAreNotTold()
    {
        await this.test('other ads rewards, missing ads keys or players and alive players are not told', async () => {
            let setup = this.createNotifierSetup({}, {restorationQty: 1});
            let notifier = setup.notifier;
            let rewardEvent = setup.rewardEvent;
            let notToldEvents = [
                Object.assign({}, rewardEvent, {playedAd: this.otherAd}),
                Object.assign({}, rewardEvent, {playedAd: false}),
                Object.assign({}, rewardEvent, {playerSchema: false})
            ];
            for(let notToldEvent of notToldEvents){
                this.assert.strictEqual(await notifier.onAfterGiveAdRewardItem(notToldEvent), false);
            }
            let emptyKeySetup = this.createNotifierSetup({[ActionsConst.DEATH.CONFIG_PATHS.RESURRECTION_ADS_KEY]: ''});
            emptyKeySetup.rewardEvent.playedAd.key = '';
            let emptyKeyResult = await emptyKeySetup.notifier.onAfterGiveAdRewardItem(emptyKeySetup.rewardEvent);
            this.assert.strictEqual(emptyKeyResult, false);
            this.assert.deepStrictEqual(emptyKeySetup.client.sentMessages, []);
            this.assert.strictEqual(await new DeathReviveNotifier({}).onAfterGiveAdRewardItem(rewardEvent), false);
            setup.playerSchema.inState = GameConst.STATUS.ACTIVE;
            this.assert.strictEqual(await notifier.onAfterGiveAdRewardItem(rewardEvent), false);
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
        });
    }

    async testRewardOfPlayerWithoutClientIsNotTold()
    {
        await this.test('the resurrection ad reward of a dead player without room client is not told', async () => {
            let setup = this.createNotifierSetup({}, {restorationQty: 1});
            setup.room.getClientById = () => false;
            this.assert.strictEqual(await setup.notifier.onAfterGiveAdRewardItem(setup.rewardEvent), false);
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
        });
    }

}

module.exports.TestDeathReviveNotifier = TestDeathReviveNotifier;
