/**
 *
 * Reldens - ServerConfigEnricher
 *
 * Completes the loaded configuration with the values that depend on the server: the guests email domain from the
 * environment when no configuration row sets it, and the server URL of every room for the clients.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 *
 * @typedef {Object} ServerConfigEnricherProps
 * @property {ConfigManager} configManager
 * @property {BaseDriver} roomsRepository
 */
class ServerConfigEnricher
{

    /**
     * @param {ServerConfigEnricherProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.configManager = props.configManager;
        /** @type {BaseDriver} */
        this.roomsRepository = props.roomsRepository;
    }

    /**
     * @param {string} environmentEmailDomain
     * @returns {string}
     */
    enrichGuestsEmailDomain(environmentEmailDomain)
    {
        let configuredEmailDomain = this.configManager.getWithoutLogs('server/players/guestsUser/emailDomain', '');
        if('' !== configuredEmailDomain){
            return configuredEmailDomain;
        }
        sc.deepMergeProperties(
            this.configManager,
            {server: {players: {guestsUser: {emailDomain: environmentEmailDomain}}}}
        );
        return environmentEmailDomain;
    }

    /**
     * @returns {Promise<void>}
     */
    async enrichRoomsServersUrls()
    {
        let rooms = await this.roomsRepository.loadAll();
        if(!rooms || 0 === rooms.length){
            return;
        }
        let defaultServerUrl = this.configManager.get('server/publicUrl') || this.configManager.get('server/baseUrl');
        let servers = {};
        for(let room of rooms){
            servers[room.name] = room.server_url || defaultServerUrl;
        }
        sc.deepMergeProperties(this.configManager, {client: {rooms: {servers}}});
    }

}

module.exports.ServerConfigEnricher = ServerConfigEnricher;
