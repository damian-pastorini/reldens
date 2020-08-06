/**
 *
 * Reldens - FirebaseConnector
 *
 */

const FirebaseApp = require('firebase/app');
const FirebaseAnalytics = require('firebase/analytics');
const FirebaseUi = require('firebaseui');
const { ErrorManager, Logger } = require('@reldens/utils');

class FirebaseConnector
{

    constructor(gameManager)
    {
        if(!gameManager){
            ErrorManager.error('FirebaseConnector - Missing game manager.');
        }
        this.gameManager = gameManager;
        this.analytics = FirebaseAnalytics;
        this.app = FirebaseApp;
        this.ui = FirebaseUi;
        this.authUi = false;
        this.isActive = false;
        this.containerId = '#firebaseui-auth-container';
        // eslint-disable-next-line no-unused-vars
        this.gameManager.events.on('reldens.beforeJoinGame', (props) => {
            // firebase check:
            if(props.formData['formId'] === 'firebase_login'){
                props.gameManager.userData.isFirebaseLogin = true;
            }
        });
    }

    initAuth(firebaseConfig, uiConfig)
    {
        // validate props:
        if(!firebaseConfig || !uiConfig){
            Logger.error('Missing firebase configuration.');
            return false;
        }
        this.firebaseConfig = firebaseConfig;
        this.uiConfig = uiConfig;
        // initialize app:
        this.app.initializeApp(this.firebaseConfig);
        // check for analytics id and initialize if present:
        if({}.hasOwnProperty.call(this.firebaseConfig, 'measurementId')){
            this.app.analytics();
        }
        // initialize auth ui:
        this.authUi = new this.ui.auth.AuthUI(this.app.auth());
        // if callbacks or sign-in success result was not customized then we will use a return false for our default.
        if(!{}.hasOwnProperty.call(this.uiConfig, 'callbacks')){
            this.uiConfig.callbacks = {};
        }
        // our signInSuccessWithAuthResult default callback is to avoid any missing redirect warnings we don't use:
        if(!{}.hasOwnProperty.call(this.uiConfig.callbacks, 'signInSuccessWithAuthResult')){
            // eslint-disable-next-line no-unused-vars
            this.uiConfig.callbacks.signInSuccessWithAuthResult = (currentUser, credential, redirectUrl) => {
                // avoid redirect:
                return false;
            };
        }
    }

}

module.exports.FirebaseConnector = FirebaseConnector;
