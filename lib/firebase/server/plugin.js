/**
 *
 * Reldens - Firebase Server Plugin
 *
 * Server-side plugin that integrates Firebase authentication with Reldens. Loads Firebase configuration
 * from the config manager or environment variables, exposes a configuration endpoint for the client,
 * and manages authentication provider settings (Google, Facebook, GitHub).
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { FirebaseIdTokenVerifier } = require('./firebase-id-token-verifier');
const { FirebaseConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('express').Application} ExpressApplication
 *
 * @typedef {Object} FirebasePluginProps
 * @property {EventsManager} events
 * @property {ConfigManager} config
 */
class FirebasePlugin extends PluginInterface
{

    /**
     * @param {FirebasePluginProps} props
     * @returns {Promise<void>}
     */
    async setup(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        /** @type {Object<string, any>} */
        this.configServer = sc.get(props, 'configServer', {});
        this.listenEvents();
        this.mapConfiguration();
        /** @type {FirebaseIdTokenVerifier} */
        this.idTokenVerifier = new FirebaseIdTokenVerifier({
            apiKey: sc.get(this.firebaseMappedConfig, 'apiKey', ''),
            passwordSecret: this.passwordSecret
        });
    }

    listenEvents() {
        if (!this.events) {
            Logger.error('EventsManager undefined in FirebasePlugin.');
            return false;
        }
        this.events.on('reldens.serverBeforeListen', (props) => {
            this.declareFirebaseConfigRequestHandler(props.serverManager.app);
            let rateLimitConfigurer = props.serverManager.appServerFactory?.rateLimitConfigurer;
            if(rateLimitConfigurer){
                props.serverManager.app.use(
                    FirebaseConst.ROUTE_PATHS.VERIFY_ID_TOKEN,
                    rateLimitConfigurer.createHomeLimiter()
                );
            }
            this.declareVerifyIdTokenRequestHandler(props.serverManager.app);
        });
        this.events.on('reldens.processUserRequestIsValidDataBefore', (loginManager, userData) => {
            this.idTokenVerifier.applyVerifiedLogin(userData);
        });
        this.events.on('reldens.loginPasswordValidationFallback', async (passwordValidation) => {
            await this.idTokenVerifier.migrateLegacyPassword(passwordValidation);
        });
    }

    mapConfiguration()
    {
        if(!this.config){
            Logger.error('Config undefined in FirebasePlugin.');
            return false;
        }
        let firebaseEnvironment = sc.get(this.configServer, 'firebase', {});
        let config = 'server/firebase/';
        /** @type {string} */
        this.firebaseConfigRoute = this.config.getWithoutLogs(config+'configRoute', GameConst.ROUTE_PATHS.FIREBASE);
        /** @type {boolean} */
        this.isEnabled = this.config.getWithoutLogs(config+'enabled', sc.get(firebaseEnvironment, 'enabled', false));
        /** @type {Array<string>} */
        this.providersKeys = this.config.getWithoutLogs(config+'providers', ['google', 'facebook', 'github']);
        /** @type {string} */
        this.passwordSecret = sc.get(this.configServer.security, 'signedTokensSecret', '');
        /** @type {Object<string, string>} */
        this.firebaseMappedConfig = {
            apiKey: this.config.getWithoutLogs(config+'apiKey', firebaseEnvironment.apiKey),
            authDomain: this.config.getWithoutLogs(config+'authDomain', firebaseEnvironment.authDomain),
            databaseURL: this.config.getWithoutLogs(config+'databaseURL', firebaseEnvironment.databaseURL),
            projectId: this.config.getWithoutLogs(config+'projectId', firebaseEnvironment.projectId),
            storageBucket: this.config.getWithoutLogs(config+'storageBucket', firebaseEnvironment.storageBucket),
            messagingSenderId: this.config.getWithoutLogs(
                config+'messagingSenderId',
                firebaseEnvironment.messagingSenderId
            ),
            appId: this.config.getWithoutLogs(config+'appId', firebaseEnvironment.appId)
        };
        let measurementId = this.config.getWithoutLogs(config+'measurementId', firebaseEnvironment.measurementId);
        if (measurementId) {
            this.firebaseMappedConfig['measurementId'] = measurementId;
        }
    }

    /**
     * @param {ExpressApplication} app
     */
    declareFirebaseConfigRequestHandler(app)
    {
        app.get(this.firebaseConfigRoute, (req, res) => {
            res.json(this.firebaseConfig());
        });
    }

    /**
     * @param {ExpressApplication} app
     */
    declareVerifyIdTokenRequestHandler(app)
    {
        app.post(FirebaseConst.ROUTE_PATHS.VERIFY_ID_TOKEN, async (req, res) => {
            if(!this.isEnabled){
                return res.json({isSuccess: false});
            }
            let body = sc.get(req, 'body', {});
            res.json({
                isSuccess: await this.idTokenVerifier.verify(sc.get(body, 'idToken', ''), sc.get(body, 'uid', ''))
            });
        });
    }

    /**
     * @returns {Object}
     */
    firebaseConfig()
    {
        if(!this.isEnabled){
            return {enabled: false};
        }
        return {
            enabled: true,
            firebaseConfig: this.firebaseMappedConfig,
            providersKeys: this.providersKeys
        };
    }
}

module.exports.FirebasePlugin = FirebasePlugin;
