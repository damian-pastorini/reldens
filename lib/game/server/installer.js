/**
 *
 * Reldens - Installer
 *
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const { TemplateEngine } = require('./template-engine');
const { DriversMap } = require('./storage/drivers-map');
const { Logger, sc } = require('@reldens/utils');

class Installer
{

    constructor(props)
    {
        this.themeManager = sc.get(props, 'themeManager');
        this.startCallback = sc.get(props, 'startCallback');
        this.secretKey = this.generateSecretKey();
    }

    generateSecretKey()
    {
        return crypto.randomBytes(32).toString('hex');
    }

    isInstalled()
    {
        if('' === sc.get(this.themeManager, 'installationLockPath', '')){
            return false;
        }
        return fs.existsSync(this.themeManager.installationLockPath);
    }

    async prepareSetup(app)
    {
        if(fs.existsSync(this.themeManager.installerPathIndex)){
            await fs.rmSync(this.themeManager.installerPathIndex, {recursive: true});
        }
        Logger.info('Building installer...');
        await this.themeManager.buildInstaller();
        app.use(bodyParser.urlencoded({extended: true}));
        app.use(express.static(
            this.themeManager.installerPath,
            {
                index: false,
                filter: (req, file) => {
                    return '.html' !== path.extname(file);
                }
            }
        ));
        // @NOTE: do not use session secret like this in the app, it is not secure.
        // Include "secure: true" for that case (that only works through SSL):
        // app.use(session({secret: this.secretKey, resave: true, saveUninitialized: true, cookie: {secure: true}}));
        app.use(session({secret: this.secretKey, resave: true, saveUninitialized: true}));
        app.use(async (req, res, next) => {
            return await this.executeForEveryRequest(next, req, res);
        });
        app.post('/install', async (req, res) => {
            return await this.executeInstallProcess(req, res);
        });
    }

    async executeInstallProcess(req, res)
    {
        if(this.isInstalled()){
            return res.redirect('/?redirect=already-installed');
        }
        let templateVariables = req.body;
        templateVariables['app-limit-key-generator'] = '' !== templateVariables['app-trusted-proxy'] ? 1 : 0;
        this.setCheckboxesMissingValues(templateVariables);
        this.setSelectedOptions(templateVariables);
        req.session.templateVariables = templateVariables;
        let selectedDriver = DriversMap[templateVariables['db-storage-driver']];
        if(!selectedDriver){
            Logger.critical('Invalid storage driver: ' + templateVariables['db-storage-driver']);
            return res.redirect('/?error=invalid-driver');
        }
        let dbConfig = {
            client: templateVariables['db-client'],
            config: {
                host: templateVariables['db-host'],
                port: Number(templateVariables['db-port']),
                database: templateVariables['db-name'],
                user: templateVariables['db-username'],
                password: templateVariables['db-password'],
                multipleStatements: true
            },
            debug: '1' === process?.env?.RELDENS_DEBUG_QUERIES
        };
        try {
            let dbDriver = new selectedDriver(dbConfig);
            if(!await dbDriver.connect()){
                Logger.critical('Connection failed, please check the storage configuration.');
                return res.redirect('/?error=connection-failed');
            }
            if(!sc.isObjectFunction(dbDriver, 'rawQuery')){
                Logger.critical('Method "rawQuery" not found in the specified storage driver.');
                return res.redirect('/?error=raw-query-not-found');
            }
            let migrationsPath = path.join(this.themeManager.reldensModulePath, 'migrations', 'production');
            await this.executeQueryFile(migrationsPath, dbDriver, 'reldens-install-v4.0.0.sql');
            Logger.info('Installed tables.');
            if('1' === templateVariables['db-basic-config']){
                await this.executeQueryFile(migrationsPath, dbDriver, 'reldens-basic-config-v4.0.0.sql');
                Logger.info('Installed basic-config.');
            }
            if('1' === templateVariables['db-sample-data']){
                await this.executeQueryFile(migrationsPath, dbDriver, 'reldens-sample-data-v4.0.0.sql');
                Logger.info('Installed sample-data.');
            }
        } catch (error) {
            Logger.critical('There was an error during the installation process.', error);
            return res.redirect('/?error=db-installation-process-failed');
        }
        if('' === templateVariables['app-admin-path']){
            templateVariables['app-admin-path'] = '/reldens-admin';
        }
        if('' === templateVariables['app-admin-secret']){
            return res.redirect('/?error=db-installation-process-failed-missing-admin-secret');
        }
        let envFilePath = path.join(this.themeManager.projectRoot, '.env');
        let knexFilePath = path.join(this.themeManager.projectRoot, 'knexfile.js');
        let lockFilePath = path.join(this.themeManager.projectRoot, 'install.lock');
        try {
            let envDistTemplate = fs.readFileSync(
                this.themeManager.reldensModulePathInstallTemplateEnvDist,
                {encoding: this.encoding()}
            );
            let envFileContent = await TemplateEngine.render(envDistTemplate, templateVariables);
            fs.writeFileSync(envFilePath, envFileContent);
            let knexDistTemplate = fs.readFileSync(
                this.themeManager.reldensModulePathInstallTemplateKnexDist,
                {encoding: this.encoding()}
            );
            let knexFileContent = await TemplateEngine.render(knexDistTemplate, templateVariables);
            fs.writeFileSync(knexFilePath, knexFileContent);
            fs.writeFileSync(lockFilePath, '');
            Logger.info('Installation success!');
            if(this.startCallback){
                Logger.info('Running Server Start callback...');
                await this.startCallback();
            }
            return res.redirect('/?success=1');
        } catch (error) {
            if(fs.existsSync(envFilePath)){
                fs.rmSync(envFilePath);
            }
            if(fs.existsSync(knexFilePath)){
                fs.rmSync(knexFilePath);
            }
            if(fs.existsSync(lockFilePath)){
                fs.rmSync(lockFilePath);
            }
            Logger.critical('There was an error during the theme creation process.', error);
            return res.redirect('/?error=installation-process-failed');
        }
    }

    async executeForEveryRequest(next, req, res)
    {
        if(this.isInstalled()){
            return next();
        }
        if('' === req._parsedUrl.pathname || '/' === req._parsedUrl.pathname){
            let installerIndexTemplate = fs.readFileSync(
                this.themeManager.installerPathIndex,
                {encoding: this.encoding()}
            );
            let templateVariables = req?.session?.templateVariables || this.fetchDefaults();
            return res.send(await TemplateEngine.render(installerIndexTemplate, templateVariables));
        }
        if(!req.url.endsWith('.html')){
            return express.static(this.themeManager.installerPath)(req, res, next);
        }
        next();
    }

    fetchDefaults()
    {
        let host = (process.env.RELDENS_HOST || '').toString();
        let port = (process.env.RELDENS_PORT || '').toString();
        let publicUrl = (process.env.RELDENS_PUBLIC_URL || '').toString();
        let trustedProxy = (process.env.RELDENS_EXPRESS_TRUSTED_PROXY || '').toString();
        let adminPath = (process.env.RELDENS_ADMIN_ROUTE_PATH || '').toString();
        let secureAdmin = Number(process.env.RELDENS_ADMIN_SECURE_LOGIN || 1);
        let hotPlug = Number(process.env.RELDENS_HOT_PLUG || 1);
        let dbClient = (process.env.RELDENS_DB_CLIENT || '').toString();
        let dbHost = (process.env.RELDENS_DB_HOST || '').toString();
        let dbPort = (process.env.RELDENS_DB_PORT || '').toString();
        let dbName = (process.env.RELDENS_DB_NAME || '').toString();
        return {
            'app-host': '' !== host ? host : 'http://localhost',
            'app-port': '' !== port ? port : '8080',
            'app-public-url': '' !== publicUrl ? publicUrl : 'http://localhost:8080',
            'app-trusted-proxy': trustedProxy,
            'app-admin-path': '' !== adminPath ? adminPath : '/reldens-admin',
            'app-secure-admin-checked': 1 === secureAdmin ? ' checked="checked"' : '',
            'app-admin-hot-plug-checked': 1 === hotPlug ? ' checked="checked"' : '',
            'db-client': '' !== dbClient ? dbClient : 'mysql',
            'db-host': '' !== dbHost ? dbHost : 'localhost',
            'db-port': '' !== dbPort ? dbPort : '3306',
            'db-name': '' !== dbName ? dbName : 'reldens',
            'db-basic-config-checked': ' checked="checked"',
            'db-sample-data-checked': ' checked="checked"'
        };
    }

    async executeQueryFile(migrationsPath, dbDriver, fileName)
    {
        await dbDriver.rawQuery(
            fs.readFileSync(path.join(migrationsPath, fileName), {encoding: this.encoding()}).toString()
        );
    }

    encoding()
    {
        return process.env.RELDENS_DEFAULT_ENCODING || 'utf8';
    }

    setCheckboxesMissingValues(templateVariables)
    {
        this.setVariable(templateVariables, 'app-secure-admin');
        this.setVariable(templateVariables, 'app-admin-hot-plug');
        this.setVariable(templateVariables, 'app-use-https');
        this.setVariable(templateVariables, 'app-use-monitor');
        this.setVariable(templateVariables, 'app-secure-monitor');
        this.setVariable(templateVariables, 'db-basic-config');
        this.setVariable(templateVariables, 'db-sample-data');
        this.setVariable(templateVariables, 'mailer-enable');
        this.setVariable(templateVariables, 'mailer-secure');
        this.setVariable(templateVariables, 'firebase-enable');
    }

    setVariable(templateVariables, checkboxId)
    {
        if(!sc.hasOwn(templateVariables, checkboxId)){
            templateVariables[checkboxId] = '0';
            return;
        }
        templateVariables[checkboxId+'-checked'] = ' checked="checked"';
    }

    setSelectedOptions(templateVariables)
    {
        let selectedDriver = templateVariables['db-storage-driver'];
        templateVariables['db-storage-driver-objection-js'] = 'objection-js' === selectedDriver
            ? ' selected="selected"'
            : '';
        templateVariables['db-storage-driver-mikro-orm'] = 'mikro-orm' === selectedDriver
            ? ' selected="selected"'
            : '';
        let selectedMailer = templateVariables['mailer-service'];
        templateVariables['mailer-service-sendgrid'] = 'sendgrid' === selectedMailer
            ? ' selected="selected"'
            : '';
        templateVariables['mailer-service-nodemailer'] = 'nodemailer' === selectedMailer
            ? ' selected="selected"'
            : '';
    }

}

module.exports.Installer = Installer;
