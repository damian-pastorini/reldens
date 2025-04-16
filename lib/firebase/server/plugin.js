/**
 *
 * Reldens - Firebase Server Plugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class FirebasePlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
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
        this.firebaseConfigRoute = this.config.getWithoutLogs(config+'configRoute', GameConst.ROUTE_PATHS.FIREBASE);
        this.isEnabled = this.config.getWithoutLogs(config+'enabled', 1 === Number(env.RELDENS_FIREBASE_ENABLE || 0));
        this.providersKeys = this.config.getWithoutLogs(config+'providers', ['google', 'facebook', 'github']);
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

    declareFirebaseConfigRequestHandler(app)
    {
        app.get(this.firebaseConfigRoute, (req, res) => {
            res.json(this.firebaseConfig());
        });
    }

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
