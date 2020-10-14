/**
 *
 * Reldens - ClientWrapper
 *
 * Server side client wrapper for @reldens/skills.
 *
 */

class ClientWrapper
{

    constructor(client, room)
    {
        this.client = client;
        this.room = room;
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