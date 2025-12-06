/**
 *
 * Reldens - RepositoriesExtension
 *
 */

const { Logger, sc } = require('@reldens/utils');

class RepositoriesExtension
{

    assignRepositories(props)
    {
        /** @type {?BaseDataServer|ObjectionJsDataServer} **/
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('Undefined DataServer on "RepositoriesExtension" class.');
            return false;
        }
        /** @type {?BaseDriver|ObjectionJsDriver} **/
        this.rewardsEventsRepository = this.dataServer.getEntity('rewardsEvents');
        if(!this.rewardsEventsRepository){
            Logger.error('Undefined "rewardsEventsRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        /** @type {?BaseDriver|ObjectionJsDriver} **/
        this.rewardsEventsStateRepository = this.dataServer.getEntity('rewardsEventsState');
        if(!this.rewardsEventsStateRepository){
            Logger.error('Undefined "rewardsEventsStateRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        /** @type {?BaseDriver|ObjectionJsDriver} **/
        this.itemsRepository = this.dataServer.getEntity('itemsItem');
        if(!this.itemsRepository){
            Logger.error('Undefined "itemsRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        return true;
    }

}

module.exports.RepositoriesExtension = RepositoriesExtension;
