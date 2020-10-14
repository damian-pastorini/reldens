/**
 *
 * Reldens - ServerManager
 *
 * This class will handle the server initialization for the following processes: create the client app, connect to the
 * data server, initialize the features, define the rooms, create the client dist and start the game.
 *
 */

const dotenv = require('dotenv');
const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { AwaitMiddleware } = require('./await-middleware');
const { GameServer } = require('./game-server');
const { DataServer } = require('@reldens/storage');
const { ConfigManager } = require('../../config/server/manager');
const { FeaturesManager } = require('../../features/server/manager');
const { UsersManager } = require('../../users/server/manager');
const { LoginManager } = require('./login');
const { RoomsManager } = require('../../rooms/server/manager');
const { Mailer } = require('./mailer');
const { ThemeManager } = require('./theme-manager');
const { MapsLoader } = require('./maps-loader');
const { EventsManagerSingleton, Logger } = require('@reldens/utils');

class ServerManager
{

    constructor(config)
    {
        try {
            // initialize configurations:
            this.initializeConfiguration(config);
            // server events:
            this.events = EventsManagerSingleton;
            // initialize storage:
            DataServer.initialize();
            ThemeManager.validateOrCreateTheme(config);
            MapsLoader.loadMaps(path.join(config.projectRoot, ThemeManager.projectTheme), this.configManager);
        } catch (e) {
            Logger.error('Broken ServerManager. ' + e.message);
            process.exit();
        }
    }

    initializeConfiguration(config)
    {
        // configuration data from database:
        this.configManager = new ConfigManager();
        // save project root:
        this.projectRoot = config.projectRoot || './';
        Logger.info(['Project root:', this.projectRoot, 'Module root:', __dirname]);
        // setup dotenv to use the project root .env file:
        let envPath = path.join(this.projectRoot, '.env');
        dotenv.config({debug: process.env.DEBUG, path: envPath});
        // setup the server host data:
        this.configServer = {
            port: Number(process.env.PORT) || Number(process.env.RELDENS_APP_PORT) || 8080,
            host: process.env.RELDENS_APP_HOST || 'http://localhost',
            monitor: {
                enabled: process.env.RELDENS_MONITOR || false,
                auth: process.env.RELDENS_MONITOR_AUTH || false,
                user: process.env.RELDENS_MONITOR_USER,
                pass: process.env.RELDENS_MONITOR_PASS,
            }
        };
        if(config.customClasses){
            this.configManager.configList.server.customClasses = config.customClasses;
        } else {
            Logger.error('\nMissing customClasses definition!'
                +'\nYou can pass an empty object to avoid this or copy into your theme the default file from:'
                +'\nnode_modules/reldens/theme/packages/server.js'
                +'\nNormally a default copy is been made automatically on the first time you run the project.'
                +'\nThen you need to require the module and pass it as property in your ServerManager initialization.'
                +'\nFor reference check the theme/project-index.js.sample file, you probably just need to uncomment'
                +' the customClasses related lines.\n');
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async start()
    {
        Logger.info('Starting Server Manager!');
        await this.createServer();
        await this.initializeManagers();
        // after the rooms were loaded then finish the server process:
        await EventsManagerSingleton.emit('reldens.serverBeforeListen', {serverManager: this});
        await this.gameServer.listen(this.configServer.port);
        Logger.info('Listening on '+this.configServer.host+':'+this.configServer.port);
        this.configManager.configList.server.baseUrl = this.configServer.host+':'+this.configServer.port;
        await this.createClientBundle();
        await EventsManagerSingleton.emit('reldens.serverReady', {serverManager: this});
    }

    async createServer()
    {
        await EventsManagerSingleton.emit('reldens.serverStartBegin', {serverManager: this});
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        if(process.env.RELDENS_EXPRESS_SERVE_STATICS){
            // automatically serve dist files:
            let distPath = path.join(this.projectRoot, 'dist');
            this.app.use('/', express.static(distPath));
        }
        let runningHttps = false;
        if(process.env.RELDENS_EXPRESS_USE_HTTPS){
            // read certificates:
            const credentials = {
                key: fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_PRIVATE_KEY, 'utf8'),
                cert: fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_CERT, 'utf8')
            };
            if(process.env.RELDENS_EXPRESS_HTTPS_CHAIN){
                credentials['ca'] = fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_CHAIN, 'utf8');
            }
            if(process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE){
                credentials['passphrase'] = process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE;
            }
            this.appServer = https.createServer(credentials, this.app);
            runningHttps = true;
        }
        // if https is not running then by default we will run on http:
        if(!runningHttps){
            this.appServer = http.createServer(this.app);
        }
        // create game server instance:
        this.gameServer = new GameServer({server: this.appServer, express: this.app});
        // attach web monitoring panel (optional):
        if(this.configServer.monitor.enabled){
            this.gameServer.attachMonitor(this.app, this.configServer.monitor);
        }
    }

    async initializeManagers()
    {
        // get config processor instance:
        let configProcessor = await this.configManager.loadAndGetProcessor();
        // save project root for later use:
        configProcessor.projectRoot = this.projectRoot;
        // theme root:
        configProcessor.projectTheme = ThemeManager.projectTheme;
        await EventsManagerSingleton.emit('reldens.serverConfigReady', {serverManager: this, configProcessor: configProcessor});
        // mailer:
        this.mailer = new Mailer();
        Logger.info(['Mailer Configured:', this.mailer.isEnabled()]);
        await this.setupForgotPassword();
        // features manager:
        this.featuresManager = new FeaturesManager();
        // load the available features list and append to the config, this way we will pass the list to the client:
        configProcessor.availableFeaturesList = await this.featuresManager.loadFeatures();
        await EventsManagerSingleton.emit('reldens.serverConfigFeaturesReady', {
            serverManager: this,
            configProcessor: configProcessor
        });
        // users manager:
        this.usersManager = new UsersManager();
        // the rooms manager will receive the features rooms to be defined:
        this.roomsManager = new RoomsManager();
        await EventsManagerSingleton.emit('reldens.serverBeforeLoginManager', {serverManager: this});
        // login manager:
        this.loginManager = new LoginManager({
            config: configProcessor,
            usersManager: this.usersManager,
            roomsManager: this.roomsManager,
            mailer: this.mailer,
            themeManager: ThemeManager
        });
        // prepare rooms:
        await EventsManagerSingleton.emit('reldens.serverBeforeDefineRooms', {serverManager: this});
        await this.roomsManager.defineRoomsInGameServer(this.gameServer, {
            loginManager: this.loginManager,
            config: configProcessor
        });
    }

    async createClientBundle()
    {
        let runBundler = process.env.RELDENS_PARCEL_RUN_BUNDLER || false;
        if(!runBundler){
            return false;
        }
        if(process.env.RELDENS_ON_BUNDLE_RESET_DIST){
            await ThemeManager.resetDist();
        }
        if(process.env.RELDENS_ON_BUNDLE_RESET_DIST || process.env.RELDENS_ON_BUNDLE_COPY_ASSETS){
            await ThemeManager.copyAssetsToDist();
        }
        // create bundle:
        const bundlerOptions = {
            production: process.env.NODE_ENV === 'production',
            sourceMaps: process.env.RELDENS_PARCEL_SOURCEMAPS || false
        };
        let indexPath = path.join(this.projectRoot, ThemeManager.projectTheme, 'index.html');
        Logger.info('Running bundle on: ' + indexPath);
        this.bundler = new AwaitMiddleware(indexPath, bundlerOptions);
        let middleware = await this.bundler.middleware();
        this.app.use(middleware);
    }

    async setupForgotPassword()
    {
        this.app.use('/reset-password', async (req, res) => {
            let rEmail = req.query.email;
            let rId = req.query.id;
            let user = false;
            let resetResult = '';
            if(rEmail && rId){
                user = await this.usersManager.loadUserByEmail(rEmail);
            }
            if(!user || user.password !== rId){
                let resetErrorPath = path.join('assets', 'email', 'reset-error.html');
                resetResult = await ThemeManager.loadAndRenderTemplate(resetErrorPath);
            } else {
                let newPass = this.loginManager.pwManager.makeId(12);
                let newPassHash = this.loginManager.pwManager.encryptPassword(newPass);
                await this.usersManager.updateUserByEmail(rEmail, {password: newPassHash});
                let resetSuccessPath = path.join('assets', 'email', 'reset-success.html');
                resetResult = await ThemeManager.loadAndRenderTemplate(resetSuccessPath, {newPass: newPass});
            }
            let resetPath = path.join('assets', 'email', 'reset.html');
            let content = await ThemeManager.loadAndRenderTemplate(resetPath, {resetResult: resetResult});
            res.send(content);
        });
    }

}

module.exports.ServerManager = ServerManager;
