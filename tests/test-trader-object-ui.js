/**
 *
 * Reldens - Test Trader Object Ui
 *
 * Tests the trader dialog content for a confirm result: a successful buy or sell confirm shows its confirmed text and
 * ends the trade in progress, while a failed confirm (the server keeps the transaction open) never shows the confirmed
 * text and keeps the trade in progress.
 *
 */

const { BaseTest } = require('./base-test');
const { LoginFormStubsBuilder } = require('./fixtures/login-form-stubs-builder');
const { TraderObjectUi } = require('../lib/objects/client/trader-object-ui');
const { ObjectsConst } = require('../lib/objects/constants');
const ObjectsSnippets = require('../lib/objects/client/snippets/en_US');
const { sc } = require('@reldens/utils');

class TestTraderObjectUi extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.traderId = 10;
        this.tradeContent = 'trade items';
        this.tradeInProgress = 'trade-in-progress';
    }

    updateConfirmContents(tradeAction, subActionResult)
    {
        let container = LoginFormStubsBuilder.createElement({innerHTML: this.tradeContent});
        let box = LoginFormStubsBuilder.createElement({classes: [this.tradeInProgress]});
        let elements = {['#box-'+this.traderId+' .box-content']: container, ['#box-'+this.traderId]: box};
        let traderSnippets = ObjectsSnippets.objects.trader;
        let translator = {t: (snippetKey) => sc.get(traderSnippets, snippetKey.split('.').pop(), snippetKey)};
        new TraderObjectUi({
            roomEvents: {
                objectsUi: {[this.traderId]: {id: this.traderId}},
                gameManager: {gameDom: {getElement: (selector) => sc.get(elements, selector, null)}, services: {translator}}
            },
            message: {
                id: this.traderId,
                result: {
                    action: tradeAction,
                    subAction: ObjectsConst.TRADE_ACTIONS_FUNCTION_NAME.CONFIRM,
                    subActionResult,
                    lastErrorMessage: 'exchange.failedConfirm',
                    items: false,
                    exchangeData: false
                }
            }
        }).updateContents();
        return [container.innerHTML, box.classList.contains(this.tradeInProgress)];
    }

    async testSuccessfulConfirmShowsTheConfirmedText()
    {
        await this.test('a successful buy or sell confirm shows its confirmed text and ends the trade', async () => {
            this.assert.deepStrictEqual(
                [this.updateConfirmContents('buy', true), this.updateConfirmContents('sell', true)],
                [
                    [ObjectsSnippets.objects.trader.buyConfirmed, false],
                    [ObjectsSnippets.objects.trader.sellConfirmed, false]
                ]
            );
        });
    }

    async testFailedConfirmKeepsTheTradeInProgress()
    {
        await this.test('a failed confirm never shows the confirmed text and keeps the trade in progress', async () => {
            this.assert.deepStrictEqual(
                [this.updateConfirmContents('buy', false), this.updateConfirmContents('sell', false)],
                [[this.tradeContent, true], [this.tradeContent, true]]
            );
        });
    }

}

module.exports.TestTraderObjectUi = TestTraderObjectUi;
