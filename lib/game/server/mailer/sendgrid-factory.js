/**
 *
 * Reldens - SendGridFactory
 *
 */

const SendGridMail = require('@sendgrid/mail');
const { Logger } = require('@reldens/utils');

class SendGridFactory
{

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
            SendGridMail.setApiKey(mailer.pass);
            return SendGridMail;
        } catch (error) {
            Logger.error('SendGrid transport error.', error);
            return false;
        }
    }

    async sendEmail(props)
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
            Logger.error('SendGrid sendMail error.', error, props.mailOptions);
            return false;
        }
    }

}

module.exports.SendGridFactory = SendGridFactory;
