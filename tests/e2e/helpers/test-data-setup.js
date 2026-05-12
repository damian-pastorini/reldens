/**
 *
 * Reldens - Test Data Setup
 *
 * Ensures the required test items exist in the root player's inventory
 * before snapshots are captured. Runs once at global setup time.
 *
 */

const { Logger } = require('@reldens/utils');

class TestDataSetup
{

    static async ensurePlayerHasItem(dataServer, playerId, itemKey, qty)
    {
        let item = await dataServer.getEntity('itemsItem').loadOneBy('key', itemKey);
        if(!item){
            Logger.warning('[test-data-setup] Item not found in catalog: '+itemKey);
            return;
        }
        let existing = await dataServer.getEntity('itemsInventory').loadBy('owner_id', playerId);
        if(existing && existing.find(i => i.item_id === item.id)){
            return;
        }
        await dataServer.getEntity('itemsInventory').create({
            owner_id: playerId,
            item_id: item.id,
            qty: qty,
            remaining_uses: 0,
            is_active: 0
        });
        Logger.info('[test-data-setup] Added "'+itemKey+'" to player '+playerId);
    }

    static async ensureRequiredItems(dataServer, config)
    {
        let user = await dataServer.getEntity('users').loadOneBy('username', config.e2eUsername || 'root');
        if(!user){
            return;
        }
        let players = await dataServer.getEntity('players').loadBy('user_id', user.id);
        if(!players || !players.length){
            return;
        }
        let playerName = config.e2ePlayerName || 'ImRoot';
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

}

module.exports.TestDataSetup = TestDataSetup;
