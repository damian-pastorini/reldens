/**
 *
 * Reldens - E2E Seed And Restore Api
 *
 * HTTP client for the e2e endpoints registered by E2eSeedAndRestoreEndpoints: seeds rows, preserves the stored rows a
 * spec changes and overrides config values for the parallel spec group of the running test (all undone by the reset
 * before the next test of that group) and loads the stored rows a spec asserts.
 *
 */

const { SecurityApi } = require('./security-api');

class E2eSeedAndRestoreApi
{

    static async createRow(gameConfig, group, entityKey, row)
    {
        return (await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/create', {group, entityKey, row})).row;
    }

    static async preserveRows(gameConfig, group, entityKey, filters)
    {
        return (await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/preserve', {group, entityKey, filters})).rows;
    }

    static async loadRows(gameConfig, entityKey, filters)
    {
        return (await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/load', {entityKey, filters})).rows;
    }

    static async overrideConfig(gameConfig, group, path, value)
    {
        return await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/config', {group, path, value});
    }

    static async fetchRowId(gameConfig, entityKey, filters)
    {
        return [...await E2eSeedAndRestoreApi.loadRows(gameConfig, entityKey, filters)].shift().id;
    }

}

module.exports.E2eSeedAndRestoreApi = E2eSeedAndRestoreApi;
