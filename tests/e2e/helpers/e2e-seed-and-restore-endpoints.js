/**
 *
 * Reldens - E2E Seed And Restore Endpoints
 *
 * Server side e2e endpoints to seed the rows a spec needs, preserve the stored rows a spec changes, read the stored rows
 * a spec asserts and override config values of the running server. The seeded rows, the preserved rows and the
 * overridden values are kept per parallel spec group, and the reset that runs before every test of a group (and the
 * global teardown for every group) restores the preserved rows (the rows created since then for the same filters are
 * deleted), deletes the seeded rows and restores the values of that group only, so the data of one spec never reaches
 * the next one and the groups running at the same time never undo each other. The preserved rows are restored first,
 * so a preserved row that references a seeded row (a user locale that points to a seeded locale) never blocks the
 * seeded row delete. The locales reload runs the snippets ConfigurationEnricher again, so a seeded locale reaches the
 * client config sent on the next login.
 *
 */

const { TestDataSetup } = require('./test-data-setup');
const { Logger, sc } = require('@reldens/utils');

class E2eSeedAndRestoreEndpoints
{

    static createdRows = {};
    static preservedRows = {};
    static originalConfigValues = {};
    static reloadLocalesGroups = [];

    static fetchGroupEntries(groupsEntries, groupKey)
    {
        if(!sc.hasOwn(groupsEntries, groupKey)){
            groupsEntries[groupKey] = [];
        }
        return groupsEntries[groupKey];
    }

    static async createRow(serverManager, groupKey, entityKey, row)
    {
        let createdRow = await serverManager.dataServer.getEntity(entityKey).create(row);
        if(!createdRow){
            return false;
        }
        E2eSeedAndRestoreEndpoints.fetchGroupEntries(E2eSeedAndRestoreEndpoints.createdRows, groupKey).push({
            entityKey,
            id: createdRow.id
        });
        return createdRow;
    }

    static async preserveRows(serverManager, groupKey, entityKey, filters)
    {
        let rows = await serverManager.dataServer.getEntity(entityKey).load(filters);
        E2eSeedAndRestoreEndpoints.fetchGroupEntries(E2eSeedAndRestoreEndpoints.preservedRows, groupKey).push({
            entityKey,
            filters,
            rows
        });
        return rows;
    }

    static async restorePreservedRows(serverManager, preservedEntry)
    {
        let repository = serverManager.dataServer.getEntity(preservedEntry.entityKey);
        let preservedIds = preservedEntry.rows.map(row => row.id);
        for(let currentRow of await repository.load(preservedEntry.filters)){
            if(!preservedIds.includes(currentRow.id)){
                await repository.deleteById(currentRow.id);
            }
        }
        for(let row of preservedEntry.rows){
            await repository.updateById(row.id, TestDataSetup.copyRow(row, {}));
        }
    }

    static overrideConfigValue(serverManager, groupKey, path, value)
    {
        if(!sc.hasOwn(E2eSeedAndRestoreEndpoints.originalConfigValues, groupKey)){
            E2eSeedAndRestoreEndpoints.originalConfigValues[groupKey] = {};
        }
        let groupOriginalValues = E2eSeedAndRestoreEndpoints.originalConfigValues[groupKey];
        let configPosition = E2eSeedAndRestoreEndpoints.fetchConfigPosition(serverManager.configManager, path);
        if(!sc.hasOwn(groupOriginalValues, path)){
            groupOriginalValues[path] = {
                isSet: sc.hasOwn(configPosition.configNode, configPosition.lastKey),
                value: configPosition.configNode[configPosition.lastKey]
            };
        }
        configPosition.configNode[configPosition.lastKey] = value;
    }

    static restoreConfigValue(configManager, path, originalValue)
    {
        let configPosition = E2eSeedAndRestoreEndpoints.fetchConfigPosition(configManager, path);
        if(originalValue.isSet){
            configPosition.configNode[configPosition.lastKey] = originalValue.value;
            return;
        }
        delete configPosition.configNode[configPosition.lastKey];
    }

    static fetchConfigPosition(configManager, path)
    {
        let pathKeys = path.split('/');
        let lastKey = pathKeys.pop();
        let configNode = configManager;
        for(let pathKey of pathKeys){
            if(!sc.isObject(configNode[pathKey])){
                configNode[pathKey] = {};
            }
            configNode = configNode[pathKey];
        }
        return {configNode, lastKey};
    }

    static async reloadLocales(serverManager)
    {
        await serverManager.featuresManager.featuresList.snippets.package.configurationEnricher.withLocalesAndSnippets({
            serverManager
        });
    }

    static async resetGroup(serverManager, groupKey)
    {
        for(let preservedEntry of sc.get(E2eSeedAndRestoreEndpoints.preservedRows, groupKey, [])){
            await E2eSeedAndRestoreEndpoints.restorePreservedRows(serverManager, preservedEntry);
        }
        delete E2eSeedAndRestoreEndpoints.preservedRows[groupKey];
        for(let createdRow of [...sc.get(E2eSeedAndRestoreEndpoints.createdRows, groupKey, [])].reverse()){
            await serverManager.dataServer.getEntity(createdRow.entityKey).deleteById(createdRow.id);
        }
        delete E2eSeedAndRestoreEndpoints.createdRows[groupKey];
        let groupOriginalValues = sc.get(E2eSeedAndRestoreEndpoints.originalConfigValues, groupKey, {});
        for(let path of Object.keys(groupOriginalValues)){
            E2eSeedAndRestoreEndpoints.restoreConfigValue(serverManager.configManager, path, groupOriginalValues[path]);
        }
        delete E2eSeedAndRestoreEndpoints.originalConfigValues[groupKey];
        if(E2eSeedAndRestoreEndpoints.reloadLocalesGroups.includes(groupKey)){
            E2eSeedAndRestoreEndpoints.reloadLocalesGroups.splice(
                E2eSeedAndRestoreEndpoints.reloadLocalesGroups.indexOf(groupKey),
                1
            );
            await E2eSeedAndRestoreEndpoints.reloadLocales(serverManager);
        }
        Logger.info('[e2e-seed-and-restore] Rows and config values restored for group: '+groupKey);
    }

    static async resetAllGroups(serverManager)
    {
        let groupsKeys = [
            ...Object.keys(E2eSeedAndRestoreEndpoints.createdRows),
            ...Object.keys(E2eSeedAndRestoreEndpoints.preservedRows),
            ...Object.keys(E2eSeedAndRestoreEndpoints.originalConfigValues),
            ...E2eSeedAndRestoreEndpoints.reloadLocalesGroups
        ];
        for(let groupKey of [...new Set(groupsKeys)]){
            await E2eSeedAndRestoreEndpoints.resetGroup(serverManager, groupKey);
        }
    }

    static registerEndpoints(serverManager)
    {
        let app = serverManager.app;
        app.post('/api/e2e/data/create', async (request, response) => {
            response.json({
                row: await E2eSeedAndRestoreEndpoints.createRow(
                    serverManager,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'entityKey', ''),
                    sc.get(request.body, 'row', {})
                )
            });
        });
        app.post('/api/e2e/data/preserve', async (request, response) => {
            response.json({
                rows: await E2eSeedAndRestoreEndpoints.preserveRows(
                    serverManager,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'entityKey', ''),
                    sc.get(request.body, 'filters', {})
                )
            });
        });
        app.post('/api/e2e/data/load', async (request, response) => {
            let repository = serverManager.dataServer.getEntity(sc.get(request.body, 'entityKey', ''));
            response.json({rows: await repository.load(sc.get(request.body, 'filters', {}))});
        });
        app.post('/api/e2e/data/config', (request, response) => {
            E2eSeedAndRestoreEndpoints.overrideConfigValue(
                serverManager,
                sc.get(request.body, 'group', ''),
                sc.get(request.body, 'path', ''),
                request.body.value
            );
            response.json({ok: true});
        });
        app.post('/api/e2e/data/reload-locales', async (request, response) => {
            let groupKey = sc.get(request.body, 'group', '');
            if(!E2eSeedAndRestoreEndpoints.reloadLocalesGroups.includes(groupKey)){
                E2eSeedAndRestoreEndpoints.reloadLocalesGroups.push(groupKey);
            }
            await E2eSeedAndRestoreEndpoints.reloadLocales(serverManager);
            response.json({ok: true});
        });
        Logger.info('[e2e-seed-and-restore] Data endpoints registered.');
    }

}

module.exports.E2eSeedAndRestoreEndpoints = E2eSeedAndRestoreEndpoints;
