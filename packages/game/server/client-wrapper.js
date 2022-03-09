/**
 *
 * Reldens - ClientWrapper
 *
 * Server side client wrapper for send and broadcast method.
 *
 */

class ClientWrapper
{

    constructor(props)
    {
        this.client = props.client;
        this.room = props.room;
    }

    send(data)
    {
        this.room.send(this.client, data);
    }

    broadcast(data)
    {
        this.room.broadcast(data);
    }

}

module.exports.ClientWrapper = ClientWrapper;