/**
 *
 * Reldens - Test Language Save Error Notice
 *
 */

const { BaseTest } = require('./base-test');
const { LanguageSaveErrorListener } = require('../lib/snippets/client/language-save-error-listener');
const { SnippetsUi } = require('../lib/snippets/client/snippets-ui');
const { Translator } = require('../lib/snippets/translator');
const { SnippetsConst } = require('../lib/snippets/constants');
const { GameConst } = require('../lib/game/constants');
const timersPromises = require('timers/promises');

class TestLanguageSaveErrorNotice extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.nextChangeDelayMs = 5;
    }

    createHiddenSaveError(lastChangedAt)
    {
        let saveError = {classes: new Set([GameConst.CLASSES.HIDDEN]), dataset: {changedAt: lastChangedAt}};
        saveError.classList = {
            add: (className) => saveError.classes.add(className),
            remove: (className) => saveError.classes.delete(className),
            contains: (className) => saveError.classes.has(className)
        };
        return saveError;
    }

    async runListener(act, changedAt, saveError)
    {
        return await new LanguageSaveErrorListener().executeClientMessageActions({
            message: {act, listener: SnippetsConst.KEY, changedAt},
            roomEvents: {gameManager: {gameDom: {getElement: () => saveError}}}
        });
    }

    createSnippetsUi(saveError, uiCalls)
    {
        let localeSelector = {
            value: '2',
            appendChild: () => true,
            addEventListener: (eventName, handler) => uiCalls.changeHandlers.push(handler)
        };
        let elements = {'.snippets-setting': localeSelector, [SnippetsConst.SELECTORS.SAVE_ERROR]: saveError};
        let uiScene = {cache: {html: {get: () => ''}}};
        uiScene.gameManager = {
            services: {translator: new Translator({})},
            gameEngine: {parseTemplate: () => ''},
            gameDom: {
                appendToElement: () => true,
                getElement: (selector) => elements[selector],
                createElement: () => ({})
            },
            activeRoomEvents: {send: (message) => uiCalls.sentMessages.push(message)}
        };
        return new SnippetsUi(uiScene, {
            0: {id: 1, locale: 'en_US', country_code: 'US'},
            1: {id: 2, locale: 'es_AR', country_code: 'AR'}
        });
    }

    async testTheSaveErrorOfTheLastChangeIsShown()
    {
        await this.test('the save error of the last language change is shown under the language selector', async () => {
            let saveError = this.createHiddenSaveError('5');
            this.assert.strictEqual(await this.runListener(SnippetsConst.ACTIONS.UPDATE_ERROR, 5, saveError), true);
            this.assert.strictEqual(saveError.classList.contains(GameConst.CLASSES.HIDDEN), false);
        });
    }

    async testTheSaveErrorOfAnOlderChangeIsIgnored()
    {
        await this.test('the save error of an older language change keeps the error hidden', async () => {
            let saveError = this.createHiddenSaveError('6');
            this.assert.strictEqual(await this.runListener(SnippetsConst.ACTIONS.UPDATE_ERROR, 5, saveError), false);
            this.assert.strictEqual(saveError.classList.contains(GameConst.CLASSES.HIDDEN), true);
        });
    }

    async testOtherMessagesKeepTheErrorHidden()
    {
        await this.test('the other snippets messages keep the language save error hidden', async () => {
            let saveError = this.createHiddenSaveError('5');
            this.assert.strictEqual(await this.runListener(SnippetsConst.ACTIONS.UPDATE, 5, saveError), false);
            this.assert.strictEqual(saveError.classList.contains(GameConst.CLASSES.HIDDEN), true);
        });
    }

    async testANewChangeHidesThePreviousError()
    {
        await this.test('a new language change hides the shown save error and sends the chosen locale', async () => {
            let saveError = this.createHiddenSaveError('');
            let uiCalls = {changeHandlers: [], sentMessages: []};
            this.assert.strictEqual(this.createSnippetsUi(saveError, uiCalls).createUi(), true);
            saveError.classList.remove(GameConst.CLASSES.HIDDEN);
            await uiCalls.changeHandlers.shift()();
            this.assert.strictEqual(saveError.classList.contains(GameConst.CLASSES.HIDDEN), true);
            let sentMessage = uiCalls.sentMessages.shift();
            this.assert.deepStrictEqual([sentMessage.act, sentMessage.up], [SnippetsConst.ACTIONS.UPDATE, 2]);
            this.assert.strictEqual(saveError.dataset.changedAt, String(sentMessage.changedAt));
        });
    }

    async testTheFailedEarlierChangeDoesNotShowTheErrorOfTheSavedChange()
    {
        await this.test('the late error of an earlier change is not shown after the next change was sent', async () => {
            let saveError = this.createHiddenSaveError('');
            let uiCalls = {changeHandlers: [], sentMessages: []};
            this.createSnippetsUi(saveError, uiCalls).createUi();
            let changeHandler = uiCalls.changeHandlers.shift();
            await changeHandler();
            await timersPromises.setTimeout(this.nextChangeDelayMs);
            await changeHandler();
            let earlierChangedAt = uiCalls.sentMessages.shift().changedAt;
            this.assert.strictEqual(earlierChangedAt < uiCalls.sentMessages.shift().changedAt, true);
            await this.runListener(SnippetsConst.ACTIONS.UPDATE_ERROR, earlierChangedAt, saveError);
            this.assert.strictEqual(saveError.classList.contains(GameConst.CLASSES.HIDDEN), true);
        });
    }

}

module.exports.TestLanguageSaveErrorNotice = TestLanguageSaveErrorNotice;
