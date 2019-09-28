/**
 *
 * Reldens - ConfigProcessor
 *
 * Helper class to validate and get the configurations. This class is used in both sides, server and client.
 *
 */

class ConfigProcessor
{

    /**
     * This method will receive a path that's should be always composed by 4 parameters split by a slash and will
     * return a property of the same processor which should have the configurations assigned.
     *
     * @param path
     * @returns {*}
     */
    get(path)
    {
        // since the amount of parameters should be always the same then we can easily:
        let pathArray = path.split('/');
        let level2 = (((this[pathArray[0]] || {})[pathArray[1]] || {})[pathArray[2]] || {});
        let result = false;
        if(level2.hasOwnProperty(pathArray[3])){
            result = level2[pathArray[3]];
        }
        return result;
    }

}

module.exports = new ConfigProcessor();
