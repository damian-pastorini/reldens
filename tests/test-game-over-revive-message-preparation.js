/**
 *
 * Reldens - Test Game Over Revive Message Preparation
 *
 */

const { BaseTest } = require('./base-test');
const { GameOverReviveMessageBuilder } = require('./fixtures/game-over-revive-message-builder');
const { ActionsConst } = require('../lib/actions/constants');
const { GameConst } = require('../lib/game/constants');

class TestGameOverReviveMessagePreparation extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.messageBuilder = new GameOverReviveMessageBuilder();
        this.gameOverMessage = {act: GameConst.GAME_OVER};
        this.townMessage = {
            act: ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE,
            mode: ActionsConst.DEATH.REVIVE_MODES.TOWN,
            townLabel: 'Town',
            resurrectionAdEventKey: 'reldens.resurrectionAd'
        };
        this.fixedSnippets = [
            ActionsConst.SNIPPETS.DEATH_TITLE,
            ActionsConst.SNIPPETS.DEATH_RESTORATION_ITEM_USE_BUTTON,
            ActionsConst.SNIPPETS.DEATH_RESTORATION_ITEM_KEEP_BUTTON,
            ActionsConst.SNIPPETS.DEATH_REVIVE_BUTTON,
            ActionsConst.SNIPPETS.DEATH_RESURRECTION_AD_BUTTON
        ];
    }

    async testAMissingTemplateOrTranslatorRendersNothing()
    {
        await this.test('a missing game over template or translator prepares and renders nothing', async () => {
            let missingSetups = [this.messageBuilder.createSetup(false), this.messageBuilder.createSetup(true, true, false)];
            for(let missingSetup of missingSetups){
                this.assert.strictEqual(missingSetup.isPrepared, false);
                this.assert.strictEqual(missingSetup.reviveMessage.onRoomMessage(this.townMessage), false);
                this.assert.strictEqual(missingSetup.reviveMessage.onRoomMessage(this.gameOverMessage), false);
                this.assert.strictEqual(missingSetup.contentElement.innerHTML, '');
                this.assert.deepStrictEqual(missingSetup.clickHandlers, []);
                this.assert.deepStrictEqual(missingSetup.translatedKeys, []);
            }
            let preparedSetup = this.messageBuilder.createSetup();
            this.assert.strictEqual(preparedSetup.reviveMessage.prepareTemplate(null), false);
        });
    }

    async testAMissingContentElementRendersNothing()
    {
        await this.test('a missing game over content element renders nothing and listens no button', async () => {
            let missingContent = this.messageBuilder.createSetup(true, false);
            this.assert.strictEqual(missingContent.isPrepared, true);
            this.assert.strictEqual(missingContent.reviveMessage.onRoomMessage(this.townMessage), false);
            this.assert.strictEqual(missingContent.reviveMessage.onRoomMessage(this.gameOverMessage), false);
            this.assert.deepStrictEqual(missingContent.clickHandlers, []);
        });
    }

    async testTheFixedSnippetsAreTranslatedOnce()
    {
        await this.test('the fixed snippets are translated once and every message only translates its own', async () => {
            let setup = this.messageBuilder.createSetup();
            this.assert.deepStrictEqual(setup.translatedKeys, this.fixedSnippets);
            setup.reviveMessage.onRoomMessage(this.gameOverMessage);
            setup.reviveMessage.onRoomMessage(this.townMessage);
            setup.reviveMessage.onRoomMessage(Object.assign({}, this.townMessage, {reviveReady: true}));
            let townSnippet = ActionsConst.SNIPPETS.DEATH_PREFIX+ActionsConst.DEATH.REVIVE_MODES.TOWN;
            this.assert.deepStrictEqual(setup.translatedKeys, [
                ...this.fixedSnippets,
                ActionsConst.SNIPPETS.DEATH_WAIT,
                ActionsConst.SNIPPETS.DEATH_WAIT,
                townSnippet,
                ActionsConst.SNIPPETS.DEATH_REVIVE_READY,
                townSnippet
            ]);
            let elementsTexts = this.messageBuilder.readElementsTexts(setup);
            this.assert.strictEqual(elementsTexts['game-over-title'], this.messageBuilder.deathSnippets.title);
            this.assert.strictEqual(elementsTexts['game-over-wait'], this.messageBuilder.deathSnippets.reviveReady);
        });
    }

}

module.exports.TestGameOverReviveMessagePreparation = TestGameOverReviveMessagePreparation;
