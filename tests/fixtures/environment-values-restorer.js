/**
 *
 * Reldens - EnvironmentValuesRestorer
 *
 * Captures the given process environment values before a test changes them and restores them after it, deleting the
 * values that were not set before.
 *
 */

const { sc } = require('@reldens/utils');

class EnvironmentValuesRestorer
{

    /**
     * @param {Array<string>} keys
     * @returns {Object<string, string|boolean>}
     */
    static capture(keys)
    {
        let previousEnvironment = {};
        for(let key of keys){
            previousEnvironment[key] = sc.get(process.env, key, false);
        }
        return previousEnvironment;
    }

    /**
     * @param {Object<string, string|boolean>} previousEnvironment
     */
    static restore(previousEnvironment)
    {
        for(let key of Object.keys(previousEnvironment)){
            if(false === previousEnvironment[key]){
                delete process.env[key];
                continue;
            }
            process.env[key] = previousEnvironment[key];
        }
    }

}

module.exports.EnvironmentValuesRestorer = EnvironmentValuesRestorer;
