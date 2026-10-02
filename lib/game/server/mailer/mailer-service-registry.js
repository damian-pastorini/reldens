/**
 *
 * Reldens - MailerServiceRegistry
 *
 * Registry of the supported mailer services, maps each service key to its factory class and the npm package the
 * factory needs. Used by the Mailer to create the service factory and by the installer to install the package. The
 * package is loaded from the project and then from the Reldens module, so a dependency nested under Reldens is found.
 *
 */

const { SendGridFactory } = require('./sendgrid-factory');
const { NodemailerFactory } = require('./nodemailer-factory');
const { PackageResolver } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class MailerServiceRegistry
{

    /** @type {Object<string, {packageName: string, version: string, factoryClass: Function}>} */
    static services = {
        nodemailer: {packageName: 'nodemailer', version: '', factoryClass: NodemailerFactory},
        sendgrid: {packageName: '@sendgrid/mail', version: '8.1.6', factoryClass: SendGridFactory}
    };

    /**
     * @param {string} serviceKey
     * @returns {string|false}
     */
    static packageName(serviceKey)
    {
        let service = sc.get(MailerServiceRegistry.services, serviceKey, false);
        if(!service){
            return false;
        }
        return service.packageName;
    }

    /**
     * @param {string} serviceKey
     * @param {Array<string>} packagePaths
     * @returns {Object|false}
     */
    static loadPackage(serviceKey, packagePaths)
    {
        let packageName = MailerServiceRegistry.packageName(serviceKey);
        if(!packageName){
            return false;
        }
        for(let packagePath of packagePaths){
            let loadedPackage = PackageResolver.loadPackage(packageName, packagePath);
            if(loadedPackage){
                return loadedPackage;
            }
        }
        return false;
    }

}

module.exports.MailerServiceRegistry = MailerServiceRegistry;
