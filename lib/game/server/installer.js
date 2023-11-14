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
const TemplateEngine = require('mustache');
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
        Logger.info('Re-building installer.');
        await this.themeManager.buildInstaller();
        app.use(bodyParser.urlencoded({extended: true}));
        app.use(express.static(this.themeManager.installerPath));
        app.use(session({secret: this.secretKey, resave: true, saveUninitialized: true}));
        app.use((req, res, next) => {
            if('1' === req.params.success && this.startCallback){
                Logger.info('Installation success, starting server...');
                return this.startCallback();
            }
            if(this.isInstalled()){
                return next();
            }
            if('' === req.originalUrl || '/' === req.originalUrl){
                if(req.session.templateVariables){
                    let installerIndexTemplate = fs.readFileSync(
                        this.themeManager.installerPathIndex,
                        {encoding: this.encoding()}
                    );
                    TemplateEngine.render(installerIndexTemplate, req.session.templateVariables);
                    return res.send(installerIndexTemplate);
                }
                return res.sendFile(this.themeManager.installerPathIndex);
            }
            next();
        });
        app.post('/install', async (req, res) => {
            let templateVariables = req.body;
            this.setCheckboxesMissingValues(templateVariables);
            req.session.templateVariables = templateVariables;
            let selectedDriver = DriversMap[templateVariables['db-storage-driver']];
            if(!selectedDriver){
                Logger.critical('Invalid storage driver: '+templateVariables['db-storage-driver']);
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
            let dbDriver = new selectedDriver(dbConfig);
            if (!await dbDriver.connect()){
                Logger.critical('Connection failed, please check the storage configuration.');
                return res.redirect('/?error=connection-failed');
            }
            if(!sc.isObjectFunction(dbDriver, 'rawQuery')){
                Logger.critical('Method "rawQuery" not found in the specified storage driver.');
                return res.redirect('/?error=rawQuery-not-found');
            }
            try {
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
            } catch (err) {
                Logger.critical('There was an error during the installation process.', err);
                return res.redirect('/?error=installation-process-failed');
            }
            if('' === templateVariables['app-admin-path']){
                templateVariables['app-admin-path'] = '/reldens-admin';
            }
            let envDistTemplate = fs.readFileSync(
                this.themeManager.reldensModulePathInstallTemplateEnvDist,
                {encoding: this.encoding()}
            );
            let envFileContent = TemplateEngine.render(envDistTemplate, templateVariables);
            fs.writeFileSync(path.join(this.themeManager.projectRoot, '.env'), envFileContent);
            let knexDistTemplate = fs.readFileSync(
                this.themeManager.reldensModulePathInstallTemplateKnexDist,
                {encoding: this.encoding()}
            );
            let knexFileContent = TemplateEngine.render(knexDistTemplate, templateVariables);
            fs.writeFileSync(path.join(this.themeManager.projectRoot, 'knexfile.js'), knexFileContent);
            fs.writeFileSync(path.join(this.themeManager.projectRoot, 'install.lock'), '');
            return res.redirect('/?success=1');
        });
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
        this.setVariable(templateVariables, 'app-use-https');
        this.setVariable(templateVariables, 'app-secure-admin');
        this.setVariable(templateVariables, 'mailer-monitor');
        this.setVariable(templateVariables, 'secure-monitor');
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
        }
    }

}

module.exports.Installer = Installer;
