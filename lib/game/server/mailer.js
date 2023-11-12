/**
 *
 * Reldens - Mailer
 *
 * E-mails sender class.
 *
 */

const NodeMailer = require('nodemailer');
const { Logger, ErrorManager, sc } = require('@reldens/utils');

class Mailer
{

    constructor(props)
    {
        this.transporter = false;
        this.service = sc.get(props, 'service', false);
        this.user = false;
        this.pass = false;
        this.to = false;
        this.subject = false;
        this.text = false;
        if(this.service || 1 === Number(process.env.RELDENS_MAILER_ENABLE || 0)){
            this.setupTransporter(props);
        }
    }

    setupTransporter(props)
    {
        this.service = sc.get(props, 'service', process.env.RELDENS_MAILER_SERVICE);
        this.user = sc.get(props, 'user', process.env.RELDENS_MAILER_USER);
        this.pass = sc.get(props, 'pass', process.env.RELDENS_MAILER_PASS);
        this.from = sc.get(props, 'from', process.env.RELDENS_MAILER_FROM);
        this.transporter = NodeMailer.createTransport({
            service: this.service,
            auth: {
                user: this.user,
                pass: this.pass,
            }
        });
        this.transporter.verify(function(error, success){
            if(error){
                Logger.error('SMTP create transport error.', error);
            }
        });
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
            Logger.error('Transporter configuration not specified.', {
                transporter: this.transporter,
                service: this.service,
                user: this.user,
                pass: this.pass
            });
            ErrorManager.error('E-mail error, please try again later.');
            return false;
        }
        if(!props.to || !props.subject || (!props.text && !props.html)){
            ErrorManager.error('Send properties not specified:', props);
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
        return await this.transporter.sendMail(mailOptions).catch((error) => {
            Logger.info(error);
            ErrorManager.error('Transporter sendMail error.', mailOptions);
            return false;
        });
    }

}

module.exports.Mailer = Mailer;
