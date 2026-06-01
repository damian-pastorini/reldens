/**
 *
 * Reldens - Collect Game Data
 *
 * Playwright globalSetup: boots the game server, collects player and object data, writes game-data.json.
 *
 */

const { createRequire } = require('module');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');
const { GameDataSkills } = require('./helpers/game-data-skills');
const { PlayerStateReset } = require('./helpers/player-state-reset');
const { TestDataSetup } = require('./helpers/test-data-setup');

class CollectGameData
{
    static ITEM_EQUIPPABLE_TYPES = [1, 4];
    static ITEM_CONSUMABLE_TYPES = [2, 5];
    static OBJECT_TYPE_ENEMY = 4;
    static OBJECT_TYPE_NPC = 3;
    static OBJECT_TYPE_TRADER = 5;
    static serverManager = null;

    static loadConfig()
    {
        let configPath = FileHandler.joinPaths(process.cwd(), 'tests', 'config.json');
        if(!FileHandler.exists(configPath)) {
            return null;
        }
        return FileHandler.fetchFileJson(configPath);
    }

    static loadServerModules(serverPath)
    {
        let serverRequire = createRequire(serverPath+'/package.json');
        let { ServerManager } = serverRequire('reldens/server');
        let { ObjectsManager } = serverRequire('reldens/lib/objects/server/manager');
        let pluginPath = serverPath+'/theme/plugins/server-plugin';
        let ServerPlugin = null;
        if(FileHandler.exists(pluginPath+'.js')) {
            ServerPlugin = serverRequire(pluginPath).ServerPlugin;
        }
        return { ServerManager, ServerPlugin, ObjectsManager };
    }

    static extractItemsData(configManager)
    {
        let items = configManager.inventory && configManager.inventory.items;
        if(!items) {
            return { firstEquippable: null, firstConsumable: null };
        }
        let firstEquippable = null;
        let firstConsumable = null;
        for(let key of Object.keys(items)) {
            let itemType = items[key].data.type;
            if(!firstEquippable && CollectGameData.ITEM_EQUIPPABLE_TYPES.includes(itemType)) {
                firstEquippable = key;
            }
            if(!firstConsumable && CollectGameData.ITEM_CONSUMABLE_TYPES.includes(itemType)) {
                firstConsumable = key;
            }
        }
        return { firstEquippable, firstConsumable };
    }

    static async fetchPlayerForUser(dataServer, userConfig)
    {
        let user = await dataServer.getEntity('users').loadOneBy('username', userConfig.username);
        if(!user) {
            Logger.warning('[collect-game-data] User not found: '+userConfig.username);
            return null;
        }
        let players = await dataServer.getEntity('players').loadBy('user_id', user.id);
        if(!players || !players.length) {
            Logger.warning('[collect-game-data] No players for user: '+userConfig.username);
            return null;
        }
        return {
            player: players.find(p => p.name === userConfig.playerName) || players[0],
            playerState: await dataServer.getEntity('playersState').loadOneBy(
                'player_id',
                (players.find(p => p.name === userConfig.playerName) || players[0]).id
            )
        };
    }

    static async collectPlayerInfo(dataServer, configManager, userConfig)
    {
        let playerData = await CollectGameData.fetchPlayerForUser(dataServer, userConfig);
        if(!playerData) {
            return null;
        }
        let classPath = await dataServer.getEntity('skillsOwnersClassPath').loadOneBy('owner_id', playerData.player.id);
        let classPathId = classPath ? classPath.class_path_id : null;
        let currentLevel = classPath ? classPath.currentLevel : 0;
        let currentExp = classPath ? classPath.currentExp : 0;
        return {
            name: playerData.player.name,
            roomId: playerData.playerState ? playerData.playerState.room_id : null,
            classPathId: classPathId,
            currentLevel: currentLevel,
            currentExp: currentExp,
            skills: classPathId
                ? GameDataSkills.resolvePlayerSkillsForClassPath(configManager, classPathId, currentLevel)
                : [],
            skillsByType: GameDataSkills.classifySkillEntries(classPathId
                ? GameDataSkills.resolvePlayerSkillsForClassPath(configManager, classPathId, currentLevel)
                : [])
        };
    }

    static async collectRoomObjects(dataServer, events, configManager, ObjectsManager, roomId)
    {
        let objManager = new ObjectsManager({
            config: configManager,
            events: events,
            dataServer: dataServer,
            roomId: roomId,
            roomName: ''
        });
        await objManager.loadObjectsByRoomId(roomId);
        if(!objManager.roomObjectsData) {
            return { enemies: [], npcs: [], traders: [] };
        }
        let enemies = [];
        let npcs = [];
        let traders = [];
        for(let roomObject of objManager.roomObjectsData) {
            let assets = roomObject.related_objects_assets;
            let assetKey = assets && assets[0] ? assets[0].asset_key : null;
            let entry = { assetKey, objectId: roomObject.id, objectClassKey: roomObject.object_class_key };
            if(CollectGameData.OBJECT_TYPE_ENEMY === roomObject.class_type) {
                enemies.push(entry);
            }
            if(CollectGameData.OBJECT_TYPE_NPC === roomObject.class_type) {
                npcs.push(entry);
            }
            if(CollectGameData.OBJECT_TYPE_TRADER === roomObject.class_type) {
                traders.push(entry);
            }
        }
        return { enemies, npcs, traders };
    }

    static async buildPlayersData(dataServer, configManager, config)
    {
        let testUsers = [
            { username: config.e2eUsername || 'root', playerName: config.e2ePlayerName || 'ImRoot', key: 'root' },
            { username: config.e2eUsername2 || 'root2', playerName: config.e2ePlayerName2 || 'ImRoot2', key: 'root2' },
            { username: config.e2eUsername3 || 'root3', playerName: config.e2ePlayerName3 || 'ImRoot3', key: 'root3' }
        ];
        let players = {};
        for(let userConfig of testUsers) {
            let playerInfo = await CollectGameData.collectPlayerInfo(dataServer, configManager, userConfig);
            if(!playerInfo) {
                continue;
            }
            players[userConfig.key] = playerInfo;
        }
        return players;
    }

    static async buildRoomsData(dataServer, events, configManager, ObjectsManager, players)
    {
        let rooms = {};
        let seenRoomIds = {};
        for(let key of Object.keys(players)) {
            let roomId = players[key].roomId;
            if(!roomId || seenRoomIds[roomId]) {
                continue;
            }
            seenRoomIds[roomId] = true;
            let roomData = await CollectGameData.collectRoomObjects(
                dataServer,
                events,
                configManager,
                ObjectsManager,
                roomId
            );
            rooms[String(roomId)] = roomData;
        }
        return rooms;
    }

    static attachEventListeners(serverManager)
    {
        let eventsFilePath = FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'server-events.jsonl');
        if(FileHandler.exists(eventsFilePath)) {
            FileHandler.writeFile(eventsFilePath, '');
        }
        let eventNames = [
            'reldens.roomCreated',
            'reldens.playerJoined',
            'reldens.playerLeft',
            'reldens.startGameAfter'
        ];
        for(let eventName of eventNames) {
            serverManager.events.on(eventName, (data) => {
                let record = JSON.stringify({ ts: Date.now(), event: eventName, data: data || {} });
                FileHandler.appendToFile(eventsFilePath, record+'\n');
            });
        }
    }

    static async runDataCollection(serverManager, ObjectsManager, config)
    {
        let itemsData = CollectGameData.extractItemsData(serverManager.configManager);
        let players = await CollectGameData.buildPlayersData(
            serverManager.dataServer,
            serverManager.configManager,
            config
        );
        let rooms = await CollectGameData.buildRoomsData(
            serverManager.dataServer,
            serverManager.events,
            serverManager.configManager,
            ObjectsManager,
            players
        );
        let gameData = { players, rooms, items: itemsData };
        let outputPath = FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'game-data.json');
        FileHandler.writeFile(outputPath, JSON.stringify(gameData, null, 4));
        Logger.info('[collect-game-data] Written: '+outputPath);
        CollectGameData.attachEventListeners(serverManager);
        await TestDataSetup.ensureRequiredItems(serverManager.dataServer, config);
        let snapshots = await PlayerStateReset.captureSnapshots(serverManager.dataServer, config);
        PlayerStateReset.registerResetEndpoint(serverManager, snapshots, config);
        CollectGameData.serverManager = serverManager;
    }

    static async ensureRequiredFeatures(serverManager)
    {
        let required = [
            { id: 19, code: 'quests', title: 'Quests' }
        ];
        let featuresRepo = serverManager.dataServer.getEntity('features');
        for(let entry of required){
            let existing = await featuresRepo.loadOneBy('code', entry.code);
            if(existing){
                if(1 !== existing.is_enabled){
                    await featuresRepo.updateById(existing.id, { 'is_enabled': 1 });
                    Logger.info('[collect-game-data] Enabled feature: '+entry.code);
                }
                continue;
            }
            await featuresRepo.create({
                id: entry.id,
                code: entry.code,
                title: entry.title,
                'is_enabled': 1
            });
            Logger.info('[collect-game-data] Created feature row: '+entry.code);
        }
    }

    static async startServerAndCollect(serverPath)
    {
        let config = CollectGameData.loadConfig();
        if(!config) {
            Logger.warning('[collect-game-data] No tests/config.json found, skipping.');
            return;
        }
        if(!FileHandler.exists(serverPath)) {
            Logger.warning('[collect-game-data] serverPath not found: '+serverPath+', skipping.');
            return;
        }
        let modules = CollectGameData.loadServerModules(serverPath);
        let serverConfig = { projectRoot: serverPath };
        if(modules.ServerPlugin) {
            serverConfig.customPlugin = modules.ServerPlugin;
        }
        process.env.RELDENS_ALLOW_RUN_BUNDLER = '0';
        process.env.RELDENS_ALLOW_BUILD_CLIENT = '0';
        process.env.RELDENS_ALLOW_BUILD_CSS = '0';
        let effectivePort = process.env.RELDENS_E2E_PORT || config.port;
        if(effectivePort) {
            let portStr = String(effectivePort);
            let publicUrl = process.env.RELDENS_E2E_PORT ? 'http://localhost:'+portStr : (config.baseUrl || 'http://localhost:'+portStr);
            process.env.PORT = portStr;
            process.env.RELDENS_APP_PORT = portStr;
            process.env.RELDENS_PUBLIC_URL = publicUrl;
        }
        let serverManager = new modules.ServerManager(serverConfig);
        serverManager.events.on('reldens.beforeInitializeManagers', async (event) => {
            await CollectGameData.ensureRequiredFeatures(event.serverManager);
        });
        process.stdout.write('Server: creating HTTP server...\n');
        await serverManager.createServers();
        process.stdout.write('Server: starting game server (this may take a moment)...\n');
        await serverManager.start();
        process.stdout.write('Server: collecting game data...\n');
        await CollectGameData.runDataCollection(serverManager, modules.ObjectsManager, config);
        process.stdout.write('Server: ready\n\n');
    }

    static setupLogCapture()
    {
        let logPath = FileHandler.joinPaths(process.cwd(), 'test-results', 'server.log');
        FileHandler.createFolder(FileHandler.joinPaths(process.cwd(), 'test-results'));
        FileHandler.writeFile(logPath, '');
        Logger.callback = (...args) => {
            FileHandler.appendToFile(logPath, args.map(a => 'object' === typeof a ? JSON.stringify(a) : ''+a).join(' ')+'\n');
        };
        console.log = () => {
        };
        console.error = () => {
        };
    }

    static async run()
    {
        let config = CollectGameData.loadConfig();
        if(!config || !config.serverPath) {
            Logger.warning('[collect-game-data] serverPath not configured, skipping server startup.');
            return;
        }
        process.stdout.write('Server: setting up log capture...\n');
        CollectGameData.setupLogCapture();
        await CollectGameData.startServerAndCollect(config.serverPath);
    }
}

module.exports = async function()
{
    await CollectGameData.run();
};

module.exports.CollectGameData = CollectGameData;
