/**
 *
 * Reldens - Test Inventory Item Use Target
 *
 * Tests the item use target: the server uses the item with the player that sent the use message as its target (the
 * items server broadcasts that target sessionId with the executing item) and answers false for a failed use, a
 * missing or a not usable item, and the client plays an item animation that
 * starts on the target on the sprite of the broadcast target sessionId, and on its own player when the item does not
 * start on the target or the message carries no target.
 *
 */

const { BaseTest } = require('./base-test');
const { InventoryMessageActions } = require('../lib/inventory/server/message-actions');
const { InventoryReceiver } = require('../lib/inventory/client/inventory-receiver');
const { InventoryConst } = require('../lib/inventory/constants');

class TestInventoryItemUseTarget extends BaseTest
{

    async testTheUsedItemTargetsThePlayerThatUsedIt()
    {
        await this.test('the used item gets the player that sent the use message as its target', async () => {
            let useTargets = [];
            let playerSchema = {
                player_id: 1,
                isDeath: () => false,
                isDisabled: () => false,
                inventory: {manager: {items: {potion: {use: async (target) => useTargets.push(target)}}}}
            };
            let data = {act: InventoryConst.ACTIONS.USE, 'idx': 'potion'};
            let result = await new InventoryMessageActions(false).executeMessageActions({}, data, {}, playerSchema);
            this.assert.deepStrictEqual([result, useTargets], [true, [playerSchema]]);
        });
    }

    async testAFailedItemUseIsAnsweredFalse()
    {
        await this.test('an item use that fails, a missing or a not usable item is answered false and never rejects', async () => {
            let items = {potion: {use: () => Promise.reject({message: 'Storage.'})}, stone: {}};
            let playerSchema = {player_id: 1, isDeath: () => false, isDisabled: () => false, inventory: {manager: {items}}};
            let results = [];
            for(let itemKey of ['potion', 'stone', 'missing']){
                results.push(await new InventoryMessageActions(false).executeMessageActions(
                    {},
                    {act: InventoryConst.ACTIONS.USE, 'idx': itemKey},
                    {},
                    playerSchema
                ));
            }
            this.assert.deepStrictEqual(results, [false, false, false]);
        });
    }

    async testTheAnimationStartsOnTheBroadcastTargetSession()
    {
        await this.test('the animation that starts on the target uses the broadcast target sessionId', async () => {
            let extractTargetId = InventoryReceiver.prototype.extractTargetId;
            let currentScene = {player: {playerId: 'own-session'}};
            let onTargetItem = {animationData: {startsOnTarget: true}};
            let onOwnerItem = {animationData: {}};
            this.assert.deepStrictEqual(
                [
                    extractTargetId(onTargetItem, {target: {sessionId: 'user-session'}}, currentScene),
                    extractTargetId(onTargetItem, {target: {}}, currentScene),
                    extractTargetId(onOwnerItem, {target: {sessionId: 'user-session'}}, currentScene),
                    extractTargetId(onTargetItem, {target: {}}, {})
                ],
                ['user-session', 'own-session', 'own-session', false]
            );
        });
    }

}

module.exports.TestInventoryItemUseTarget = TestInventoryItemUseTarget;
