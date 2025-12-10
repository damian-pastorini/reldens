/**
 *
 * Reldens - Mailer
 *
 * Email service abstraction layer supporting multiple mail providers (SendGrid, Nodemailer).
 * Manages email transporter configuration, credentials, and sending functionality. Configured
 * via environment variables or constructor props. Supports both text and HTML email formats.
 *
 */

const { SendGridFactory } = require('./mailer/sendgrid-factory');
const { NodemailerFactory } = require('./mailer/nodemailer-factory');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('nodemailer').Transporter} Transporter
 *
 * @typedef {Object} MailerProps
 * @property {string} [service]
 * @property {string|number} [port]
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
        this.enabled = 1 === Number(process.env.RELDENS_MAILER_ENABLE || 0);
        /** @type {string} */
        this.service = (sc.get(props, 'service', (process.env.RELDENS_MAILER_SERVICE || ''))).toString();
        /** @type {SendGridFactory|NodemailerFactory|false} */
        this.serviceInstance = this.fetchServiceInstance(this.service);
        /** @type {string|number} */
        this.port = sc.get(props, 'port', process.env.RELDENS_MAILER_PORT);
        /** @type {string} */
        this.user = sc.get(props, 'user', process.env.RELDENS_MAILER_USER);
        /** @type {string} */
        this.pass = sc.get(props, 'pass', process.env.RELDENS_MAILER_PASS);
        /** @type {string} */
        this.from = sc.get(props, 'from', process.env.RELDENS_MAILER_FROM);
        /** @type {string|false} */
        this.to = sc.get(props, 'to', false);
        /** @type {string|false} */
        this.subject = sc.get(props, 'subject', false);
        /** @type {string|false} */
        this.text = sc.get(props, 'text', false);
        /** @type {boolean} */
        this.readyForSetup = this.enabled && this.serviceInstance;
    }

    /**
     * @param {string} serviceKey
     * @returns {SendGridFactory|NodemailerFactory|false} Service factory instance or false
     */
    fetchServiceInstance(serviceKey)
    {
        switch(serviceKey){
            case 'sendgrid':
                return new SendGridFactory();
            case 'nodemailer':
                return new NodemailerFactory();
            default:
                return false;
        }
    }

    /**
     * @returns {Promise<boolean>} True if transporter setup succeeded, false otherwise
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
     * @returns {boolean} True if mailer is enabled and transporter is set up
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
     * @returns {Promise<boolean>} True if email sent successfully, false otherwise
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
