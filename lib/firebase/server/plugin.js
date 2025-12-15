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
        this.listenEvents();
        this.mapConfiguration();
    }

    listenEvents() {
        if (!this.events) {
            Logger.error('EventsManager undefined in FirebasePlugin.');
            return false;
        }
        this.events.on('reldens.serverBeforeListen', (props) => {
            this.declareFirebaseConfigRequestHandler(props.serverManager.app);
        });
    }

    mapConfiguration()
    {
        if(!this.config){
            Logger.error('Config undefined in FirebasePlugin.');
            return false;
        }
        let env = process.env;
        let config = 'server/firebase/';
        /** @type {string} */
        this.firebaseConfigRoute = this.config.getWithoutLogs(config+'configRoute', GameConst.ROUTE_PATHS.FIREBASE);
        /** @type {boolean} */
        this.isEnabled = this.config.getWithoutLogs(config+'enabled', 1 === Number(env.RELDENS_FIREBASE_ENABLE || 0));
        /** @type {Array<string>} */
        this.providersKeys = this.config.getWithoutLogs(config+'providers', ['google', 'facebook', 'github']);
        /** @type {Object<string, string>} */
        this.firebaseMappedConfig = {
            apiKey: this.config.getWithoutLogs(config+'apiKey', env.RELDENS_FIREBASE_API_KEY),
            authDomain: this.config.getWithoutLogs(config+'authDomain', env.RELDENS_FIREBASE_AUTH_DOMAIN),
            databaseURL: this.config.getWithoutLogs(config+'databaseURL', env.RELDENS_FIREBASE_DATABASE_URL),
            projectId: this.config.getWithoutLogs(config+'projectId', env.RELDENS_FIREBASE_PROJECT_ID),
            storageBucket: this.config.getWithoutLogs(config+'storageBucket', env.RELDENS_FIREBASE_STORAGE_BUCKET),
            messagingSenderId: this.config.getWithoutLogs(
                config+'messagingSenderId',
                env.RELDENS_FIREBASE_MESSAGING_SENDER_ID
            ),
            appId: this.config.getWithoutLogs(config+'appId', env.RELDENS_FIREBASE_APP_ID)
        };
        let measurementId = this.config.getWithoutLogs(config+'measurementId', env.RELDENS_FIREBASE_MEASUREMENTID);
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
