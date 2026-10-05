/**
 *
 * Reldens - TemplatePackageDependencies
 *
 * Resolves the install template package.json dependencies versions from the Reldens module package.json.
 * The template only lists the package names, the versions always come from the installed Reldens release,
 * so new projects never get stuck with outdated versions hardcoded in the template.
 *
 */

const { sc } = require('@reldens/utils');

class TemplatePackageDependencies
{

    /**
     * @param {Object} templateData
     * @param {Object} reldensPackageData
     * @returns {Object}
     */
    static resolve(templateData, reldensPackageData)
    {
        if(!templateData || !reldensPackageData){
            return templateData;
        }
        let knownVersions = {
            ...sc.get(reldensPackageData, 'devDependencies', {}),
            ...sc.get(reldensPackageData, 'dependencies', {})
        };
        let reldensName = sc.get(reldensPackageData, 'name', '');
        let reldensVersion = sc.get(reldensPackageData, 'version', '');
        if(reldensName && reldensVersion){
            knownVersions[reldensName] = '^'+reldensVersion;
        }
        for(let group of ['dependencies', 'devDependencies']){
            this.resolveGroupVersions(sc.get(templateData, group, false), knownVersions);
        }
        return templateData;
    }

    /**
     * @param {Object|boolean} groupData
     * @param {Object} knownVersions
     * @returns {boolean}
     */
    static resolveGroupVersions(groupData, knownVersions)
    {
        if(!groupData){
            return false;
        }
        for(let packageName of Object.keys(groupData)){
            let version = sc.get(knownVersions, packageName, '');
            if(version){
                groupData[packageName] = version;
            }
        }
        return true;
    }

}

module.exports.TemplatePackageDependencies = TemplatePackageDependencies;
