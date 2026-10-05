/**
 *
 * Reldens - Test Mailer
 *
 */

const os = require('os');
const { BaseTest } = require('./base-test');
const { Mailer } = require('../lib/game/server/mailer');
const { MailerServiceRegistry } = require('../lib/game/server/mailer/mailer-service-registry');
const { NodemailerFactory } = require('../lib/game/server/mailer/nodemailer-factory');
const { EnvironmentVariablesReader } = require('../lib/game/server/environment-variables-reader');
const { sc } = require('@reldens/utils');

class TestMailer extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.projectRoot = process.cwd();
        this.missingServiceKey = 'reldens-missing-mailer-service';
        this.missingPackageName = 'reldens-missing-mailer-package';
        this.nodemailerProps = {
            enabled: true,
            service: 'nodemailer',
            projectRoot: this.projectRoot,
            host: 'smtp.reldens.test',
            port: 465,
            secure: true,
            user: 'mailer-user',
            pass: 'mailer-pass',
            from: 'from@reldens.test'
        };
    }

    async testTheDisabledMailerDoesNotLoadAnyService()
    {
        await this.test('the disabled mailer does not load the service package', async () => {
            let mailer = new Mailer({...this.nodemailerProps, enabled: false});
            this.assert.strictEqual(mailer.serviceInstance, false);
            this.assert.strictEqual(Boolean(mailer.readyForSetup), false);
        });
    }

    async testTheEnabledMailerPassesTheLoadedPackageToTheFactory()
    {
        await this.test('the enabled mailer passes the package loaded from the project to the factory', async () => {
            let mailer = new Mailer(this.nodemailerProps);
            this.assert.strictEqual(mailer.serviceInstance instanceof NodemailerFactory, true);
            this.assert.strictEqual(mailer.serviceInstance.nodemailer, require('nodemailer'));
            this.assert.strictEqual(Boolean(mailer.readyForSetup), true);
        });
    }

    async testTheNodemailerTransporterIsCreatedWithTheHost()
    {
        await this.test('the nodemailer transporter is created with the host from the props', async () => {
            let mailer = new Mailer(this.nodemailerProps);
            this.assert.strictEqual(mailer.host, this.nodemailerProps.host);
            this.assert.strictEqual(await mailer.setupTransporter(), true);
            this.assert.strictEqual(sc.isObjectFunction(mailer.transporter, 'sendMail'), true);
            this.assert.strictEqual(Boolean(mailer.isEnabled()), true);
        });
    }

    async testAnUnknownServiceDisablesTheMailer()
    {
        await this.test('an unknown mailer service leaves the mailer without a service instance', async () => {
            let mailer = new Mailer({...this.nodemailerProps, service: 'none'});
            this.assert.strictEqual(mailer.serviceInstance, false);
            this.assert.strictEqual(Boolean(mailer.readyForSetup), false);
        });
    }

    async testAMissingServicePackageDisablesTheMailer()
    {
        await this.test('a service whose package is not installed leaves the mailer without a service instance', () => {
            MailerServiceRegistry.services[this.missingServiceKey] = {
                packageName: this.missingPackageName,
                factoryClass: NodemailerFactory
            };
            let mailer = new Mailer({...this.nodemailerProps, service: this.missingServiceKey});
            delete MailerServiceRegistry.services[this.missingServiceKey];
            this.assert.strictEqual(mailer.serviceInstance, false);
            this.assert.strictEqual(Boolean(mailer.readyForSetup), false);
        });
    }

    async testTheRegistryReturnsThePackageOfEachService()
    {
        await this.test('the registry returns the npm package of each mailer service', () => {
            this.assert.strictEqual(MailerServiceRegistry.packageName('nodemailer'), 'nodemailer');
            this.assert.strictEqual(MailerServiceRegistry.packageName('sendgrid'), '@sendgrid/mail');
            this.assert.strictEqual(MailerServiceRegistry.packageName('none'), false);
        });
    }

    async testTheRegistryLoadsThePackageFromTheNextPath()
    {
        await this.test('the registry loads the service package from the next path when the first one misses it', () => {
            let packagePaths = [os.tmpdir(), this.projectRoot];
            this.assert.strictEqual(MailerServiceRegistry.loadPackage('nodemailer', packagePaths), require('nodemailer'));
            this.assert.strictEqual(MailerServiceRegistry.loadPackage('none', packagePaths), false);
        });
    }

    async testTheEnvironmentReaderReturnsTheMailerSettings()
    {
        await this.test('the environment reader returns the mailer host and secure settings', () => {
            let mailerVariables = {
                RELDENS_MAILER_ENABLE: '1',
                RELDENS_MAILER_SERVICE: 'nodemailer',
                RELDENS_MAILER_HOST: 'smtp.reldens.test',
                RELDENS_MAILER_SECURE: '0'
            };
            let previousEnvironment = {};
            for(let key of Object.keys(mailerVariables)){
                previousEnvironment[key] = sc.get(process.env, key, false);
                process.env[key] = mailerVariables[key];
            }
            let mailerConfig = EnvironmentVariablesReader.fetchMailerFromEnvironmentVariables();
            for(let key of Object.keys(previousEnvironment)){
                delete process.env[key];
                if(false !== previousEnvironment[key]){
                    process.env[key] = previousEnvironment[key];
                }
            }
            this.assert.strictEqual(mailerConfig.enabled, true);
            this.assert.strictEqual(mailerConfig.service, 'nodemailer');
            this.assert.strictEqual(mailerConfig.host, 'smtp.reldens.test');
            this.assert.strictEqual(mailerConfig.secure, false);
        });
    }

}

module.exports.TestMailer = TestMailer;
