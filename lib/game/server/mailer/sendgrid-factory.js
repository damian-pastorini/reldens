/**
 *
 * Reldens - SendGridFactory
 *
 * Factory for creating and using the SendGrid mail service.
 * Validates the API key configuration, sets the SendGrid API key, and provides a sendMail interface.
 * Used for SendGrid-based transactional email sending with API integration. The "@sendgrid/mail" package is loaded
 * from the project by the Mailer and received in the constructor, it is not a Reldens dependency.
 *
 */

const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('@sendgrid/mail').MailService} MailService
 *
 * @typedef {Object} MailerConfig
 * @property {string} pass
 *
 * @typedef {Object} SendMailProps
 * @property {MailService} transporter
 * @property {Object} mailOptions
 */
class SendGridFactory
{

    /**
     * @param {MailService} sendGridMail
     */
    constructor(sendGridMail)
    {
        /** @type {MailService} */
        this.sendGridMail = sendGridMail;
    }

    /**
     * @param {MailerConfig} mailer
     * @returns {Promise<MailService|false>}
     */
    async setup(mailer)
    {
        if(!mailer){
            Logger.error('Mailer not found on SendGridFactory.');
            return false;
        }
        if(!mailer.pass){
            Logger.error('Required mailer password not found on SendGridFactory.');
            return false;
        }
        try {
            this.sendGridMail.setApiKey(mailer.pass);
            return this.sendGridMail;
        } catch (error) {
            Logger.error('SendGrid transport error.', error);
            return false;
        }
    }

    /**
     * @param {SendMailProps} props
     * @returns {Promise<Object|false>}
     */
    async sendMail(props)
    {
        if(!props.transporter){
            Logger.error('Transporter not found on SendGrid.');
            return false;
        }
        if(!props.mailOptions){
            Logger.error('Mail options not found on SendGrid.');
            return false;
        }
        try {
            return await props.transporter.send(props.mailOptions);
        } catch (error) {
            Logger.error('SendGrid sendMail error.', error, error?.response?.body?.errors, props.mailOptions);
            return false;
        }
    }

}

module.exports.SendGridFactory = SendGridFactory;
