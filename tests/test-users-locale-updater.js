/**
 *
 * Reldens - Test Users Locale Updater
 *
 */

const { BaseTest } = require('./base-test');
const { UsersLocaleUpdater } = require('../lib/snippets/server/users-locale-updater');
const { SnippetsConst } = require('../lib/snippets/constants');
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

    async sendLocaleChanges(updater, localesIds)
    {
        let sentChanges = [];
        for(let localeId of localesIds){
            sentChanges.push(updater.executeMessageActions(
                {},
                {act: SnippetsConst.ACTIONS.UPDATE, up: localeId},
                {},
                {userId: '1001'}
            ));
        }
        return await Promise.all(sentChanges);
    }

    createUpdater(usersLocaleRows, savedChanges, slowLocaleId = 0)
    {
        return new UsersLocaleUpdater({
            localeRepository: {
                loadOne: async (filters) => await this.loadEnabledLocale(filters, slowLocaleId)
            },
            usersLocaleRepository: {
                loadOneBy: async (field, value) => usersLocaleRows.filter((row) => value === row[field]).shift(),
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
            await this.sendLocaleChanges(updater, ['1', '2']);
            this.assert.deepStrictEqual(usersLocaleRows, [{id: 1, user_id: 1001, locale_id: 2}]);
            this.assert.deepStrictEqual(updater.pendingSaves, {});
        });
    }

    async testTheLastChosenLocaleIsSavedWhenTheFirstLookupIsSlower()
    {
        await this.test('the last chosen locale is saved when the first locale lookup answers later', async () => {
            let usersLocaleRows = [];
            await this.sendLocaleChanges(this.createUpdater(usersLocaleRows, [], 1), ['1', '2']);
            this.assert.deepStrictEqual(usersLocaleRows, [{id: 1, user_id: 1001, locale_id: 2}]);
        });
    }

    async testANotIntegerLocaleIsIgnored()
    {
        await this.test('a locale ID that is not a positive integer is ignored', async () => {
            let savedChanges = [];
            let results = await this.sendLocaleChanges(this.createUpdater([], savedChanges), ['abc', '0', '1.5']);
            this.assert.deepStrictEqual(results, [false, false, false]);
            this.assert.deepStrictEqual(savedChanges, []);
        });
    }

    async testTheUserLocaleIsCreatedWhenMissing()
    {
        await this.test('the chosen locale creates the user locale row when the user has none', async () => {
            let savedChanges = [];
            await this.sendLocaleChanges(this.createUpdater([], savedChanges), ['2']);
            this.assert.deepStrictEqual(savedChanges, [{created: {user_id: 1001, locale_id: 2}}]);
        });
    }

    async testTheUserLocaleIsUpdatedWhenExisting()
    {
        await this.test('the chosen locale updates the existing user locale row', async () => {
            let savedChanges = [];
            let updater = this.createUpdater([{id: 1001, locale_id: 1, user_id: 1001}], savedChanges);
            await this.sendLocaleChanges(updater, ['2']);
            this.assert.deepStrictEqual(savedChanges, [{updated: 1001, patch: {locale_id: 2}}]);
        });
    }

    async testAnUnknownLocaleIsIgnored()
    {
        await this.test('a locale ID that does not exist or is not enabled is ignored', async () => {
            let savedChanges = [];
            let results = await this.sendLocaleChanges(this.createUpdater([], savedChanges), ['1003']);
            this.assert.deepStrictEqual(results, [false]);
            this.assert.deepStrictEqual(savedChanges, []);
        });
    }

    async testOtherActionsAreIgnored()
    {
        await this.test('the messages with other actions are ignored', async () => {
            let savedChanges = [];
            let result = await this.createUpdater([], savedChanges).executeMessageActions(
                {},
                {act: 'aud.Up', up: '2'},
                {},
                {userId: '1001'}
            );
            this.assert.strictEqual(result, false);
            this.assert.deepStrictEqual(savedChanges, []);
        });
    }

}

module.exports.TestUsersLocaleUpdater = TestUsersLocaleUpdater;
