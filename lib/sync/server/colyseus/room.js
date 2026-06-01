/**
 *
 * Reldens - Room
 *
 * Wrapper around Colyseus Room that translates Colyseus 0.17's onLeave(client, code)
 * signature to the legacy Reldens onLeave(client, consented) signature, so Reldens
 * room subclasses do not need to change. If a subclass overrides onLeave, we install
 * an instance-level onLeave that performs the (code -> consented) translation and
 * forwards to the subclass body.
 *
 */

const { Room: ColyseusRoom, CloseCode } = require('@colyseus/core');

class Room extends ColyseusRoom
{

    constructor(...args)
    {
        super(...args);
        let subclassOnLeave = Object.getPrototypeOf(this).onLeave;
        if(subclassOnLeave && subclassOnLeave !== ColyseusRoom.prototype.onLeave){
            this.onLeave = async (client, code) => {
                return await subclassOnLeave.call(this, client, code === CloseCode.CONSENTED);
            };
        }
    }

}

module.exports.Room = Room;
