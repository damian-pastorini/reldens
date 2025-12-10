/**
 *
 * Reldens - ClientWrapper
 *
 * Server-side wrapper for Colyseus client send and room broadcast methods. Simplifies message
 * sending by wrapping the client.send() and room.broadcast() calls with a consistent interface.
 * Used to abstract communication between server and client during game events and state updates.
 *
 */

/**
 * @typedef {import('@colyseus/core').Client} Client
 * @typedef {import('@colyseus/core').Room} Room
 *
 * @typedef {Object} ClientWrapperProps
 * @property {Client} client
 * @property {Room} room
 */
class ClientWrapper
{

    /**
     * @param {ClientWrapperProps} props
     */
    constructor(props)
    {
        /** @type {Client} */
        this.client = props.client;
        /** @type {Room} */
        this.room = props.room;
    }

    /**
     * @param {Object<string, any>} data
     */
    send(data)
    {
        this.client.send('*', data);
    }

    /**
     * @param {Object<string, any>} data
     */
    broadcast(data)
    {
        // @TODO - BETA - Replace '*' by message "act" value. Implement client wrapper as driver.
        this.room.broadcast('*', data);
    }

}

module.exports.ClientWrapper = ClientWrapper;