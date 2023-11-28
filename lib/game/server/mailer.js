/**
 *
 * Reldens - Mailer
 *
 */

const { SendGridFactory } = require('./mailer/sendgrid-factory');
const { NodemailerFactory } = require('./mailer/nodemailer-factory');
const { Logger, sc } = require('@reldens/utils');

class Mailer
{

    constructor(props)
    {
        this.transporter = false;
        this.enabled = 1 === Number(process.env.RELDENS_MAILER_ENABLE || 0);
        this.service = (sc.get(props, 'service', (process.env.RELDENS_MAILER_SERVICE || ''))).toString();
        this.serviceInstance = this.fetchServiceInstance(this.service);
        this.port = sc.get(props, 'port', process.env.RELDENS_MAILER_PORT);
        this.user = sc.get(props, 'user', process.env.RELDENS_MAILER_USER);
        this.pass = sc.get(props, 'pass', process.env.RELDENS_MAILER_PASS);
        this.from = sc.get(props, 'from', process.env.RELDENS_MAILER_FROM);
        this.to = sc.get(props, 'to', false);
        this.subject = sc.get(props, 'subject', false);
        this.text = sc.get(props, 'text', false);
        this.readyForSetup = this.enabled && this.serviceInstance;
    }

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

    async setupTransporter()
    {
        if(this.serviceInstance && sc.isObjectFunction(this.serviceInstance, 'setup')){
            this.transporter = this.serviceInstance.setup(this);
            return true;
        }
        return false;
    }

    isEnabled()
    {
        return this.enabled && this.transporter;
    }

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
        if(this.serviceInstance && sc.isObjectFunction(this.serviceInstance, 'sendMail')){
            await this.serviceInstance.sendMail({
                mailOptions: mailOptions,
                transporter: this.transporter
            })
        }
    }

}

module.exports.Mailer = Mailer;
