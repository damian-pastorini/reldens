/**
 *
 * Reldens - Test Users Locale Updater
 *
 */

const { BaseTest } = require('./base-test');
const { UsersLocaleUpdater } = require('../lib/snippets/server/users-locale-updater');
const { SnippetsPlugin } = require('../lib/snippets/server/plugin');
const { SnippetsConst } = require('../lib/snippets/constants');
const { EventsManager, sc } = require('@reldens/utils');
const timersPromises = require('timers/promises');

class TestUsersLocaleUpdater extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.slowLocaleLookupDelayMs = 10;
    }

    async loadEnabledLocale(filters, slowLocaleId)
    {
        if(slowLocaleId === filters.id){
            await timersPromises.setTimeout(this.slowLocaleLookupDelayMs);
        }
        return [
            {id: 1, locale: 'en_US', enabled: 1},
            {id: 2, locale: 'es_AR', enabled: 1}
        ].filter((locale) => filters.id === locale.id && filters.enabled === locale.enabled).shift();
    }

    async sendLocaleChanges(updater, localesChanges, clientMessages = [])
    {
        let client = {send: (messageKey, message) => clientMessages.push(message)};
        let sentChanges = [];
        for(let localeChange of localesChanges){
            sentChanges.push(updater.executeMessageActions(
                client,
                {act: SnippetsConst.ACTIONS.UPDATE, ...localeChange},
                {},
                {userId: '1001'}
            ));
        }
        return await Promise.all(sentChanges);
    }

    createSaveErrors(changesTimes)
    {
        let saveErrors = [];
        for(let changedAt of changesTimes){
            saveErrors.push({act: SnippetsConst.ACTIONS.UPDATE_ERROR, listener: SnippetsConst.KEY, changedAt});
        }
        return saveErrors;
    }

    createUpdater(usersLocaleRows, savedChanges, slowLocaleId = 0)
    {
        return new UsersLocaleUpdater({
            localeRepository: {
                loadOne: async (filters) => await this.loadEnabledLocale(filters, slowLocaleId)
            },
            usersLocaleRepository: {
                loadOneBy: async (field, value) => usersLocaleRows.filter((row) => value === row[field]).shift(),
                loadOneByWithRelations: async () => false,
                updateById: async (id, patch) => {
                    Object.assign(usersLocaleRows.filter((row) => id === row.id).shift(), patch);
                    return savedChanges.push({updated: id, patch});
                },
                create: async (row) => {
                    usersLocaleRows.push(Object.assign({id: usersLocaleRows.length + 1}, row));
                    return savedChanges.push({created: row});
                }
            }
        });
    }

    async testQuickLocaleChangesSaveOneRow()
    {
        await this.test('two quick locale changes save one user locale row with the last chosen locale', async () => {
            let usersLocaleRows = [];
            let updater = this.createUpdater(usersLocaleRows, []);
            await this.sendLocaleChanges(updater, [{up: 1, changedAt: 1}, {up: 2, changedAt: 2}]);
            this.assert.deepStrictEqual(usersLocaleRows, [{id: 1, user_id: 1001, locale_id: 2}]);
            this.assert.deepStrictEqual(updater.pendingSaves, {});
        });
    }

    async testTheLastChosenLocaleIsSavedWhenTheFirstLookupIsSlower()
    {
        await this.test('the last chosen locale is saved when the first locale lookup answers later', async () => {
            let usersLocaleRows = [];
            let updater = this.createUpdater(usersLocaleRows, [], 1);
            await this.sendLocaleChanges(updater, [{up: 1, changedAt: 1}, {up: 2, changedAt: 2}]);
            this.assert.deepStrictEqual(usersLocaleRows, [{id: 1, user_id: 1001, locale_id: 2}]);
        });
    }

    async testAnOlderChangeArrivingLaterIsIgnored()
    {
        await this.test('a locale change older than the last received change is not saved', async () => {
            let usersLocaleRows = [];
            let clientMessages = [];
            let updater = this.createUpdater(usersLocaleRows, []);
            let localesChanges = [{up: 2, changedAt: 2}, {up: 1, changedAt: 1}];
            let results = await this.sendLocaleChanges(updater, localesChanges, clientMessages);
            this.assert.strictEqual(results.pop(), false);
            this.assert.deepStrictEqual(usersLocaleRows, [{id: 1, user_id: 1001, locale_id: 2}]);
            this.assert.deepStrictEqual(clientMessages, []);
        });
    }

    async testANewLoginAcceptsTheChangesOfAnEarlierClock()
    {
        await this.test('a new login accepts the language changes sent with an earlier device clock', async () => {
            let usersLocaleRows = [];
            let events = new EventsManager();
            let storedUpdater = this.createUpdater(usersLocaleRows, []);
            let repositories = {
                locale: storedUpdater.localeRepository,
                usersLocale: storedUpdater.usersLocaleRepository
            };
            let dataServer = {getEntity: (entityKey) => sc.get(repositories, entityKey, {})};
            let snippetsPlugin = new SnippetsPlugin();
            await snippetsPlugin.setup({events, dataServer});
            await this.sendLocaleChanges(snippetsPlugin.usersLocaleUpdater, [{up: 2, changedAt: 2000}]);
            await events.emit('reldens.beforeSuperInitialGameData', {}, {events, dataServer}, {}, {id: 1001});
            await this.sendLocaleChanges(snippetsPlugin.usersLocaleUpdater, [{up: 1, changedAt: 1000}]);
            this.assert.deepStrictEqual(usersLocaleRows, [{id: 1, user_id: 1001, locale_id: 1}]);
        });
    }

    async testANotIntegerLocaleSendsTheSaveError()
    {
        await this.test('a locale ID that is not a positive integer is not saved and the player gets the error', async () => {
            let savedChanges = [];
            let clientMessages = [];
            let results = await this.sendLocaleChanges(this.createUpdater([], savedChanges), [
                {up: '1', changedAt: 1},
                {up: 0, changedAt: 2},
                {up: 1.5, changedAt: 3}
            ], clientMessages);
            this.assert.deepStrictEqual(results, [false, false, false]);
            this.assert.deepStrictEqual(savedChanges, []);
            this.assert.deepStrictEqual(clientMessages, this.createSaveErrors([1, 2, 3]));
        });
    }

    async testAMissingChangeTimeSendsTheSaveError()
    {
        await this.test('a locale change without a valid change time is not saved and the player gets the error', async () => {
            let savedChanges = [];
            let clientMessages = [];
            let results = await this.sendLocaleChanges(this.createUpdater([], savedChanges), [
                {up: 1},
                {up: 1, changedAt: '1'}
            ], clientMessages);
            this.assert.deepStrictEqual(results, [false, false]);
            this.assert.deepStrictEqual(savedChanges, []);
            this.assert.deepStrictEqual(clientMessages, this.createSaveErrors([0, '1']));
        });
    }

    async testAStorageErrorSendsTheSaveError()
    {
        await this.test('a locale change that fails on the storage sends the error to the player', async () => {
            let clientMessages = [];
            let updater = this.createUpdater([], []);
            updater.usersLocaleRepository.create = async () => Promise.reject(new Error('Storage unavailable.'));
            let results = await this.sendLocaleChanges(updater, [{up: 2, changedAt: 1}], clientMessages);
            this.assert.deepStrictEqual(results, [false]);
            this.assert.deepStrictEqual(clientMessages, this.createSaveErrors([1]));
        });
    }

    async testTheUserLocaleIsCreatedWhenMissing()
    {
        await this.test('the chosen locale creates the user locale row when the user has none', async () => {
            let savedChanges = [];
            let clientMessages = [];
            let updater = this.createUpdater([], savedChanges);
            await this.sendLocaleChanges(updater, [{up: 2, changedAt: 1}], clientMessages);
            this.assert.deepStrictEqual(savedChanges, [{created: {user_id: 1001, locale_id: 2}}]);
            this.assert.deepStrictEqual(clientMessages, []);
        });
    }

    async testTheUserLocaleIsUpdatedWhenExisting()
    {
        await this.test('the chosen locale updates the existing user locale row', async () => {
            let savedChanges = [];
            let updater = this.createUpdater([{id: 1001, locale_id: 1, user_id: 1001}], savedChanges);
            await this.sendLocaleChanges(updater, [{up: 2, changedAt: 1}]);
            this.assert.deepStrictEqual(savedChanges, [{updated: 1001, patch: {locale_id: 2}}]);
        });
    }

    async testAnUnknownLocaleSendsTheSaveError()
    {
        await this.test('a locale that does not exist or is not enabled is not saved and the player gets the error', async () => {
            let savedChanges = [];
            let clientMessages = [];
            let updater = this.createUpdater([], savedChanges);
            let results = await this.sendLocaleChanges(updater, [{up: 1003, changedAt: 1}], clientMessages);
            this.assert.deepStrictEqual(results, [false]);
            this.assert.deepStrictEqual(savedChanges, []);
            this.assert.deepStrictEqual(clientMessages, this.createSaveErrors([1]));
        });
    }

    async testOtherActionsAreIgnored()
    {
        await this.test('the messages with other actions are ignored', async () => {
            let savedChanges = [];
            let result = await this.createUpdater([], savedChanges).executeMessageActions(
                {},
                {act: 'aud.Up', up: 2, changedAt: 1},
                {},
                {userId: '1001'}
            );
            this.assert.strictEqual(result, false);
            this.assert.deepStrictEqual(savedChanges, []);
        });
    }

}

module.exports.TestUsersLocaleUpdater = TestUsersLocaleUpdater;
