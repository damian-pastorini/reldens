/**
 *
 * Reldens - Test Game Over Revive Message
 *
 */

const { BaseTest } = require('./base-test');
const { GameOverReviveMessage } = require('../lib/actions/client/game-over-revive-message');
const { Translator } = require('../lib/snippets/translator');
const { TranslationsMapper } = require('../lib/snippets/client/translations-mapper');
const { SnippetsConst } = require('../lib/snippets/constants');
const { ActionsConst } = require('../lib/actions/constants');
const { GameConst } = require('../lib/game/constants');
const ActionsTranslations = require('../lib/actions/client/snippets/en_US');
const { FileHandler } = require('@reldens/server-utils');
const TemplateEngineRender = require('mustache');

class TestGameOverReviveMessage extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.gameOverTemplate = FileHandler.readFile(FileHandler.joinPaths(
            process.cwd(),
            'theme',
            'default',
            'assets',
            'features',
            'skills',
            'templates',
            'ui-game-over.html'
        ));
        this.translator = new Translator({
            snippets: {[SnippetsConst.DEFAULT_LOCALE]: TranslationsMapper.fromObject(ActionsTranslations)}
        });
        this.deathSnippets = ActionsTranslations.actions.death;
        this.adButtonClass = 'class="game-over-resurrection-ad"';
        this.itemLabel = 'Restoration Scroll';
        this.townLabel = 'Town';
        this.gameOverMessage = {act: GameConst.GAME_OVER};
        this.townMessage = {
            act: ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE,
            mode: ActionsConst.DEATH.REVIVE_MODES.TOWN,
            townLabel: this.townLabel,
            resurrectionAdEventKey: 'reldens.resurrectionAd'
        };
    }

    createReviveMessageSetup(templateLoaded = true, contentFound = true)
    {
        let setup = {emittedEvents: [], clickHandlers: [], contentElement: {innerHTML: ''}};
        let adButton = {addEventListener: (eventName, handler) => setup.clickHandlers.push({eventName, handler})};
        let gameDom = {
            updateContent: (selector, content) => {
                if(!contentFound || ActionsConst.DEATH.SELECTORS.GAME_OVER_CONTENT !== selector){
                    return false;
                }
                setup.contentElement.innerHTML = content;
                return setup.contentElement;
            },
            getElement: (selector) => {
                if(ActionsConst.DEATH.SELECTORS.RESURRECTION_AD_BUTTON !== selector){
                    return null;
                }
                return this.hasAdButton(setup) ? adButton : null;
            }
        };
        let htmlCache = {
            get: (templateKey) => {
                if(!templateLoaded || ActionsConst.TEMPLATES.GAME_OVER !== templateKey){
                    return false;
                }
                return this.gameOverTemplate;
            }
        };
        setup.reviveMessage = new GameOverReviveMessage({
            gameManager: {
                services: {translator: this.translator},
                gameEngine: {
                    uiScene: {cache: {html: htmlCache}},
                    parseTemplate: (template, view) => TemplateEngineRender.render(template, view)
                },
                gameDom
            },
            events: {emit: async (eventKey, eventData) => setup.emittedEvents.push({eventKey, eventData})}
        });
        return setup;
    }

    hasAdButton(setup)
    {
        return -1 !== setup.contentElement.innerHTML.indexOf(this.adButtonClass);
    }

    expectRenderedReviveMessage(setup, reviveMessage)
    {
        let renderedContent = setup.contentElement.innerHTML;
        this.assert.notStrictEqual(renderedContent.indexOf(this.deathSnippets.title), -1);
        this.assert.notStrictEqual(renderedContent.indexOf(this.deathSnippets.wait), -1);
        this.assert.notStrictEqual(
            renderedContent.indexOf('<p class="game-over-revive-message">'+reviveMessage+'</p>'),
            -1
        );
    }

    async testTheGameOverShowsNoAdButtonBeforeTheReviveMode()
    {
        await this.test('the game over shows the title and wait text without the resurrection ad button', async () => {
            let setup = this.createReviveMessageSetup();
            this.assert.strictEqual(setup.reviveMessage.onRoomMessage(this.gameOverMessage), true);
            this.expectRenderedReviveMessage(setup, '');
            this.assert.strictEqual(this.hasAdButton(setup), false);
            this.assert.deepStrictEqual(setup.clickHandlers, []);
        });
    }

    async testTheTownReviveOffersTheResurrectionAdButton()
    {
        await this.test('the town revive ad button fires the sent ad event on every click', async () => {
            let setup = this.createReviveMessageSetup();
            setup.reviveMessage.onRoomMessage(this.gameOverMessage);
            this.assert.strictEqual(setup.reviveMessage.onRoomMessage(this.townMessage), true);
            this.expectRenderedReviveMessage(
                setup,
                this.deathSnippets.reviveInTown.replace('%townLabel', this.townLabel)
            );
            this.assert.strictEqual(this.hasAdButton(setup), true);
            this.assert.notStrictEqual(
                setup.contentElement.innerHTML.indexOf(this.deathSnippets.resurrectionAdButton),
                -1
            );
            this.assert.strictEqual(setup.clickHandlers.length, 1);
            let clickHandler = setup.clickHandlers.shift();
            this.assert.strictEqual(clickHandler.eventName, 'click');
            await clickHandler.handler();
            await clickHandler.handler();
            let expectedEvent = {eventKey: this.townMessage.resurrectionAdEventKey, eventData: {}};
            this.assert.deepStrictEqual(setup.emittedEvents, [expectedEvent, expectedEvent]);
        });
    }

    async testTheReviveModesWithoutAdShowNoButton()
    {
        await this.test('the revive modes without an ad event key show their message and no ad button', async () => {
            let reviveAction = ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE;
            let townReviveMessage = this.deathSnippets.reviveInTown.replace('%townLabel', this.townLabel);
            let reviveCases = [
                {
                    message: {act: reviveAction, mode: ActionsConst.DEATH.REVIVE_MODES.IN_PLACE},
                    reviveMessage: this.deathSnippets.reviveInPlace
                },
                {
                    message: {
                        act: reviveAction,
                        mode: ActionsConst.DEATH.REVIVE_MODES.RESTORATION_ITEM,
                        itemLabel: this.itemLabel
                    },
                    reviveMessage: this.deathSnippets.reviveWithRestorationItem.replace('%itemLabel', this.itemLabel)
                },
                {
                    message: Object.assign({}, this.townMessage, {resurrectionAdEventKey: ''}),
                    reviveMessage: townReviveMessage
                },
                {
                    message: {act: reviveAction, mode: ActionsConst.DEATH.REVIVE_MODES.TOWN, townLabel: this.townLabel},
                    reviveMessage: townReviveMessage
                }
            ];
            for(let reviveCase of reviveCases){
                let setup = this.createReviveMessageSetup();
                this.assert.strictEqual(setup.reviveMessage.onRoomMessage(reviveCase.message), true);
                this.expectRenderedReviveMessage(setup, reviveCase.reviveMessage);
                this.assert.strictEqual(this.hasAdButton(setup), false);
                this.assert.deepStrictEqual(setup.clickHandlers, []);
            }
        });
    }

    async testTheNextGameOverRemovesThePreviousAdButton()
    {
        await this.test('the next game over removes the previous town revive ad button', async () => {
            let setup = this.createReviveMessageSetup();
            setup.reviveMessage.onRoomMessage(this.townMessage);
            this.assert.strictEqual(this.hasAdButton(setup), true);
            this.assert.strictEqual(setup.reviveMessage.onRoomMessage(this.gameOverMessage), true);
            this.expectRenderedReviveMessage(setup, '');
            this.assert.strictEqual(this.hasAdButton(setup), false);
            this.assert.strictEqual(setup.clickHandlers.length, 1);
        });
    }

    async testUnknownModesAndOtherMessagesRenderNothing()
    {
        await this.test('an unknown revive mode, another message or no message render nothing', async () => {
            let unknownModeMessage = Object.assign({}, this.townMessage, {mode: 'reviveSomewhereElse'});
            for(let message of [unknownModeMessage, {act: 'otherAction'}, {}, null]){
                let setup = this.createReviveMessageSetup();
                this.assert.strictEqual(setup.reviveMessage.onRoomMessage(message), false);
                this.assert.strictEqual(setup.contentElement.innerHTML, '');
                this.assert.deepStrictEqual(setup.clickHandlers, []);
            }
        });
    }

    async testAMissingTemplateOrContentRendersNothing()
    {
        await this.test('a missing game over template or content element renders nothing', async () => {
            let missingTemplate = this.createReviveMessageSetup(false, true);
            this.assert.strictEqual(missingTemplate.reviveMessage.onRoomMessage(this.townMessage), false);
            this.assert.strictEqual(missingTemplate.contentElement.innerHTML, '');
            this.assert.deepStrictEqual(missingTemplate.clickHandlers, []);
            let missingContent = this.createReviveMessageSetup(true, false);
            this.assert.strictEqual(missingContent.reviveMessage.onRoomMessage(this.townMessage), false);
            this.assert.strictEqual(missingContent.reviveMessage.onRoomMessage(this.gameOverMessage), false);
            this.assert.deepStrictEqual(missingContent.clickHandlers, []);
        });
    }

    async testTheRoomMessagesAreListened()
    {
        await this.test('every room message reaches the game over revive message', async () => {
            let setup = this.createReviveMessageSetup();
            let listenedMessages = [];
            let room = {onMessage: (messageType, callback) => listenedMessages.push({messageType, callback})};
            this.assert.strictEqual(setup.reviveMessage.listenRoomMessages(room), true);
            this.assert.strictEqual(listenedMessages.length, 1);
            let listenedMessage = listenedMessages.shift();
            this.assert.strictEqual(listenedMessage.messageType, '*');
            listenedMessage.callback(this.gameOverMessage);
            this.expectRenderedReviveMessage(setup, '');
            listenedMessage.callback(this.townMessage);
            this.assert.strictEqual(this.hasAdButton(setup), true);
        });
    }

}

module.exports.TestGameOverReviveMessage = TestGameOverReviveMessage;
