/**
 *
 * Reldens - Merchant
 *
 * This is an example object class, it extends from the NpcObject class and then define the specific parameters for the
 * behavior and animations.
 *
 */

const { TraderObject } = require('reldens/lib/objects/server/object/type/trader-object');
const { GameConst } = require('reldens/lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

class Merchant extends TraderObject
{

    async executeMessageActions(client, data, room, playerSchema)
    {
        await super.executeMessageActions(client, data, room, playerSchema);
        let optionIdx = 'op'+data.value;
        if(!this.isValidOption(data) || !this.isValidIndexValue(optionIdx, room, client)){
            return false;
        }
        let selectedOption = this.options[optionIdx];
        if(1 !== selectedOption.value){
            let activationData = {act: GameConst.UI, id: this.id, content: 'Ok...'};
            client.send('*', activationData);
            return;
        }
        // only give each item once:
        if(sc.hasOwn(playerSchema.inventory.manager.items, 'coins')){
            let contentMessage = 'You have too many already.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        }
        let coin = playerSchema.inventory.manager.createItemInstance('coins');
        playerSchema.inventory.manager.addItem(coin).then(() => {
            let activationData = {act: GameConst.UI, id: this.id, content: 'All yours!'};
            client.send('*', activationData);
        }).catch((err) => {
            Logger.error([`Error while adding item "${selectedOption.key}":`, err]);
            let contentMessage = 'Sorry, I was not able to give you the item, contact the admin.';
            client.send('*', {act: GameConst.UI, id: this.id, content: contentMessage});
            return false;
        });
    }

}

module.exports.Merchant = Merchant;
