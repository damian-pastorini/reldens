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
 *
 */

const { ParallelSpecGroups } = require('./parallel-spec-groups');
const { Logger } = require('@reldens/utils');

class TestDataSetup
{

    static USER_ROWS_ENTITY = {entityKey: 'usersLocale', ownerField: 'user_id'};
    static PLAYER_ROWS_ENTITIES = [
        {entityKey: 'playersState', ownerField: 'player_id'},
        {entityKey: 'playersStats', ownerField: 'player_id'},
        {entityKey: 'skillsOwnersClassPath', ownerField: 'owner_id'},
        {entityKey: 'itemsInventory', ownerField: 'owner_id'}
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
        for(let playerRowsEntity of TestDataSetup.PLAYER_ROWS_ENTITIES){
            await TestDataSetup.copyRows(dataServer, playerRowsEntity, basePlayer.id, createdPlayer.id);
        }
        Logger.info('[test-data-setup] Created '+user.username+' / '+user.playerName+' from '+baseUser.username+'.');
        return true;
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

}

module.exports.TestDataSetup = TestDataSetup;
