/**
 *
 * Reldens - Mailer
 *
 * E-mails sender class.
 *
 */

const NodeMailer = require('nodemailer');
const { Logger, ErrorManager } = require('@reldens/utils');

class Mailer
{

    constructor(props)
    {
        this.transporter = false;
        this.service = false;
        this.user = false;
        this.pass = false;
        this.to = false;
        this.subject = false;
        this.text = false;
        if((props && {}.hasOwnProperty.call(props, 'service')) || process.env.RELDENS_MAILER_ENABLE === '1'){
            this.service = props && {}.hasOwnProperty.call(props, 'service') ?
                props.service : process.env.RELDENS_MAILER_SERVICE;
            this.user = props && {}.hasOwnProperty.call(props, 'user') ?
                props.user : process.env.RELDENS_MAILER_USER;
            this.pass = props && {}.hasOwnProperty.call(props, 'pass') ?
                props.pass : process.env.RELDENS_MAILER_PASS;
            this.transporter = NodeMailer.createTransport({
                service: this.service,
                auth: {
                    user: this.user,
                    pass: this.pass,
                }
            });
        }
    }

    isEnabled()
    {
        return this.transporter ? {service: this.service, user: this.user} : false;
    }

    async sendEmail(props)
    {
        if(!props){
            ErrorManager.error('Send empty props error.');
            return false;
        }
        if(!this.transporter || !this.service || !this.user || !this.pass){
            Logger.error(['Transporter configuration not specified:',
                this.transporter,
                this.service,
                this.user,
                this.pass
            ]);
            ErrorManager.error('E-mail error, please try again later or contact the administrator.');
            return false;
        }
        if(!props.to || !props.subject || (!props.text && !props.html)){
            ErrorManager.error('Send properties not specified.');
            return false;
        }
        let mailOptions = {
            from: this.user,
            to: props.to,
            subject: props.subject
        };
        if({}.hasOwnProperty.call(props, 'text')){
            mailOptions.text = props.text;
        }
        if({}.hasOwnProperty.call(props, 'html')){
            mailOptions.html = props.html;
        }
        let result = await this.transporter.sendMail(mailOptions).catch((error) => {
            Logger.info(error);
            ErrorManager.error('Transporter sendMail error.');
            return false;
        });
        if(result){
            ErrorManager.error('If the email exists then a reset password link should be received soon.');
        }
    }

}

module.exports.Mailer = Mailer;
