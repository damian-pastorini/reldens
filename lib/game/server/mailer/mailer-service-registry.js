/**
 *
 * Reldens - MailerServiceRegistry
 *
 * Registry of the supported mailer services, maps each service key to its factory class and the npm package the
 * factory needs. Used by the Mailer to create the service factory and by the installer to install the package.
 *
 */

const { SendGridFactory } = require('./sendgrid-factory');
const { NodemailerFactory } = require('./nodemailer-factory');
const { sc } = require('@reldens/utils');

class MailerServiceRegistry
{

    /** @type {Object<string, {packageName: string, factoryClass: typeof SendGridFactory|typeof NodemailerFactory}>} */
    static services = {
        nodemailer: {packageName: 'nodemailer', factoryClass: NodemailerFactory},
        sendgrid: {packageName: '@sendgrid/mail', factoryClass: SendGridFactory}
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

}

module.exports.MailerServiceRegistry = MailerServiceRegistry;
