/**
 *
 * Reldens - Test Rewards Message Handler
 *
 */

const { BaseTest } = require('./base-test');
const { MessageHandler } = require('../lib/rewards/client/message-handler');
const { RewardsConst } = require('../lib/rewards/constants');

class TestRewardsMessageHandler extends BaseTest
{

    createMessageHandler()
    {
        return new MessageHandler({
            roomEvents: {gameManager: {config: {getWithoutLogs: (path, defaultValue) => defaultValue}}},
            message: {}
        });
    }

    createRewardItem(label, quantity)
    {
        return {
            [RewardsConst.MESSAGE.DATA.ITEM_LABEL]: label,
            [RewardsConst.MESSAGE.DATA.ITEM_QUANTITY]: quantity
        };
    }

    async testEveryItemShowsItsOwnLabelAndQuantity()
    {
        await this.test('every reward item shows its own label and quantity', async () => {
            let itemsText = this.createMessageHandler().mapItemsText({
                [RewardsConst.MESSAGE.DATA.ITEMS_DATA]: [
                    this.createRewardItem('Coins', 10),
                    this.createRewardItem('Spear', 1)
                ]
            });
            this.assert.strictEqual(itemsText, '<br/>Coins (10)<br/>Spear (1)');
        });
    }

    async testARewardWithoutItemsAddsNoText()
    {
        await this.test('a reward without items adds no items text', async () => {
            this.assert.strictEqual(this.createMessageHandler().mapItemsText({}), '');
        });
    }

}

module.exports.TestRewardsMessageHandler = TestRewardsMessageHandler;
