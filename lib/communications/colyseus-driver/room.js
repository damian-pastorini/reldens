/**
 *
 * Reldens - ColyseusDriver / Room
 *
 * Wrapper around Colyseus Room that translates Colyseus 0.17's
 * onLeave(client, code) signature to the legacy Reldens
 * onLeave(client, consented) signature, so Reldens room subclasses do not
 * need to change. The detection happens in the constructor: if the
 * subclass prototype defines its own onLeave (anything other than this
 * wrapper's default), we install an instance-level onLeave that performs
 * the (code -> consented) translation and forwards to the subclass body.
 *
 * Reldens room subclasses must NOT call super.onLeave(); they have not
 * historically, so this is safe today. If a future contributor needs to
 * call super, do it as super.onLeave(client, consented) (the wrapper's
 * default is a no-op).
 *
 */

const { Room: ColyseusRoom } = require('@colyseus/core');
const { CloseCode } = require('./close-code');

class Room extends ColyseusRoom
{

    constructor(...args)
    {
        super(...args);
        let subclassOnLeave = Object.getPrototypeOf(this).onLeave;
        if(subclassOnLeave && subclassOnLeave !== Room.prototype.onLeave){
            this.onLeave = async (client, code) => {
                return await subclassOnLeave.call(this, client, code === CloseCode.CONSENTED);
            };
        }
    }

    async onLeave()
    {
    }

}

module.exports.Room = Room;
