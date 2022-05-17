/**
 *
 * Reldens - Merchant
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 *
 */

const { NpcObject } = require('reldens/lib/objects/server/npc-object');
const { GameConst } = require('reldens/lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

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
        // @TODO - BETA - All the NPC info will be coming from the storage.
        this.content = 'Hi there! Do you want a coin? These are useless test coins.';
        this.options = {
            op1: {label: 'Sure!', value: 1},
            op2: {label: 'No, thank you.', value: 2}
        };
        this.sendInvalidOptionMessage = true;
    }

    parseMessageAndRunActions(client, data, room, playerSchema)
    {
        super.parseMessageAndRunActions(client, data, room, playerSchema);
        let optionIdx = 'op'+data.value;
        if(!this.isValidOption(data) || !this.isValidIndexValue(optionIdx, room, client)){
            return false;
        }
        let selectedOption = this.options[optionIdx];
        if(selectedOption.value === 1){
            // only give each item once:
            if(sc.hasOwn(playerSchema.inventory.manager.items, 'coins')){
                let contentMessage = 'You have too many already.';
                client.send('game-message', {act: GameConst.UI, id: this.id, content: contentMessage});
                return false;
            }
            let coin = playerSchema.inventory.createItemInstance('coins');
            playerSchema.inventory.manager.addItem(coin).then(() => {
                let activationData = {act: GameConst.UI, id: this.id, content: 'All yours!'};
                client.send('game-message', activationData);
            }).catch((err) => {
                Logger.error([`Error while adding item "${selectedOption.key}":`, err]);
                let contentMessage = 'Sorry, I was not able to give you the item, contact the admin.';
                client.send('game-message', {act: GameConst.UI, id: this.id, content: contentMessage});
                return false;
            });
        } else {
            let activationData = {act: GameConst.UI, id: this.id, content: 'Ok...'};
            client.send('game-message', activationData);
        }
    }

}

module.exports.Merchant = Merchant;
