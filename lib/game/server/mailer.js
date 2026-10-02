/**
 *
 * Reldens - Mailer
 *
 * Email service abstraction layer supporting multiple mail providers (SendGrid, Nodemailer).
 * Manages email transporter configuration, credentials, and sending functionality. Configured
 * via the constructor props (read from the environment variables by the ServerManager). The service package is loaded
 * from the project node_modules, so only the selected provider package has to be installed. Supports both text and
 * HTML email formats.
 *
 */

const { MailerServiceRegistry } = require('./mailer/mailer-service-registry');
const { PackageResolver } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('nodemailer').Transporter} Transporter
 *
 * @typedef {Object} MailerProps
 * @property {boolean} [enabled]
 * @property {string} [service]
 * @property {string} [projectRoot]
 * @property {string} [reldensModulePath]
 * @property {string} [host]
 * @property {string|number} [port]
 * @property {boolean} [secure]
 * @property {string} [user]
 * @property {string} [pass]
 * @property {string} [from]
 * @property {string} [to]
 * @property {string} [subject]
 * @property {string} [text]
 */
class Mailer
{

    /**
     * @param {MailerProps} props
     */
    constructor(props)
    {
        /** @type {Transporter|false} */
        this.transporter = false;
        /** @type {boolean} */
        this.enabled = Boolean(sc.get(props, 'enabled', false));
        /** @type {string} */
        this.service = sc.get(props, 'service', '');
        /** @type {string} */
        this.projectRoot = sc.get(props, 'projectRoot', './');
        /** @type {string} */
        this.reldensModulePath = sc.get(props, 'reldensModulePath', '');
        /** @type {string} */
        this.host = sc.get(props, 'host', '');
        /** @type {string|number} */
        this.port = sc.get(props, 'port', '');
        /** @type {boolean} */
        this.secure = Boolean(sc.get(props, 'secure', true));
        /** @type {string} */
        this.user = sc.get(props, 'user', '');
        /** @type {string} */
        this.pass = sc.get(props, 'pass', '');
        /** @type {string} */
        this.from = sc.get(props, 'from', '');
        /** @type {string|false} */
        this.to = sc.get(props, 'to', false);
        /** @type {string|false} */
        this.subject = sc.get(props, 'subject', false);
        /** @type {string|false} */
        this.text = sc.get(props, 'text', false);
        /** @type {SendGridFactory|NodemailerFactory|false} */
        this.serviceInstance = this.enabled ? this.fetchServiceInstance(this.service) : false;
        /** @type {boolean} */
        this.readyForSetup = this.enabled && this.serviceInstance;
    }

    /**
     * @param {string} serviceKey
     * @returns {SendGridFactory|NodemailerFactory|false}
     */
    fetchServiceInstance(serviceKey)
    {
        let service = sc.get(MailerServiceRegistry.services, serviceKey, false);
        if(!service){
            Logger.error('Mailer service not supported: '+serviceKey);
            return false;
        }
        let servicePackage = MailerServiceRegistry.loadPackage(serviceKey, [this.projectRoot, this.reldensModulePath]);
        if(!servicePackage){
            Logger.error('Mailer service package missing. '+PackageResolver.error.message, PackageResolver.error.error);
            return false;
        }
        return new service.factoryClass(servicePackage);
    }

    /**
     * @returns {Promise<boolean>}
     */
    async setupTransporter()
    {
        if(this.serviceInstance && sc.isObjectFunction(this.serviceInstance, 'setup')){
            this.transporter = await this.serviceInstance.setup(this);
            return true;
        }
        return false;
    }

    /**
     * @returns {boolean}
     */
    isEnabled()
    {
        return this.enabled && this.transporter;
    }

    /**
     * @param {Object} props
     * @param {string} props.to
     * @param {string} props.subject
     * @param {string} [props.from]
     * @param {string} [props.text]
     * @param {string} [props.html]
     * @returns {Promise<boolean>}
     */
    async sendEmail(props)
    {
        if(!sc.isObject(props)){
            Logger.error('Send email empty properties error.');
            return false;
        }
        if(!props.to || !props.subject || (!props.text && !props.html)){
            Logger.error(
                'Send email required properties missing.',
                {to: props.to, subject: props.subject, text: props.text, html: props.html}
            );
            return false;
        }
        let mailOptions = {
            from: props.from,
            to: props.to,
            subject: props.subject
        };
        if(sc.hasOwn(props, 'text')){
            mailOptions.text = props.text;
        }
        if(sc.hasOwn(props, 'html')){
            mailOptions.html = props.html;
        }
        if(!this.serviceInstance){
            Logger.error('Missing mailer service instance.');
            return false;
        }
        if(!sc.isObjectFunction(this.serviceInstance, 'sendMail')){
            Logger.error('Missing sendMail is not a function.');
            return false;
        }
        return await this.serviceInstance.sendMail({
            mailOptions: mailOptions,
            transporter: this.transporter
        });
    }

}

module.exports.Mailer = Mailer;
