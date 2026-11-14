/**
 *
 * Reldens - Test Data Setup
 *
 * Prepares the test players before the snapshots are captured, once at global setup time: creates the test users of
 * every parallel spec group users set that does not exist yet, as a copy of the user of the same slot in the users set 0
 * (tests/config.json): the user (same password, role and status), its locale, its player and the player state, stats,
 * class path (level and experience) and inventory, so every group logs in with players that have the same data as the
 * configured ones (the users created by a previous run on the same database are kept); then ensures the required test
 * items exist in the inventory of every test player.
 * It also prepares the disposable rooms the admin rooms live deletion spec deletes, so the spec never deletes a sample
 * data room and every run starts with them whatever the last run deleted: before the game server loads the maps, every
 * disposable room map is written from the map of its base sample room (the tileset image renamed to the disposable
 * room image) next to a copy of that image, in the tested app theme maps folder (the rooms bucket a room delete removes
 * the files from) and in the app dist maps folder (the client loads the maps from it); before the rooms are defined,
 * every missing disposable room is created as a copy of its base sample room with its change and return points. The
 * disposable rooms and files names end with the isolated instance name, so the instances running from the same app
 * never remove the files of another one.
 *
 */

const { ParallelSpecGroups } = require('./parallel-spec-groups');
const { E2eInstance } = require('./e2e-instance');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TestDataSetup
{

    static USER_ROWS_ENTITY = {entityKey: 'usersLocale', ownerField: 'user_id'};
    static PLAYER_ROWS_ENTITIES = [
        {entityKey: 'playersState', ownerField: 'player_id'},
        {entityKey: 'playersStats', ownerField: 'player_id'},
        {entityKey: 'skillsOwnersClassPath', ownerField: 'owner_id'},
        {entityKey: 'itemsInventory', ownerField: 'owner_id'}
    ];
    static PLAYERS_ROOM_KEY = 'players';
    static UNLINKED_ROOM_KEY = 'unlinked';
    static DISPOSABLE_ROOM_NAME_PREFIX = 'e2e-deleted-room-';
    static DISPOSABLE_BASE_ROOMS_NAMES = {
        [TestDataSetup.PLAYERS_ROOM_KEY]: 'reldens-new-age-town-house-05',
        [TestDataSetup.UNLINKED_ROOM_KEY]: 'reldens-new-age-town-house-04'
    };
    static ROOM_ROWS_ENTITIES = [
        {entityKey: 'roomsChangePoints', ownerField: 'room_id'},
        {entityKey: 'roomsReturnPoints', ownerField: 'room_id'}
    ];

    static async ensurePlayerHasItem(dataServer, playerId, itemKey, qty)
    {
        let item = await dataServer.getEntity('itemsItem').loadOneBy('key', itemKey);
        if(!item){
            Logger.warning('[test-data-setup] Item not found in catalog: '+itemKey);
            return;
        }
        let existing = await dataServer.getEntity('itemsInventory').loadBy('owner_id', playerId);
        let match = existing && existing.find(i => i.item_id === item.id);
        if(match){
            await dataServer.getEntity('itemsInventory').updateById(match.id, {
                qty: qty,
                'is_active': 0,
                remaining_uses: 0
            });
            Logger.info('[test-data-setup] Refreshed "'+itemKey+'" for player '+playerId+' (qty='+qty+')');
            return;
        }
        await dataServer.getEntity('itemsInventory').create({
            owner_id: playerId,
            item_id: item.id,
            qty: qty,
            remaining_uses: 0,
            'is_active': 0
        });
        Logger.info('[test-data-setup] Added "'+itemKey+'" to player '+playerId);
    }

    static async ensurePlayerItems(dataServer, username, playerName, config)
    {
        let user = await dataServer.getEntity('users').loadOneBy('username', username);
        if(!user){
            return;
        }
        let players = await dataServer.getEntity('players').loadBy('user_id', user.id);
        if(!players || !players.length){
            return;
        }
        let matched = players.find(p => p.name === playerName) || players[0];
        let playerId = matched.id;
        Logger.info('[test-data-setup] Ensuring items for player: '+matched.name+' (id: '+playerId+')');
        if(config.e2eEquipableItemId){
            await TestDataSetup.ensurePlayerHasItem(dataServer, playerId, config.e2eEquipableItemId, 1);
        }
        if(config.e2eConsumableItemId){
            await TestDataSetup.ensurePlayerHasItem(dataServer, playerId, config.e2eConsumableItemId, 5);
        }
    }

    static async ensureRequiredItems(dataServer, config, users = ParallelSpecGroups.fetchAllUsers(config))
    {
        for(let entry of users){
            await TestDataSetup.ensurePlayerItems(dataServer, entry.username, entry.playerName, config);
        }
    }

    static async createGroupsUsers(dataServer, config)
    {
        let baseUsers = ParallelSpecGroups.fetchSetUsers(config, 0);
        let createdCount = 0;
        for(let user of ParallelSpecGroups.fetchAllUsers(config).slice(baseUsers.length)){
            if(await TestDataSetup.cloneUser(dataServer, baseUsers[user.baseSlot], user)){
                createdCount++;
            }
        }
        Logger.info('[test-data-setup] Created '+createdCount+' parallel spec groups test users.');
        return createdCount;
    }

    static async cloneUser(dataServer, baseUser, user)
    {
        let usersRepository = dataServer.getEntity('users');
        if(await usersRepository.loadOneBy('username', user.username)){
            return false;
        }
        let baseUserModel = await usersRepository.loadOneBy('username', baseUser.username);
        if(!baseUserModel){
            Logger.error('[test-data-setup] Base user not found: '+baseUser.username);
            return false;
        }
        let basePlayer = (await dataServer.getEntity('players').loadBy('user_id', baseUserModel.id) || []).find(
            player => baseUser.playerName === player.name
        );
        if(!basePlayer){
            Logger.error('[test-data-setup] Base player not found: '+baseUser.playerName);
            return false;
        }
        let createdUser = await usersRepository.create(TestDataSetup.copyRow(baseUserModel, {
            username: user.username,
            email: user.username+'@'+[...String(baseUserModel.email).split('@')].pop()
        }));
        await TestDataSetup.copyRows(dataServer, TestDataSetup.USER_ROWS_ENTITY, baseUserModel.id, createdUser.id);
        let createdPlayer = await dataServer.getEntity('players').create(TestDataSetup.copyRow(basePlayer, {
            user_id: createdUser.id,
            name: user.playerName
        }));
        await TestDataSetup.copyEntitiesRows(dataServer, TestDataSetup.PLAYER_ROWS_ENTITIES, basePlayer.id, createdPlayer.id);
        Logger.info('[test-data-setup] Created '+user.username+' / '+user.playerName+' from '+baseUser.username+'.');
        return true;
    }

    static async copyEntitiesRows(dataServer, rowsEntities, baseOwnerId, ownerId)
    {
        for(let rowsEntity of rowsEntities){
            await TestDataSetup.copyRows(dataServer, rowsEntity, baseOwnerId, ownerId);
        }
    }

    static async copyRows(dataServer, rowsEntity, baseOwnerId, ownerId)
    {
        let repository = dataServer.getEntity(rowsEntity.entityKey);
        for(let row of await repository.loadBy(rowsEntity.ownerField, baseOwnerId) || []){
            await repository.create(TestDataSetup.copyRow(row, {[rowsEntity.ownerField]: ownerId}));
        }
    }

    static copyRow(row, overrides)
    {
        let copy = {};
        for(let fieldKey of Object.keys(row)){
            if('id' === fieldKey){
                continue;
            }
            copy[fieldKey] = row[fieldKey];
        }
        return Object.assign(copy, overrides);
    }

    static disposableRoomName(roomKey)
    {
        return TestDataSetup.DISPOSABLE_ROOM_NAME_PREFIX+roomKey
            +('' === E2eInstance.instanceName ? '' : '-'+E2eInstance.instanceName);
    }

    static writeDisposableRoomsMaps(serverPath, themeName)
    {
        let baseMapsPath = FileHandler.joinPaths(process.cwd(), 'theme', 'default', 'assets', 'maps');
        let mapsPaths = [
            FileHandler.joinPaths(serverPath, 'theme', themeName, 'assets', 'maps'),
            FileHandler.joinPaths(serverPath, 'dist', 'assets', 'maps')
        ];
        for(let roomKey of Object.keys(TestDataSetup.DISPOSABLE_BASE_ROOMS_NAMES)){
            TestDataSetup.writeDisposableRoomMaps(baseMapsPath, mapsPaths, roomKey);
        }
    }

    static writeDisposableRoomMaps(baseMapsPath, mapsPaths, roomKey)
    {
        let baseRoomName = TestDataSetup.DISPOSABLE_BASE_ROOMS_NAMES[roomKey];
        let roomName = TestDataSetup.disposableRoomName(roomKey);
        let mapJson = FileHandler.fetchFileJson(FileHandler.joinPaths(baseMapsPath, baseRoomName+'.json'));
        if(!mapJson){
            Logger.error('[test-data-setup] Base room map not loaded: '+baseRoomName, FileHandler.error);
            return false;
        }
        TestDataSetup.renameTilesetsImage(mapJson.tilesets, baseRoomName+'.png', roomName+'.png');
        for(let mapsPath of mapsPaths){
            if(
                !FileHandler.writeFile(FileHandler.joinPaths(mapsPath, roomName+'.json'), sc.toJsonString(mapJson))
                || !FileHandler.copyFile(
                    FileHandler.joinPaths(baseMapsPath, baseRoomName+'.png'),
                    FileHandler.joinPaths(mapsPath, roomName+'.png')
                )
            ){
                Logger.error('[test-data-setup] Disposable room map files not written: '+roomName, FileHandler.error);
            }
        }
        return true;
    }

    static renameTilesetsImage(tilesets, baseImage, image)
    {
        for(let tileset of tilesets){
            if(baseImage === tileset.image){
                tileset.image = image;
            }
        }
    }

    static async createDisposableRooms(dataServer)
    {
        let createdCount = 0;
        for(let roomKey of Object.keys(TestDataSetup.DISPOSABLE_BASE_ROOMS_NAMES)){
            if(await TestDataSetup.createDisposableRoom(dataServer, roomKey)){
                createdCount++;
            }
        }
        Logger.info('[test-data-setup] Created '+createdCount+' disposable rooms.');
        return createdCount;
    }

    static async createDisposableRoom(dataServer, roomKey)
    {
        let roomsRepository = dataServer.getEntity('rooms');
        let roomName = TestDataSetup.disposableRoomName(roomKey);
        if(await roomsRepository.loadOneBy('name', roomName)){
            return false;
        }
        let baseRoomName = TestDataSetup.DISPOSABLE_BASE_ROOMS_NAMES[roomKey];
        let baseRoom = await roomsRepository.loadOneBy('name', baseRoomName);
        if(!baseRoom){
            Logger.error('[test-data-setup] Base room not found: '+baseRoomName);
            return false;
        }
        let createdRoom = await roomsRepository.create(TestDataSetup.copyRow(baseRoom, {
            name: roomName,
            title: roomName,
            map_filename: roomName+'.json',
            scene_images: roomName+'.png'
        }));
        await TestDataSetup.copyEntitiesRows(dataServer, TestDataSetup.ROOM_ROWS_ENTITIES, baseRoom.id, createdRoom.id);
        Logger.info('[test-data-setup] Created '+roomName+' from '+baseRoomName+'.');
        return true;
    }

}

module.exports.TestDataSetup = TestDataSetup;
