/**
 *
 * Reldens - Merchant
 *
 * This is an example object class, it extends from the TraderObject class. The inventory is already associated in the
 * storage including the exchange requirements.
 *
 */

const { TraderObject } = require('reldens/lib/objects/server/object/type/trader-object');
const { GameConst } = require('reldens/lib/game/constants');
const { Logger, sc } = require('@reldens/utils');

class Merchant extends TraderObject
{

    async executeMessageActions(client, data, room, playerSchema)
    {
        let result = await super.executeMessageActions(client, data, room, playerSchema);
        if(!result){
            return false;
        }
        client.send('*', {act: GameConst.UI, id: this.id, result, listener: 'traderObject'});
    }

}

module.exports.Merchant = Merchant;
