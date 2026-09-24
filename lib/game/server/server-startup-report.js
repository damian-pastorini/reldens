/**
 *
 * Reldens - ServerStartupReport
 *
 * Reports the server startup in the logs: warns about the insecure defaults still in use (the Colyseus monitor without
 * authentication and the administrators with the sample password) and logs the ready banner with the main packages.
 *
 */

const ReldensASCII = require('../reldens-ascii');
const PackageData = require('../../../package.json');
const { Encryptor } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 *
 * @typedef {Object} ServerStartupReportProps
 * @property {ConfigManager} configManager
 * @property {BaseDriver} usersRepository
 */
class ServerStartupReport
{

    /**
     * @param {ServerStartupReportProps} props
     */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.configManager = props.configManager;
        /** @type {BaseDriver} */
        this.usersRepository = props.usersRepository;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async warnInsecureDefaults()
    {
        let monitorConfig = this.configManager.get('server/monitor');
        if(monitorConfig.enabled && !monitorConfig.auth){
            Logger.warning('The Colyseus monitor is enabled WITHOUT authentication at "/colyseus".');
        }
        let adminRoleId = this.configManager.getWithoutLogs('server/admin/roleId', 0);
        if(!adminRoleId){
            return false;
        }
        for(let adminUser of await this.usersRepository.loadBy('role_id', adminRoleId)){
            if(!Encryptor.validatePassword('root', adminUser.password)){
                continue;
            }
            Logger.critical(
                'The administrator user "'+adminUser.username+'" still has the sample password, change it with:'
                +' npm exec -- reldens resetPassword --user='+adminUser.username+' --pass=<new-password>'
            );
        }
        return true;
    }

    logServerReady()
    {
        Logger.info('info', 'Server ready.'+ReldensASCII);
        Logger.info('Main packages:', [
            'parcel: '+PackageData.dependencies['@parcel/core'],
            'colyseus: '+PackageData.dependencies['@colyseus/core'],
            'phaser: '+PackageData.dependencies['phaser'],
            'firebase: '+PackageData.dependencies['firebase'],
            'reldens/utils: '+PackageData.dependencies['@reldens/utils'],
            'reldens/storage: '+PackageData.dependencies['@reldens/storage'],
            'reldens/modifiers: '+PackageData.dependencies['@reldens/modifiers'],
            'reldens/items-system: '+PackageData.dependencies['@reldens/items-system'],
            'reldens/skills: '+PackageData.dependencies['@reldens/skills'],
        ]);
        Logger.info('Server listening on '+this.configManager.get('server/baseUrl'));
    }

}

module.exports.ServerStartupReport = ServerStartupReport;
