/**
 *
 * Reldens - RepositoriesExtension
 *
 * Provides common repository assignment functionality for rewards-related database operations.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 */
class RepositoriesExtension
{

    /**
     * @param {Object} props
     * @returns {boolean}
     */
    assignRepositories(props)
    {
        /** @type {BaseDataServer|boolean} */
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('Undefined DataServer on "RepositoriesExtension" class.');
            return false;
        }
        /** @type {BaseDriver} */
        this.rewardsEventsRepository = this.dataServer.getEntity('rewardsEvents');
        if(!this.rewardsEventsRepository){
            Logger.error('Undefined "rewardsEventsRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        /** @type {BaseDriver} */
        this.rewardsEventsStateRepository = this.dataServer.getEntity('rewardsEventsState');
        if(!this.rewardsEventsStateRepository){
            Logger.error('Undefined "rewardsEventsStateRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        /** @type {BaseDriver} */
        this.itemsRepository = this.dataServer.getEntity('itemsItem');
        if(!this.itemsRepository){
            Logger.error('Undefined "itemsRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        return true;
    }

}

module.exports.RepositoriesExtension = RepositoriesExtension;
