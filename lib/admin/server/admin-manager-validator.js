/**
 *
 * Reldens - AdminManagerValidator
 *
 */
const { ValidatorInterface, Logger } = require('@reldens/utils');

class AdminManagerValidator extends ValidatorInterface
{

    validate(adminManager, isInstalled)
    {
        let requiredProperties = [
            'events',
            'dataServer',
            'app',
            'applicationFramework',
            'renderCallback',
            'bodyParser',
            'session',
            'entities',
            'adminFilesContents',
            'mimeTypes',
            'allowedExtensions'
        ];
        for(let propName of requiredProperties){
            if(!adminManager[propName]){
                Logger.error('Missing required property in AdminManager:', propName);
                return false;
            }
        }
        return true
    }

}

module.exports.AdminManagerValidator = AdminManagerValidator;
