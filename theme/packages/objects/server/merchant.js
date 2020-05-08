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
const { Coin } = require('../../inventory/items/coin');

class Merchant extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.runOnAction = true;
        this.playerVisible = true;
        // assign extra params:
        this.clientParams.enabled = true;
        // @TODO: all the npc info will be coming from the storage.
        this.clientParams.ui = true;
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
                // @TODO: server MUST LOAD all the items available, so we can later can create items instances easier.
                let itemProps = {
                    id: 1,
                    key: 'coins',
                    manager: playerSchema.inventory.manager,
                    label: 'Coins',
                    qty: 1
                };
                let coin = new Coin(itemProps);
                // @TODO: include a setProps method on item-base.
                coin.item_id = 1; // this value will be always coming from the database.
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
