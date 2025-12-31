/**
 *
 * Reldens - TemplatesToPathMapper
 *
 * Singleton utility class for mapping template names to file paths. Recursively processes template
 * lists and constructs full file paths by joining the base path with template names. Used for
 * resolving template file locations in the theme system. Exported as a singleton instance for
 * shared use across the application.
 *
 */

const { sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

class TemplatesToPathMapper
{

    /**
     * @param {Object<string, string|Object>} templateList
     * @param {string} path
     * @returns {Object<string, string>}
     */
    map(templateList, path)
    {
        let result = {};
        for(let templateName of Object.keys(templateList)){
            if(sc.isObject(templateList[templateName])){
                result[templateName] = this.map(templateList[templateName], FileHandler.joinPaths(path, templateName));
                continue;
            }
            result[templateName] = FileHandler.joinPaths(path, templateList[templateName]);
        }
        return result;
    }

}

module.exports.TemplatesToPathMapper = new TemplatesToPathMapper();
