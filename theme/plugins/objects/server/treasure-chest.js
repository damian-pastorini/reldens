/**
 *
 * Reldens - TreasureChest
 *
 * Gives one coin to each player that loots it, stored as a quests progress row. A dead or disabled player or one out of
 * reach loots nothing, and a player loots one message at a time: the messages that arrive while its loot is still
 * reading or storing the progress row are ignored, so two messages in the same tick never give two coins.
 *
 */

const { NpcObject } = require('reldens/lib/objects/server/object/type/npc-object');
const { GameConst } = require('reldens/lib/game/constants');
const { Logger } = require('@reldens/utils');

class TreasureChest extends NpcObject
{

    lootingPlayersIds = [];

    async executeMessageActions(client, data, room, playerSchema)
    {
        if(
            false === this.isValidPlayerInteraction(client, data, playerSchema)
            || this.lootingPlayersIds.includes(playerSchema.player_id)
        ){
            return false;
        }
        this.lootingPlayersIds.push(playerSchema.player_id);
        let lootResult = false;
        try {
            lootResult = await this.lootChest(client, playerSchema);
        } catch(error) {
            Logger.error('Treasure chest "'+this.key+'" loot error: '+error.message);
        }
        this.lootingPlayersIds.splice(this.lootingPlayersIds.indexOf(playerSchema.player_id), 1);
        return lootResult;
    }

    async lootChest(client, playerSchema)
    {
        let questModel = await this.dataServer.getEntity('questsProgress').loadOne(
            {quest_key: this.key, player_id: playerSchema.player_id}
        );
        if(questModel){
            client.send(
                '*',
                {act: GameConst.UI, id: this.id, title: this.title, content: 'The chest is empty.', opened: true}
            );
            return false;
        }
        let newCoin = playerSchema.inventory.manager.createItemInstance('coins');
        if(false === await playerSchema.inventory.manager.addItem(newCoin)){
            client.send('*', {act: GameConst.UI, id: this.id, title: this.title, content: 'The chest seems stuck...'});
            return false;
        }
        await this.dataServer.getEntity('questsProgress').create(
            {quest_key: this.key, player_id: playerSchema.player_id}
        );
        client.send(
            '*',
            {act: GameConst.UI, id: this.id, title: this.title, content: 'You found a coin!', opened: true}
        );
        return true;
    }

}

module.exports.TreasureChest = TreasureChest;
