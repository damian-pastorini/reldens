/**
 *
 * Reldens - NodemailerFactory
 *
 * Factory for creating and using the Nodemailer SMTP transporter.
 * Validates the mailer configuration, creates a secure transport, and provides a sendMail interface.
 * Used for standard SMTP email sending (e.g., Gmail, ForwardEmail, custom SMTP servers).
 *
 */

const Nodemailer = require('nodemailer');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('nodemailer').Transporter} Transporter
 *
 * @typedef {Object} MailerConfig
 * @property {string} host
 * @property {number} port
 * @property {string} user
 * @property {string} pass
 * @property {boolean} [secure]
 *
 * @typedef {Object} SendMailProps
 * @property {Transporter} transporter
 * @property {Object} mailOptions
 */
class NodemailerFactory
{

    /**
     * @param {MailerConfig} mailer
     * @returns {Transporter|false}
     */
    setup(mailer)
    {
        if(!mailer){
            Logger.error('Mailer not found on NodemailerFactory.');
            return false;
        }
        if(!mailer.pass){
            Logger.error('Required mailer password not found on NodemailerFactory.');
            return false;
        }
        if(!mailer.host || !mailer.port || !mailer.user || !mailer.pass){
            Logger.error('NodemailerFactory required configuration not specified.', {
                host: mailer.host,
                port: mailer.port,
                user: mailer.user,
                pass: mailer.pass
            });
            return false;
        }
        try {
            return Nodemailer.createTransport({
                host: mailer.host,
                port: mailer.port,
                secure: Boolean(sc.get(mailer, 'secure', true)),
                auth: {
                    // @NOTE: for example, this could be "user" and "password" values from https://forwardemail.net.
                    user: mailer.user,
                    pass: mailer.pass
                }
            });
        } catch (error) {
            Logger.error('Nodemailer transport error.', error);
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
            Logger.error('Transporter not found on Nodemailer.');
            return false;
        }
        if(!props.mailOptions){
            Logger.error('Mail options not found on Nodemailer.');
            return false;
        }
        try {
            return await props.transporter.sendMail(props.mailOptions);
        } catch (error) {
            Logger.error('Nodemailer sendMail error.', error, props.mailOptions);
            return false;
        }
    }

}

module.exports.NodemailerFactory = NodemailerFactory;
