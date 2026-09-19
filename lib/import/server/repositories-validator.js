/**
 *
 * Reldens - RepositoriesValidator
 *
 * Validates that the required repository properties were set up on a target instance,
 * logging a critical error and returning false when any expected repository is missing.
 *
 */

const { Logger } = require('@reldens/utils');

class RepositoriesValidator
{

    /**
     * @param {Object} target
     * @param {Array<string>} repositoriesKey
     * @returns {boolean}
     */
    static validate(target, repositoriesKey)
    {
        for(let repositoryKey of repositoriesKey){
            if(!target[repositoryKey]){
                Logger.critical('Repository "'+repositoryKey+'" not found.');
                return false;
            }
        }
        return true;
    }

}

module.exports.RepositoriesValidator = RepositoriesValidator;
