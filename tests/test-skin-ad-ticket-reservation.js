/**
 *
 * Reldens - Test Skin Ad Ticket Reservation
 *
 */

const { BaseTest } = require('./base-test');
const { SkinAdTicketGateBuilder } = require('./fixtures/skin-ad-ticket-gate-builder');
const { UsersConst } = require('../lib/users/constants');
const { GameConst } = require('../lib/game/constants');

class TestSkinAdTicketReservation extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.reservedKey = UsersConst.SKINS.PRIVATE_DATA.TICKET_RESERVED;
    }

    async testTicketIsMarkedReservedBeforeItsRemovalAndUntilTheAdEnd()
    {
        await this.test('the ticket is marked reserved before its removal starts and until the ad end', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let rewardEvent = SkinAdTicketGateBuilder.createRewardEvent('skin-ad-ticket', 2);
            let playerSchema = rewardEvent.playerSchema;
            let fixtureDecrease = playerSchema.inventory.manager.decreaseItemQty;
            let reservedOnRemoval = [];
            playerSchema.inventory.manager.decreaseItemQty = async (inventoryId, qty) => {
                reservedOnRemoval.push(Boolean(playerSchema.getPrivate(this.reservedKey)));
                return await fixtureDecrease(inventoryId, qty);
            };
            this.assert.strictEqual(await gate.onBeforeGiveAdRewardItem(rewardEvent), true);
            this.assert.deepStrictEqual(reservedOnRemoval, [true]);
            this.assert.strictEqual(Boolean(playerSchema.getPrivate(this.reservedKey)), true);
            await gate.onAfterAdEnded(SkinAdTicketGateBuilder.createAdEndedEvent(rewardEvent, {id: 1}));
            this.assert.strictEqual(Boolean(playerSchema.getPrivate(this.reservedKey)), false);
        });
    }

    async testRefusedOrRejectedRemovalClearsTheReservedMark()
    {
        await this.test('a refused or rejected ticket removal clears the reserved mark and cancels the reward', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            for(let decreaseItemQty of [async () => false, async () => Promise.reject({message: 'Storage.'})]){
                let rewardEvent = SkinAdTicketGateBuilder.createRewardEvent('skin-ad-ticket', 1);
                rewardEvent.playerSchema.inventory.manager.decreaseItemQty = decreaseItemQty;
                this.assert.strictEqual(await gate.onBeforeGiveAdRewardItem(rewardEvent), false);
                this.assert.strictEqual(rewardEvent.continueEvent, false);
                this.assert.strictEqual(Boolean(rewardEvent.playerSchema.getPrivate(this.reservedKey)), false);
                let acceptEvent = SkinAdTicketGateBuilder.createTradeAcceptEvent(false, false, '1');
                acceptEvent.playerSchema = rewardEvent.playerSchema;
                this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(acceptEvent), false);
                this.assert.strictEqual(acceptEvent.canContinue, true);
            }
        });
    }

    async testTradeAcceptIsRefusedWhileATicketIsReserved()
    {
        await this.test('a trade accept is refused while the sender or the trade partner has a reserved ticket', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            for(let reservedCase of [[true, false], [false, true], [true, true]]){
                let event = SkinAdTicketGateBuilder.createTradeAcceptEvent(...reservedCase, '1');
                this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(event), true);
                this.assert.strictEqual(event.canContinue, false);
            }
            let notReservedEvent = SkinAdTicketGateBuilder.createTradeAcceptEvent(false, false, '1');
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(notReservedEvent), false);
            this.assert.strictEqual(notReservedEvent.canContinue, true);
        });
    }

    async testTradeAcceptToAPlayerNotInTheRoomChecksOnlyTheSender()
    {
        await this.test('a trade accept for a partner that is not in the room checks only the sender', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let reservedEvent = SkinAdTicketGateBuilder.createTradeAcceptEvent(true, false, '1');
            reservedEvent.messageData.id = 'missing-session';
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(reservedEvent), true);
            this.assert.strictEqual(reservedEvent.canContinue, false);
            let notReservedEvent = SkinAdTicketGateBuilder.createTradeAcceptEvent(false, true, '1');
            notReservedEvent.messageData.id = 'missing-session';
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(notReservedEvent), false);
            this.assert.strictEqual(notReservedEvent.canContinue, true);
        });
    }

    async testTradeDeclineIsNeverRefused()
    {
        await this.test('a trade decline is not refused even with a reserved ticket on both players', async () => {
            let event = SkinAdTicketGateBuilder.createTradeAcceptEvent(true, true, '2');
            this.assert.strictEqual(await SkinAdTicketGateBuilder.createGate().onBeforeSceneExecuteMessages(event), false);
            this.assert.strictEqual(event.canContinue, true);
        });
    }

    async testNpcOptionIsRefusedWhileTheTicketIsReserved()
    {
        await this.test('an NPC option is refused only while the sender has a reserved ticket', async () => {
            let gate = SkinAdTicketGateBuilder.createGate();
            let reservedEvent = SkinAdTicketGateBuilder.createEvent({act: GameConst.BUTTON_OPTION, id: 10, value: 'buy'}, 1);
            reservedEvent.playerSchema.setPrivate(this.reservedKey, true);
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(reservedEvent), true);
            this.assert.strictEqual(reservedEvent.canContinue, false);
            let notReservedEvent = SkinAdTicketGateBuilder.createEvent(
                {act: GameConst.BUTTON_OPTION, id: 10, value: 'buy'},
                1
            );
            this.assert.strictEqual(await gate.onBeforeSceneExecuteMessages(notReservedEvent), false);
            this.assert.strictEqual(notReservedEvent.canContinue, true);
            this.assert.deepStrictEqual(notReservedEvent.client.sentMessages, []);
        });
    }

}

module.exports.TestSkinAdTicketReservation = TestSkinAdTicketReservation;
