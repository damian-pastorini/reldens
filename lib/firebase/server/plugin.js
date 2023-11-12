/**
 *
 * Reldens - Firebase Server Plugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class FirebasePlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in FirebasePlugin.');
        }
        this.events.on('reldens.serverBeforeListen', (props) => {
            this.declareFirebaseConfigRequestHandler(props.serverManager.app);
        });
    }

    declareFirebaseConfigRequestHandler(app)
    {
        app.get('/reldens-firebase', (req, res) => {
            res.json(this.firebaseConfig());
        });
    }

    firebaseConfig()
    {
        if(false === Boolean((process.env.RELDENS_FIREBASE_ENABLE || false))){
            return {enabled: false};
        }
        let jsonResponse = {
            enabled: true,
            firebaseConfig: {
                apiKey: process.env.RELDENS_FIREBASE_API_KEY,
                authDomain: process.env.RELDENS_FIREBASE_AUTH_DOMAIN,
                databaseURL: process.env.RELDENS_FIREBASE_DATABASE_URL,
                projectId: process.env.RELDENS_FIREBASE_PROJECT_ID,
                storageBucket: process.env.RELDENS_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.RELDENS_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.RELDENS_FIREBASE_APP_ID
            }
        };
        if(process.env.RELDENS_FIREBASE_MEASUREMENTID && 0 < process.env.RELDENS_FIREBASE_MEASUREMENTID.length){
            jsonResponse.firebaseConfig['measurementId'] = process.env.RELDENS_FIREBASE_MEASUREMENTID;
        }
        return jsonResponse;
    }
}

module.exports.FirebasePlugin = FirebasePlugin;
