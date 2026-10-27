/**
 *
 * Reldens - E2E Seed And Restore Api
 *
 * HTTP client for the e2e endpoints registered by E2eSeedAndRestoreEndpoints: seeds rows, preserves the stored rows a
 * spec changes and overrides config values for the parallel spec group of the running test (all undone by the reset
 * before the next test of that group) and loads the stored rows a spec asserts, including the inventory item of a
 * player seeded or loaded by the player name and the item key, and the stored value of a config path (null when the
 * row is missing).
 *
 */

const { SecurityApi } = require('./security-api');

class E2eSeedAndRestoreApi
{

    static async createRow(gameConfig, group, entityKey, row)
    {
        return (await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/create', {group, entityKey, row})).row;
    }

    static async updateCreatedRow(gameConfig, group, entityKey, id, patch)
    {
        return (await SecurityApi.request(
            gameConfig,
            'POST',
            '/api/e2e/data/update-created',
            {group, entityKey, id, patch}
        )).updated;
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

    static async fetchConfigValue(gameConfig, configPath)
    {
        return [
            ...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'config', {
                scope: configPath.split('/').shift(),
                path: configPath.split('/').slice(1).join('/')
            }),
            {value: null}
        ].shift().value;
    }

    static async fetchInventoryFilters(gameConfig, playerName, itemKey)
    {
        return {
            owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}),
            item_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'itemsItem', {key: itemKey})
        };
    }

    static async seedInventoryItem(gameConfig, group, playerName, itemKey, qty)
    {
        return await E2eSeedAndRestoreApi.createRow(
            gameConfig,
            group,
            'itemsInventory',
            Object.assign(
                await E2eSeedAndRestoreApi.fetchInventoryFilters(gameConfig, playerName, itemKey),
                {qty, remaining_uses: 0, 'is_active': 0}
            )
        );
    }

    static async loadInventoryRows(gameConfig, playerName, itemKey)
    {
        return await E2eSeedAndRestoreApi.loadRows(
            gameConfig,
            'itemsInventory',
            await E2eSeedAndRestoreApi.fetchInventoryFilters(gameConfig, playerName, itemKey)
        );
    }

}

module.exports.E2eSeedAndRestoreApi = E2eSeedAndRestoreApi;
