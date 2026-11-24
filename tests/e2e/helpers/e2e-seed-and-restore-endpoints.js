/**
 *
 * Reldens - E2E Seed And Restore Endpoints
 *
 * Server side e2e endpoints to seed the rows a spec needs, update the rows seeded by the same group, preserve the stored
 * rows a spec changes, read the stored rows a spec asserts and override (or remove) config values of the running
 * server. The seeded rows, the preserved rows and the
 * overridden values are kept per parallel spec group, and the reset that runs before every test of a group (and the
 * global teardown for every group) restores the preserved rows (the rows created since then for the same filters are
 * deleted and the preserved rows deleted by the spec are created again with their own ids), deletes the seeded rows and
 * restores the values of that group only, so the data of one spec never reaches
 * the next one and the groups running at the same time never undo each other. The preserved rows are restored first,
 * so a preserved row that references a seeded row (a user locale that points to a seeded locale) never blocks the
 * seeded row delete. The locales reload runs the snippets ConfigurationEnricher again, so a seeded locale reaches the
 * client config sent on the next login. The config values that the running server reads only once (the config rows
 * are never hot plugged, a server restart applies them) are read again after every override and restore: the death
 * relocator, the rooms auto recovery, the kill score subscriber, the scores page size and title, the player creation
 * (the player name lengths and the rooms selection), created again with the new values, the rooms server validation
 * flag of every defined room (RoomsServerValidationFlagRefresher, the next instance gets it like on a restart), and the
 * game over time
 * of the
 * live enemy and player battles (BattlesLoadedConfig) and the resurrection ad gate values
 * (ResurrectionAdLoadedConfig), like the restart that loads them. The stored rooms, change points and return points are also read only at the server start: a rooms reload loads
 * them again, sets the new room data on every defined room, the rooms servers addresses sent to the clients (and read by
 * the rooms availability) and the other servers the disconnect requests and the signed server to server messengers are
 * sent to, and disposes the live instances of the
 * given rooms, so their
 * next instance builds its world with the stored change points, like a restart; a skills reload loads the stored skills,
 * groups, class paths and animations again (the DataLoader of the server start) and drops the class paths labels the
 * game room sends to the clients, built again on the next login like after a start, so the next join gets the imported
 * skills and class paths; both run again on the group reset.
 *
 */

const { TestDataSetup } = require('./test-data-setup');
const { RoomObjectsState } = require('./room-objects-state');
const { ServersSignedRequestsState } = require('./servers-signed-requests-state');
const { BattlesLoadedConfig } = require('./battles-loaded-config');
const { ResurrectionAdLoadedConfig } = require('./resurrection-ad-loaded-config');
const { RoomsServerValidationFlagRefresher } = require('./rooms-server-validation-flag-refresher');
const { DataLoader } = require('../../../lib/actions/server/data-loader');
const { IncreaseScoreOnKill } = require('../../../lib/scores/server/subscriber/increase-score-on-kill');
const { Logger, sc } = require('@reldens/utils');

class E2eSeedAndRestoreEndpoints
{

    static createdRows = {};
    static preservedRows = {};
    static originalConfigValues = {};
    static reloadLocalesGroups = [];
    static reloadRoomsGroups = {};
    static reloadSkillsGroups = {};

    static fetchGroupEntries(groupsEntries, groupKey)
    {
        if(!sc.hasOwn(groupsEntries, groupKey)){
            groupsEntries[groupKey] = [];
        }
        return groupsEntries[groupKey];
    }

    static async createRow(serverManager, groupKey, entityKey, row)
    {
        let repository = serverManager.dataServer.getEntity(entityKey);
        let createdRow = await repository.create(row);
        if(!createdRow){
            return false;
        }
        E2eSeedAndRestoreEndpoints.fetchGroupEntries(E2eSeedAndRestoreEndpoints.createdRows, groupKey).push({
            entityKey,
            id: createdRow[repository.idColumn()]
        });
        return createdRow;
    }

    static async updateCreatedRow(serverManager, groupKey, entityKey, id, patch)
    {
        let groupCreatedRows = sc.get(E2eSeedAndRestoreEndpoints.createdRows, groupKey, []);
        if(!groupCreatedRows.some(createdRow => entityKey === createdRow.entityKey && id === createdRow.id)){
            Logger.warning('[e2e-seed-and-restore] Only the rows created by the group can be updated.', {entityKey, id});
            return false;
        }
        return await serverManager.dataServer.getEntity(entityKey).updateById(id, patch);
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

    static async updateWithPreserve(serverManager, groupKey, entityKey, filters, patch)
    {
        await E2eSeedAndRestoreEndpoints.preserveRows(serverManager, groupKey, entityKey, filters);
        return await serverManager.dataServer.getEntity(entityKey).update(filters, patch);
    }

    static async restorePreservedRows(serverManager, preservedEntry)
    {
        let repository = serverManager.dataServer.getEntity(preservedEntry.entityKey);
        let idColumn = repository.idColumn();
        let preservedIds = preservedEntry.rows.map(row => row[idColumn]);
        let currentIds = [];
        for(let currentRow of await repository.load(preservedEntry.filters)){
            if(!preservedIds.includes(currentRow[idColumn])){
                await repository.deleteById(currentRow[idColumn]);
                continue;
            }
            currentIds.push(currentRow[idColumn]);
        }
        for(let row of preservedEntry.rows){
            if(!currentIds.includes(row[idColumn])){
                await repository.create(TestDataSetup.copyRow(row, {[idColumn]: row[idColumn]}));
                continue;
            }
            await repository.updateById(row[idColumn], TestDataSetup.copyRow(row, {}));
        }
    }

    static overrideConfigValue(serverManager, groupKey, path, value, removeValue = false)
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
        if(removeValue){
            delete configPosition.configNode[configPosition.lastKey];
            return;
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

    static async reloadLoadedConfig(serverManager)
    {
        let actionsPlugin = serverManager.featuresManager.featuresList.actions.package;
        await actionsPlugin.playerDeathRelocator.loadTownRoom(serverManager.roomsManager);
        actionsPlugin.playerDeathRelocator.loadConfig();
        actionsPlugin.roomAutoRecovery.loadConfig();
        let scoresPlugin = serverManager.featuresManager.featuresList.scores.package;
        scoresPlugin.increaseScoreOnKill = new IncreaseScoreOnKill({
            config: scoresPlugin.config,
            dataServer: scoresPlugin.dataServer
        });
        scoresPlugin.createScoresRoute.loadConfig();
        serverManager.loginManager.playerCreation = serverManager.loginManager.createPlayerCreation();
        let updatedBattles = BattlesLoadedConfig.applyGameOverTimeOut(serverManager);
        let isGateUpdated = ResurrectionAdLoadedConfig.applyGateValues(serverManager);
        RoomsServerValidationFlagRefresher.apply(serverManager);
        Logger.debug('E2e loaded config reload: '+updatedBattles+' live battles, resurrection ad gate: '+isGateUpdated);
    }

    static async reloadRooms(serverManager, roomsNames)
    {
        let roomsManager = serverManager.roomsManager;
        roomsManager.loadedRooms = false;
        await roomsManager.loadRooms();
        let configManager = serverManager.configManager;
        let roomsServers = configManager.client.rooms.servers;
        let defaultServerUrl = configManager.get('server/publicUrl') || configManager.get('server/baseUrl');
        for(let roomName of Object.keys(roomsManager.definedRooms)){
            let roomModel = sc.get(roomsManager.loadedRoomsByName, roomName, false);
            if(roomModel){
                roomsManager.definedRooms[roomName].roomProps.roomData = roomModel;
                roomsServers[roomName] = roomModel.serverUrl || defaultServerUrl;
            }
        }
        let otherServersUrls = ServersSignedRequestsState.reloadOtherServersUrls(serverManager, roomsServers);
        Logger.debug('E2e rooms reload, the other servers are now: '+otherServersUrls.join(', '));
        for(let roomName of roomsNames){
            let room = RoomObjectsState.findRoom(serverManager, roomName);
            if(room){
                await room.disconnect();
            }
        }
    }

    static async reloadSkills(serverManager)
    {
        let actionsPackage = serverManager.featuresManager.featuresList.actions.package;
        await DataLoader.enrichConfig(serverManager.configManager, actionsPackage.skillsModelsManager, serverManager.dataServer);
        actionsPackage.initialGameDataEnricher.classesData = false;
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
        await E2eSeedAndRestoreEndpoints.reloadLoadedConfig(serverManager);
        if(E2eSeedAndRestoreEndpoints.reloadLocalesGroups.includes(groupKey)){
            E2eSeedAndRestoreEndpoints.reloadLocalesGroups.splice(
                E2eSeedAndRestoreEndpoints.reloadLocalesGroups.indexOf(groupKey),
                1
            );
            await E2eSeedAndRestoreEndpoints.reloadLocales(serverManager);
        }
        if(sc.hasOwn(E2eSeedAndRestoreEndpoints.reloadRoomsGroups, groupKey)){
            await E2eSeedAndRestoreEndpoints.reloadRooms(
                serverManager,
                E2eSeedAndRestoreEndpoints.reloadRoomsGroups[groupKey]
            );
            delete E2eSeedAndRestoreEndpoints.reloadRoomsGroups[groupKey];
        }
        if(sc.hasOwn(E2eSeedAndRestoreEndpoints.reloadSkillsGroups, groupKey)){
            await E2eSeedAndRestoreEndpoints.reloadSkills(serverManager);
            delete E2eSeedAndRestoreEndpoints.reloadSkillsGroups[groupKey];
        }
        Logger.info('[e2e-seed-and-restore] Rows and config values restored for group: '+groupKey);
    }

    static async resetAllGroups(serverManager)
    {
        let groupsKeys = [
            ...Object.keys(E2eSeedAndRestoreEndpoints.createdRows),
            ...Object.keys(E2eSeedAndRestoreEndpoints.preservedRows),
            ...Object.keys(E2eSeedAndRestoreEndpoints.originalConfigValues),
            ...E2eSeedAndRestoreEndpoints.reloadLocalesGroups,
            ...Object.keys(E2eSeedAndRestoreEndpoints.reloadRoomsGroups)
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
        app.post('/api/e2e/data/update-created', async (request, response) => {
            response.json({
                updated: await E2eSeedAndRestoreEndpoints.updateCreatedRow(
                    serverManager,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'entityKey', ''),
                    sc.get(request.body, 'id', 0),
                    sc.get(request.body, 'patch', {})
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
        app.post('/api/e2e/data/update-with-preserve', async (request, response) => {
            response.json({
                updated: await E2eSeedAndRestoreEndpoints.updateWithPreserve(
                    serverManager,
                    sc.get(request.body, 'group', ''),
                    sc.get(request.body, 'entityKey', ''),
                    sc.get(request.body, 'filters', {}),
                    sc.get(request.body, 'patch', {})
                )
            });
        });
        app.post('/api/e2e/data/load', async (request, response) => {
            let repository = serverManager.dataServer.getEntity(sc.get(request.body, 'entityKey', ''));
            response.json({rows: await repository.load(sc.get(request.body, 'filters', {}))});
        });
        app.post('/api/e2e/data/config', async (request, response) => {
            E2eSeedAndRestoreEndpoints.overrideConfigValue(
                serverManager,
                sc.get(request.body, 'group', ''),
                sc.get(request.body, 'path', ''),
                sc.get(request.body, 'value', null),
                true === sc.get(request.body, 'remove', false)
            );
            await E2eSeedAndRestoreEndpoints.reloadLoadedConfig(serverManager);
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
        app.post('/api/e2e/data/reload-rooms', async (request, response) => {
            let roomsNames = sc.get(request.body, 'roomsNames', []);
            E2eSeedAndRestoreEndpoints.reloadRoomsGroups[sc.get(request.body, 'group', '')] = roomsNames;
            await E2eSeedAndRestoreEndpoints.reloadRooms(serverManager, roomsNames);
            response.json({ok: true});
        });
        app.post('/api/e2e/data/reload-skills', async (request, response) => {
            E2eSeedAndRestoreEndpoints.reloadSkillsGroups[sc.get(request.body, 'group', '')] = true;
            await E2eSeedAndRestoreEndpoints.reloadSkills(serverManager);
            response.json({ok: true});
        });
        Logger.info('[e2e-seed-and-restore] Data endpoints registered.');
    }

}

module.exports.E2eSeedAndRestoreEndpoints = E2eSeedAndRestoreEndpoints;
