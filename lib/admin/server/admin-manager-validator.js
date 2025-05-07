/**
 *
 * Reldens - AdminManagerValidator
 *
 */
const { ValidatorInterface, Logger } = require('@reldens/utils');

class AdminManagerValidator extends ValidatorInterface
{

    validate(adminManager)
    {
        let requiredProperties = [
            'events',
            'themeManager',
            'config',
            'dataServer',
            'gameServer',
            'installer',
            'loginManager',
            'app',
            'applicationFramework',
            'bodyParser',
            'session',
            'broadcastCallback',
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
        if(!adminManager.installer.isInstalled()){
            Logger.info('Reldens is not installed, administration panel will not be available.');
            return false;
        }
        return true
    }

}

module.exports.AdminManagerValidator = AdminManagerValidator;
