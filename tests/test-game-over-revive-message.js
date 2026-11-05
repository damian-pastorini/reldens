/**
 *
 * Reldens - Test Game Over Revive Message
 *
 */

const { BaseTest } = require('./base-test');
const { GameOverReviveMessageBuilder } = require('./fixtures/game-over-revive-message-builder');
const { ActionsConst } = require('../lib/actions/constants');
const { GameConst } = require('../lib/game/constants');

class TestGameOverReviveMessage extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.messageBuilder = new GameOverReviveMessageBuilder();
        this.deathSnippets = this.messageBuilder.deathSnippets;
        this.selectors = this.messageBuilder.selectors;
        this.itemLabel = 'Restoration Scroll';
        this.townLabel = 'Town';
        this.reviveAction = ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE;
        this.gameOverMessage = {act: GameConst.GAME_OVER};
        this.townMessage = {
            act: this.reviveAction,
            mode: ActionsConst.DEATH.REVIVE_MODES.TOWN,
            townLabel: this.townLabel,
            resurrectionAdEventKey: 'reldens.resurrectionAd'
        };
        this.townReviveMessage = this.deathSnippets.reviveInTown.replace('%townLabel', this.townLabel);
        this.adButtonOnly = [this.selectors.RESURRECTION_AD_BUTTON];
        this.townModeMessage = {act: this.reviveAction, mode: ActionsConst.DEATH.REVIVE_MODES.TOWN};
    }

    async clickButton(setup, buttonSelector)
    {
        let clickHandler = setup.clickHandlers.find(handler => buttonSelector === handler.selector);
        this.assert.strictEqual(clickHandler.eventName, 'click');
        await clickHandler.handler();
    }

    expectRenderedReviveMessage(setup, waitMessage, reviveMessage)
    {
        let elementsTexts = this.messageBuilder.readElementsTexts(setup);
        this.assert.strictEqual(elementsTexts['game-over-title'], this.deathSnippets.title);
        this.assert.strictEqual(elementsTexts['game-over-wait'], waitMessage);
        this.assert.strictEqual(elementsTexts['game-over-revive-message'], reviveMessage);
        return elementsTexts;
    }

    async testTheGameOverShowsNoButtonBeforeTheReviveMode()
    {
        await this.test('the game over shows the title and wait text without any button', async () => {
            let setup = this.messageBuilder.createSetup();
            this.assert.strictEqual(setup.reviveMessage.onRoomMessage(this.gameOverMessage), true);
            this.expectRenderedReviveMessage(setup, this.deathSnippets.wait, '');
            this.assert.deepStrictEqual(this.messageBuilder.shownButtons(setup), []);
            this.assert.deepStrictEqual(setup.clickHandlers, []);
        });
    }

    async testTheTownReviveOffersTheResurrectionAdButton()
    {
        await this.test('the town revive ad button fires the sent ad event on every click', async () => {
            let setup = this.messageBuilder.createSetup();
            setup.reviveMessage.onRoomMessage(this.gameOverMessage);
            this.assert.strictEqual(setup.reviveMessage.onRoomMessage(this.townMessage), true);
            let elementsTexts = this.expectRenderedReviveMessage(
                setup,
                this.deathSnippets.wait,
                this.townReviveMessage
            );
            this.assert.strictEqual(
                elementsTexts['game-over-resurrection-ad'],
                this.deathSnippets.resurrectionAdButton
            );
            this.assert.deepStrictEqual(this.messageBuilder.shownButtons(setup), this.adButtonOnly);
            this.assert.strictEqual(setup.clickHandlers.length, 1);
            await this.clickButton(setup, this.selectors.RESURRECTION_AD_BUTTON);
            await this.clickButton(setup, this.selectors.RESURRECTION_AD_BUTTON);
            let expectedEvent = {eventKey: this.townMessage.resurrectionAdEventKey, eventData: {}};
            this.assert.deepStrictEqual(setup.emittedEvents, [expectedEvent, expectedEvent]);
            this.assert.deepStrictEqual(setup.sentRequests, []);
        });
    }

    async testTheReviveModesWithoutAdShowNoButton()
    {
        await this.test('the revive modes without an ad event key show their message and no button', async () => {
            let reviveCases = [
                {
                    message: {act: this.reviveAction, mode: ActionsConst.DEATH.REVIVE_MODES.IN_PLACE},
                    reviveMessage: this.deathSnippets.reviveInPlace
                },
                {
                    message: {
                        act: this.reviveAction,
                        mode: ActionsConst.DEATH.REVIVE_MODES.RESTORATION_ITEM,
                        itemLabel: this.itemLabel
                    },
                    reviveMessage: this.deathSnippets.reviveWithRestorationItem.replace('%itemLabel', this.itemLabel)
                },
                {
                    message: Object.assign({}, this.townMessage, {resurrectionAdEventKey: ''}),
                    reviveMessage: this.townReviveMessage
                },
                {
                    message: Object.assign({townLabel: this.townLabel}, this.townModeMessage),
                    reviveMessage: this.townReviveMessage
                }
            ];
            for(let reviveCase of reviveCases){
                let setup = this.messageBuilder.createSetup();
                this.assert.strictEqual(setup.reviveMessage.onRoomMessage(reviveCase.message), true);
                this.expectRenderedReviveMessage(setup, this.deathSnippets.wait, reviveCase.reviveMessage);
                this.assert.deepStrictEqual(this.messageBuilder.shownButtons(setup), []);
                this.assert.deepStrictEqual(setup.clickHandlers, []);
            }
        });
    }

    async testTheRestorationItemQuestionSendsTheChoice()
    {
        await this.test('the restoration item question shows yes and no buttons that send the choice', async () => {
            let askMessage = {
                act: this.reviveAction,
                mode: ActionsConst.DEATH.REVIVE_MODES.ASK_RESTORATION_ITEM,
                itemLabel: this.itemLabel,
                townLabel: this.townLabel
            };
            let setup = this.messageBuilder.createSetup();
            this.assert.strictEqual(setup.reviveMessage.onRoomMessage(askMessage), true);
            let elementsTexts = this.expectRenderedReviveMessage(
                setup,
                this.deathSnippets.wait,
                this.deathSnippets.askRestorationItem.replace('%itemLabel', this.itemLabel)
                    .replace('%townLabel', this.townLabel)
            );
            this.assert.strictEqual(
                elementsTexts['game-over-restoration-item-use'],
                this.deathSnippets.restorationItemUseButton
            );
            this.assert.strictEqual(
                elementsTexts['game-over-restoration-item-keep'],
                this.deathSnippets.restorationItemKeepButton
            );
            this.assert.deepStrictEqual(
                this.messageBuilder.shownButtons(setup),
                [this.selectors.RESTORATION_ITEM_USE_BUTTON, this.selectors.RESTORATION_ITEM_KEEP_BUTTON]
            );
            await this.clickButton(setup, this.selectors.RESTORATION_ITEM_USE_BUTTON);
            await this.clickButton(setup, this.selectors.RESTORATION_ITEM_KEEP_BUTTON);
            let choiceAction = ActionsConst.DEATH.ACTIONS.RESTORATION_ITEM_CHOICE;
            this.assert.deepStrictEqual(
                setup.sentRequests,
                [{act: choiceAction, use: true}, {act: choiceAction, use: false}]
            );
            this.assert.deepStrictEqual(setup.emittedEvents, []);
        });
    }

    async testTheReviveWaitShowsTheSecondsLeft()
    {
        await this.test('the disabled auto revive shows the seconds left and no revive button', async () => {
            let setup = this.messageBuilder.createSetup();
            this.assert.strictEqual(
                setup.reviveMessage.onRoomMessage(Object.assign({}, this.townMessage, {reviveWaitSeconds: 7})),
                true
            );
            this.expectRenderedReviveMessage(
                setup,
                this.deathSnippets.reviveWait.replace('%seconds', '7'),
                this.townReviveMessage
            );
            this.assert.deepStrictEqual(this.messageBuilder.shownButtons(setup), this.adButtonOnly);
        });
    }

    async testTheReadyReviveButtonSendsTheReviveRequest()
    {
        await this.test('the ready revive shows the revive button that sends the revive request', async () => {
            let readyMessage = {
                act: this.reviveAction,
                mode: ActionsConst.DEATH.REVIVE_MODES.IN_PLACE,
                reviveReady: true
            };
            let setup = this.messageBuilder.createSetup();
            this.assert.strictEqual(setup.reviveMessage.onRoomMessage(readyMessage), true);
            let elementsTexts = this.expectRenderedReviveMessage(
                setup,
                this.deathSnippets.reviveReady,
                this.deathSnippets.reviveInPlace
            );
            this.assert.strictEqual(elementsTexts['game-over-revive'], this.deathSnippets.reviveButton);
            this.assert.deepStrictEqual(this.messageBuilder.shownButtons(setup), [this.selectors.REVIVE_BUTTON]);
            await this.clickButton(setup, this.selectors.REVIVE_BUTTON);
            this.assert.deepStrictEqual(setup.sentRequests, [{act: ActionsConst.DEATH.ACTIONS.REVIVE_REQUEST}]);
        });
    }

    async testInvalidReviveTimeValuesShowTheDefaultWait()
    {
        await this.test('the revive ready and wait values that are not valid show the default wait', async () => {
            let invalidValues = [
                {reviveReady: 'true'},
                {reviveReady: 1},
                {reviveWaitSeconds: 0},
                {reviveWaitSeconds: -3},
                {reviveWaitSeconds: 'soon'}
            ];
            for(let invalidValue of invalidValues){
                let setup = this.messageBuilder.createSetup();
                setup.reviveMessage.onRoomMessage(Object.assign({}, this.townMessage, invalidValue));
                this.expectRenderedReviveMessage(setup, this.deathSnippets.wait, this.townReviveMessage);
                this.assert.deepStrictEqual(this.messageBuilder.shownButtons(setup), this.adButtonOnly);
            }
        });
    }

    async testTheNextGameOverRemovesThePreviousButtons()
    {
        await this.test('the next game over removes the previous revive buttons', async () => {
            let setup = this.messageBuilder.createSetup();
            setup.reviveMessage.onRoomMessage(Object.assign({}, this.townMessage, {reviveReady: true}));
            this.assert.deepStrictEqual(
                this.messageBuilder.shownButtons(setup),
                [this.selectors.RESURRECTION_AD_BUTTON, this.selectors.REVIVE_BUTTON]
            );
            this.assert.strictEqual(setup.reviveMessage.onRoomMessage(this.gameOverMessage), true);
            this.expectRenderedReviveMessage(setup, this.deathSnippets.wait, '');
            this.assert.deepStrictEqual(this.messageBuilder.shownButtons(setup), []);
            this.assert.strictEqual(setup.clickHandlers.length, 2);
        });
    }

    async testUnknownModesAndOtherMessagesRenderNothing()
    {
        await this.test('an unknown revive mode, another message or no message render nothing', async () => {
            let unknownModeMessage = Object.assign({}, this.townMessage, {mode: 'reviveSomewhereElse'});
            for(let message of [unknownModeMessage, {act: 'otherAction'}, {}, null]){
                let setup = this.messageBuilder.createSetup();
                this.assert.strictEqual(setup.reviveMessage.onRoomMessage(message), false);
                this.assert.strictEqual(setup.contentElement.innerHTML, '');
                this.assert.deepStrictEqual(setup.clickHandlers, []);
            }
        });
    }

    async testAMissingTemplateOrContentRendersNothing()
    {
        await this.test('a missing game over template or content element renders nothing', async () => {
            let missingTemplate = this.messageBuilder.createSetup(false, true);
            this.assert.strictEqual(missingTemplate.reviveMessage.onRoomMessage(this.townMessage), false);
            this.assert.strictEqual(missingTemplate.contentElement.innerHTML, '');
            this.assert.deepStrictEqual(missingTemplate.clickHandlers, []);
            let missingContent = this.messageBuilder.createSetup(true, false);
            this.assert.strictEqual(missingContent.reviveMessage.onRoomMessage(this.townMessage), false);
            this.assert.strictEqual(missingContent.reviveMessage.onRoomMessage(this.gameOverMessage), false);
            this.assert.deepStrictEqual(missingContent.clickHandlers, []);
        });
    }

    async testTheRoomMessagesAreListened()
    {
        await this.test('every room message reaches the game over revive message', async () => {
            let setup = this.messageBuilder.createSetup();
            let listenedMessages = [];
            let room = {onMessage: (messageType, callback) => listenedMessages.push({messageType, callback})};
            this.assert.strictEqual(setup.reviveMessage.listenRoomMessages(room), true);
            this.assert.strictEqual(listenedMessages.length, 1);
            let listenedMessage = listenedMessages.shift();
            this.assert.strictEqual(listenedMessage.messageType, '*');
            listenedMessage.callback(this.gameOverMessage);
            this.expectRenderedReviveMessage(setup, this.deathSnippets.wait, '');
            listenedMessage.callback(this.townMessage);
            this.assert.deepStrictEqual(this.messageBuilder.shownButtons(setup), this.adButtonOnly);
        });
    }

}

module.exports.TestGameOverReviveMessage = TestGameOverReviveMessage;
