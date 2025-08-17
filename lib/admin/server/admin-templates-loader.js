/**
 *
 * Reldens - AdminTemplatesLoader
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

class AdminTemplatesLoader
{

    async fetchAdminFilesContents(adminTemplates)
    {
        let adminFilesContents = {};
        for(let template of Object.keys(adminTemplates)){
            let templateData = adminTemplates[template];
            if(sc.isObject(templateData)){
                let subFoldersContents = await this.fetchAdminFilesContents(templateData);
                if(!subFoldersContents){
                    return false;
                }
                adminFilesContents[template] = subFoldersContents;
                continue;
            }
            if(!FileHandler.isFile(templateData)){
                Logger.critical('Admin template file not found.', template);
                return false;
            }
            adminFilesContents[template] = await FileHandler.fetchFileContents(templateData);
        }
        return adminFilesContents;
    }

}

module.exports.AdminTemplatesLoader = new AdminTemplatesLoader();
