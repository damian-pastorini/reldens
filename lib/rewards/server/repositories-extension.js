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
        this.dataServer = sc.get(props, 'dataServer', false);
        if(!this.dataServer){
            Logger.error('Undefined DataServer on "RepositoriesExtension" class.');
            return false;
        }
        this.rewardsEventsRepository = this.dataServer.getEntity('rewardsEvents');
        if(!this.rewardsEventsRepository){
            Logger.error('Undefined "rewardsEventsRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        this.rewardsEventsStateRepository = this.dataServer.getEntity('rewardsEventsState');
        if(!this.rewardsEventsStateRepository){
            Logger.error('Undefined "rewardsEventsStateRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        return true;
    }

}

module.exports.RepositoriesExtension = RepositoriesExtension;
