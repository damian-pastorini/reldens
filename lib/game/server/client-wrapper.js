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
        this.client.send('*', data);
    }

    broadcast(data)
    {
        // @TODO - BETA - Replace '*' by message "act" value. Implement client wrapper as driver.
        this.room.broadcast('*', data);
    }

}

module.exports.ClientWrapper = ClientWrapper;