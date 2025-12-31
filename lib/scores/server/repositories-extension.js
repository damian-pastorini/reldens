/**
 *
 * Reldens - RepositoriesExtension
 *
 * Base class that provides repository assignment for scores-related database entities.
 * Extended by ScoresUpdater and ScoresProvider to access scores and scores detail repositories.
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
        this.scoresRepository = this.dataServer.getEntity('scores');
        if(!this.scoresRepository){
            Logger.error('Undefined "scoresRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        /** @type {BaseDriver} */
        this.scoresDetailRepository = this.dataServer.getEntity('scoresDetail');
        if(!this.scoresDetailRepository){
            Logger.error('Undefined "scoresDetailRepository" in DataServer on "RepositoriesExtension".');
            return false;
        }
        return true;
    }

}

module.exports.RepositoriesExtension = RepositoriesExtension;
