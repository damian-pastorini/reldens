/**
 *
 * Reldens - IpListsUpgradeGuard
 *
 * Builds the address allow and deny lists from the environment values, the configuration rows and the permanent
 * ip_lists rows, and rejects the WebSocket upgrades of the addresses the lists do not allow.
 *
 */

const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/server-utils').IpListsConfigurer} IpListsConfigurer
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 *
 * @typedef {Object} IpListsUpgradeGuardProps
 * @property {ConfigManager} configManager
 * @property {IpListsConfigurer} ipListsConfigurer
 * @property {BaseDriver} [ipListsRepository]
 */
class IpListsUpgradeGuard
{

    /**
     * @param {IpListsUpgradeGuardProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.configManager = props.configManager;
        /** @type {IpListsConfigurer} */
        this.ipListsConfigurer = props.ipListsConfigurer;
        /** @type {BaseDriver|undefined} */
        this.ipListsRepository = props.ipListsRepository;
    }

    /**
     * @returns {Promise<void>}
     */
    async refresh()
    {
        let configuredIpLists = this.configManager.get('server/appServerConfig/ipLists');
        let storedEntries = await this.loadStoredEntries();
        this.ipListsConfigurer.setLists({
            enabled: Boolean(this.configManager.getWithoutLogs(
                'server/security/ipLists/enabled',
                configuredIpLists.enabled
            )),
            allow: configuredIpLists.allow
                .concat(this.configManager.getWithoutLogs('server/security/ipLists/allow', []))
                .concat(storedEntries.allow),
            deny: configuredIpLists.deny
                .concat(this.configManager.getWithoutLogs('server/security/ipLists/deny', []))
                .concat(storedEntries.deny)
        });
    }

    /**
     * @returns {Promise<{allow: Array<string>, deny: Array<string>}>}
     */
    async loadStoredEntries()
    {
        let storedEntries = {allow: [], deny: []};
        if(!this.ipListsRepository){
            Logger.warning('The "ipLists" entity is missing, run the entities generation to persist the IP lists.');
            return storedEntries;
        }
        for(let storedEntry of await this.ipListsRepository.loadAll()){
            if(storedEntry.expires_at){
                continue;
            }
            if('allow' === storedEntry.list_type){
                storedEntries.allow.push(storedEntry.address);
                continue;
            }
            storedEntries.deny.push(storedEntry.address);
        }
        return storedEntries;
    }

    /**
     * @returns {function(Object, {ip: string}): (Response|undefined)}
     */
    createBeforeUpgradeHandler()
    {
        return (upgradeRequest, authContext) => {
            if(this.ipListsConfigurer.isAllowed(authContext.ip)){
                return;
            }
            Logger.warning('Denied WebSocket upgrade for address: '+authContext.ip);
            return new Response(null, {status: 403});
        };
    }

}

module.exports.IpListsUpgradeGuard = IpListsUpgradeGuard;
