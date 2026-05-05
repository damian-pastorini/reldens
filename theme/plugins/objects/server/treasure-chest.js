/**
 *
 * Reldens - TreasureChest
 *
 */

const { NpcObject } = require('reldens/lib/objects/server/object/type/npc-object');
const { GameConst } = require('reldens/lib/game/constants');

class TreasureChest extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.isLooted = false;
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        if(false === this.isValidId(data)){
            return false;
        }
        if(false === this.isObjectInteractionMessage(data)){
            return false;
        }
        if(false === this.isValidInteraction(playerSchema.state.x, playerSchema.state.y)){
            this.outOfReachClose(client);
            return false;
        }
        if(this.isLooted){
            client.send(
                '*',
                {act: GameConst.UI, id: this.id, title: this.title, content: 'The chest is empty.', opened: true}
            );
            return false;
        }
        let questsModels = await this.dataServer.getEntity('questsProgress').loadBy('quest_key', this.key);
        if(questsModels && questsModels.length > 0){
            this.isLooted = true;
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
        await this.dataServer.getEntity('questsProgress').create({quest_key: this.key});
        this.isLooted = true;
        client.send(
            '*',
            {act: GameConst.UI, id: this.id, title: this.title, content: 'You found a coin!', opened: true}
        );
        return true;
    }

}

module.exports.TreasureChest = TreasureChest;
