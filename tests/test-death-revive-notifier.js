/**
 *
 * Reldens - Test Death Revive Notifier
 *
 * Tests the revive message a dead player is told (in place, with the restoration item, the question to use it, or in
 * the town room) and the resurrection ad the town revive offers through the "reldens.deathTownReviveData" event, answered
 * by the ads ResurrectionAdGate (an enabled ad of the configured key, not closed in this death, in a room that allows
 * the ad messages); the ad reward (the gate "onAfterGiveAdRewardItem") sets the choice to use the restoration item and
 * tells the revive again through "reldens.deathReviveNotify" when the player client is in the room.
 *
 */

const { BaseTest } = require('./base-test');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { ActionsConst } = require('../lib/actions/constants');
const { AdsConst } = require('../lib/ads/constants');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestDeathReviveNotifier extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.deathBuilder = new DeathRelocationBuilder();
        this.resurrectionAd = this.deathBuilder.resurrectionAd;
        this.otherAd = this.deathBuilder.otherAd;
        this.inPlaceMessage = this.deathBuilder.inPlaceMessage;
        this.itemMessage = this.deathBuilder.itemMessage;
        this.townMessage = this.deathBuilder.townMessage;
    }

    async testDisabledTeleportTellsTheRevivePlace()
    {
        await this.test('the disabled death teleport tells the player it revives where it died', async () => {
            let setup = await this.deathBuilder.createNotifierSetup(
                {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false},
                {restorationQty: 1}
            );
            this.assert.strictEqual(await setup.notify(), true);
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.inPlaceMessage]);
            this.assert.strictEqual(setup.playerSchema.inventory.manager.items.restoration_scroll.qty, 1);
        });
    }

    async testRestorationItemTellsTheRevivePlace()
    {
        await this.test('a carried restoration item tells the revive where it died with the item label', async () => {
            for(let restorationQty of [1, 3]){
                let setup = await this.deathBuilder.createNotifierSetup({}, {restorationQty});
                this.assert.strictEqual(await setup.notify(), true);
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
            let disabledAd = Object.assign({}, this.resurrectionAd, {enabled: 0});
            let disabledProviderAd = Object.assign({}, this.resurrectionAd, {provider: {enabled: 0}});
            let customEventAd = Object.assign({}, this.resurrectionAd, {eventKey: 'custom.resurrectionEvent'});
            let bannerAd = Object.assign({}, this.resurrectionAd);
            delete bannerAd.eventKey;
            let adCases = [
                {gateOptions: {}, eventKey: this.resurrectionAd.eventKey},
                {gateOptions: {adsCollection: {[customEventAd.id]: customEventAd}}, eventKey: customEventAd.eventKey},
                {gateOptions: {adsCollection: {[bannerAd.id]: bannerAd}}, eventKey: ''},
                {gateOptions: {adsCollection: {[disabledAd.id]: disabledAd}}, eventKey: ''},
                {gateOptions: {adsCollection: {[disabledAd.id]: disabledProviderAd}}, eventKey: ''},
                {gateOptions: {adsCollection: {}}, eventKey: ''},
                {gateOptions: {resurrectionAdsKey: ''}, eventKey: ''},
                {gateOptions: {resurrectionAdsKey: 'missing-video'}, eventKey: ''}
            ];
            for(let adCase of adCases){
                let setup = await this.deathBuilder.createNotifierSetup(
                    {},
                    Object.assign({restorationQty: 0}, adCase.gateOptions)
                );
                this.assert.strictEqual(await setup.notify(), true);
                this.assert.deepStrictEqual(
                    setup.client.sentMessages,
                    [Object.assign({}, this.townMessage, {resurrectionAdEventKey: adCase.eventKey})]
                );
            }
        });
    }

    async testFailedOrEndedRequestedAdIsNotOfferedAgain()
    {
        await this.test('the resurrection ad requested in the death is offered while it plays, not once it failed or ended', async () => {
            let adCases = [
                {isClosed: false, message: this.townMessage},
                {isClosed: true, message: this.deathBuilder.townMessageWithoutAd}
            ];
            for(let adCase of adCases){
                let setup = await this.deathBuilder.createNotifierSetup({}, {restorationQty: 0});
                setup.playerSchema.setPrivate(AdsConst.PRIVATE_DATA.RESURRECTION_AD, {
                    deathEvent: setup.playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.PLAYER_DEATH_EVENT),
                    isRequested: true,
                    isClosed: adCase.isClosed
                });
                this.assert.strictEqual(await setup.notify(), true);
                this.assert.deepStrictEqual(setup.client.sentMessages, [adCase.message]);
            }
        });
    }

    async testRoomRefusingTheAdMessagesDoesNotOfferTheResurrectionAd()
    {
        await this.test('the resurrection ad is not offered in a room that refuses the ad start or end messages', async () => {
            let withoutAd = this.deathBuilder.townMessageWithoutAd;
            let roomCases = [
                {roomCustomData: {disallowedActions: [GameConst.BUTTON_OPTION]}, message: this.townMessage},
                {roomCustomData: {allActionsDisabled: true}, message: withoutAd},
                {roomCustomData: {disallowedActions: [AdsConst.ACTIONS.AD_STARTED]}, message: withoutAd},
                {roomCustomData: {disallowedActions: [AdsConst.ACTIONS.AD_ENDED]}, message: withoutAd}
            ];
            for(let roomCase of roomCases){
                let setup = await this.deathBuilder.createNotifierSetup(
                    {},
                    {restorationQty: 0, roomCustomData: roomCase.roomCustomData}
                );
                this.assert.strictEqual(await setup.notify(), true);
                this.assert.deepStrictEqual(
                    setup.client.sentMessages,
                    [roomCase.message],
                    'Room custom data: '+sc.toJsonString(roomCase.roomCustomData)
                );
            }
        });
    }

    async testPlayerWithoutInventoryIsToldTheTownRevive()
    {
        await this.test('a player without inventory is told the town revive', async () => {
            let setup = await this.deathBuilder.createNotifierSetup({}, {restorationQty: 1});
            setup.playerSchema.inventory = false;
            await setup.notify();
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.townMessage]);
        });
    }

    async testUnknownTownRoomIsToldWithoutTitle()
    {
        await this.test('an unknown town room tells the revive in place, a town without title is told without it', async () => {
            let roomIdPath = ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ROOM_ID;
            let roomIdCases = [
                {townRoomId: 999, message: this.inPlaceMessage},
                {
                    townRoomId: this.deathBuilder.roomBuilder.forestRoom.roomId,
                    message: Object.assign({}, this.townMessage, {townLabel: ''})
                }
            ];
            for(let roomIdCase of roomIdCases){
                let setup = await this.deathBuilder.createNotifierSetup({[roomIdPath]: roomIdCase.townRoomId});
                await setup.notify();
                this.assert.deepStrictEqual(setup.client.sentMessages, [roomIdCase.message]);
            }
        });
    }

    async testDeathThatCanNotBeToldSendsNothing()
    {
        await this.test('an alive player, a missing client or a missing player are not told anything', async () => {
            for(let inState of [GameConst.STATUS.ACTIVE, GameConst.STATUS.DISABLED]){
                let aliveSetup = await this.deathBuilder.createNotifierSetup({}, {inState});
                this.assert.strictEqual(await aliveSetup.notify(), false);
                this.assert.deepStrictEqual(aliveSetup.client.sentMessages, []);
            }
            let setup = await this.deathBuilder.createNotifierSetup();
            let notifier = setup.notifier;
            let playerSchema = setup.playerSchema;
            let notToldCases = [
                {client: false, playerSchema},
                {client: setup.client, playerSchema: false},
                {client: setup.client, playerSchema: null}
            ];
            for(let notToldCase of notToldCases){
                this.assert.strictEqual(notifier.notifyClient(notToldCase.client, notToldCase.playerSchema), false);
            }
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
        });
    }

    async testResurrectionAdRewardTellsTheRevivePlace()
    {
        await this.test('the resurrection ad reward of a dead player tells the revive where it died', async () => {
            let setup = await this.deathBuilder.createNotifierSetup({}, {restorationQty: 0});
            await setup.notify();
            setup.playerSchema.inventory.manager.items.restoration_scroll.qty = 1;
            this.assert.strictEqual(setup.gate.onAfterGiveAdRewardItem(setup.rewardEvent), true);
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.townMessage, this.itemMessage]);
        });
    }

    async testOtherRewardsAreNotTold()
    {
        await this.test('other ads rewards, missing ads keys or players and alive players are not told', async () => {
            let setup = await this.deathBuilder.createNotifierSetup({}, {restorationQty: 1});
            let gate = setup.gate;
            let rewardEvent = setup.rewardEvent;
            let notToldEvents = [
                Object.assign({}, rewardEvent, {playedAd: this.otherAd}),
                Object.assign({}, rewardEvent, {playedAd: false}),
                Object.assign({}, rewardEvent, {playerSchema: false}),
                null,
                {}
            ];
            for(let notToldEvent of notToldEvents){
                this.assert.strictEqual(gate.onAfterGiveAdRewardItem(notToldEvent), false);
            }
            let emptyKeySetup = await this.deathBuilder.createNotifierSetup({}, {resurrectionAdsKey: ''});
            emptyKeySetup.rewardEvent.playedAd.key = '';
            this.assert.strictEqual(emptyKeySetup.gate.onAfterGiveAdRewardItem(emptyKeySetup.rewardEvent), false);
            this.assert.deepStrictEqual(emptyKeySetup.client.sentMessages, []);
            setup.playerSchema.inState = GameConst.STATUS.ACTIVE;
            this.assert.strictEqual(gate.onAfterGiveAdRewardItem(rewardEvent), false);
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
            let choicePath = ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE;
            this.assert.strictEqual(setup.playerSchema.getPrivate(choicePath), null);
            this.assert.strictEqual(emptyKeySetup.playerSchema.getPrivate(choicePath), null);
        });
    }

    async testRestorationItemQuestionFollowsTheChoice()
    {
        await this.test('without the auto consume the restoration item is asked until the player chooses', async () => {
            let askMessage = Object.assign({}, this.itemMessage, {
                mode: ActionsConst.DEATH.REVIVE_MODES.ASK_RESTORATION_ITEM,
                townLabel: this.townMessage.townLabel
            });
            let choiceCases = [
                {choice: '', message: askMessage},
                {choice: ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE, message: this.itemMessage},
                {choice: ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.KEEP, message: this.deathBuilder.townMessageWithoutAd}
            ];
            let choicePath = ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE;
            for(let choiceCase of choiceCases){
                let setup = await this.deathBuilder.createNotifierSetup(
                    this.deathBuilder.askedRestorationItemConfig,
                    {restorationQty: 1}
                );
                setup.playerSchema.setPrivate(choicePath, choiceCase.choice);
                this.assert.strictEqual(await setup.notify(), true);
                this.assert.deepStrictEqual(setup.client.sentMessages, [choiceCase.message]);
                this.assert.deepStrictEqual(setup.playerSchema.inventory.manager.decreasedItems, []);
            }
        });
    }

    async testDisabledAutoReviveTellsTheWaitOrTheReadyRevive()
    {
        await this.test('the disabled auto revive tells the seconds left or that it can be asked', async () => {
            let reviveAtPath = ActionsConst.DEATH.PRIVATE_DATA.REVIVE_AT;
            let townWaitMessage = Object.assign({}, this.townMessage);
            let reviveCases = [
                {teleport: false, reviveAt: Date.now() + 10000, message: this.inPlaceMessage, wait: 10},
                {teleport: true, reviveAt: Date.now() + 10000, message: townWaitMessage, wait: 10},
                {teleport: true, reviveAt: Date.now() - 5000, message: townWaitMessage, wait: 1},
                {teleport: true, reviveAt: null, message: townWaitMessage, wait: 1}
            ];
            for(let reviveCase of reviveCases){
                let setup = await this.deathBuilder.createNotifierSetup({
                    [ActionsConst.DEATH.CONFIG_PATHS.AUTO_REVIVE]: false,
                    [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: reviveCase.teleport
                });
                setup.playerSchema.setPrivate(reviveAtPath, reviveCase.reviveAt);
                await setup.notify();
                this.assert.deepStrictEqual(
                    setup.client.sentMessages,
                    [Object.assign({}, reviveCase.message, {reviveWaitSeconds: reviveCase.wait})]
                );
            }
            let readySetup = await this.deathBuilder.createNotifierSetup(this.deathBuilder.manualReviveConfig);
            readySetup.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY, true);
            await readySetup.notify();
            this.assert.deepStrictEqual(
                readySetup.client.sentMessages,
                [Object.assign({}, this.townMessage, {reviveReady: true})]
            );
            let autoReviveSetup = await this.deathBuilder.createNotifierSetup();
            autoReviveSetup.playerSchema.setPrivate(ActionsConst.DEATH.PRIVATE_DATA.REVIVE_READY, true);
            await autoReviveSetup.notify();
            this.assert.deepStrictEqual(autoReviveSetup.client.sentMessages, [this.townMessage]);
        });
    }

    async testResurrectionAdRewardIsTheChoiceToUseTheItem()
    {
        await this.test('the resurrection ad reward is the choice to use the restoration item it gives', async () => {
            let setup = await this.deathBuilder.createNotifierSetup(
                this.deathBuilder.askedRestorationItemConfig,
                {restorationQty: 0}
            );
            await setup.notify();
            setup.playerSchema.inventory.manager.items.restoration_scroll.qty = 1;
            this.assert.strictEqual(setup.gate.onAfterGiveAdRewardItem(setup.rewardEvent), true);
            this.assert.deepStrictEqual(setup.client.sentMessages, [this.townMessage, this.itemMessage]);
            this.assert.strictEqual(
                setup.playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE),
                ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE
            );
        });
    }

    async testRewardOfPlayerWithoutClientIsNotTold()
    {
        await this.test('the resurrection ad reward of a dead player without room client keeps the choice and tells nothing', async () => {
            let setup = await this.deathBuilder.createNotifierSetup({}, {restorationQty: 1});
            setup.room.getClientById = () => false;
            this.assert.strictEqual(setup.gate.onAfterGiveAdRewardItem(setup.rewardEvent), true);
            this.assert.deepStrictEqual(setup.client.sentMessages, []);
            this.assert.strictEqual(
                setup.playerSchema.getPrivate(ActionsConst.DEATH.PRIVATE_DATA.RESTORATION_ITEM_CHOICE),
                ActionsConst.DEATH.RESTORATION_ITEM_CHOICES.USE
            );
        });
    }

}

module.exports.TestDeathReviveNotifier = TestDeathReviveNotifier;
