/**
 *
 * Reldens - Merchant
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 *
 */

const { NpcObject } = require('reldens/packages/objects/server/npc-object');
const { GameConst } = require('reldens/packages/game/constants');
const { Logger } = require('@reldens/utils');

class Merchant extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.runOnAction = true;
        this.playerVisible = true;
        // assign extra params:
        this.clientParams.enabled = true;
        this.clientParams.ui = true;
        // @TODO: all the npc info will be coming from the storage.
        this.content = 'Hi there! Do you want a coin? These are useless test coins.';
        this.options = {
            option1: {label: 'Sure!', value: 1},
            option2: {label: 'No, thank you.', value: 0}
        }
    }

    parseMessageAndRunActions(client, data, room, playerSchema)
    {
        super.parseMessageAndRunActions(client, data, room, playerSchema);
        if(data.act === GameConst.BUTTON_OPTION && data.id === this.id){
            if(Number(data.value) === 1){
                let coin = playerSchema.inventory.createItemInstance('coins');
                playerSchema.inventory.manager.addItem(coin).catch((err) => {
                    Logger.error(['Error while adding item "coins":', err]);
                });
                let activationData = {act: GameConst.UI, id: this.id, content: 'All yours!'};
                room.send(client, activationData);
            } else {
                let activationData = {act: GameConst.UI, id: this.id, content: 'Ok...'};
                room.send(client, activationData);
            }
        }
    }

}

module.exports.Merchant = Merchant;
