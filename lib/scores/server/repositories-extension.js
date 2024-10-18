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
        this.scoresRepository = this.dataServer.getEntity('scores');
        if(!this.scoresRepository){
            Logger.error('Undefined "scoresRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        this.scoresDetailRepository = this.dataServer.getEntity('scoresDetail');
        if(!this.scoresDetailRepository){
            Logger.error('Undefined "scoresDetailRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        return true;
    }

}

module.exports.RepositoriesExtension = RepositoriesExtension;
