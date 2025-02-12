/**
 *
 * Reldens - FirebaseConnector
 *
 */

const FirebaseApp = require('firebase/compat/app').default;
const FirebaseAnalytics = require('firebase/compat/analytics');
const FirebaseAuth = require('firebase/auth');
const FirebaseUi = require('firebaseui');
const { ErrorsBlockHandler } = require('../../game/client/handlers/errors-block-handler');
const { GameConst } = require('../../game/constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class FirebaseConnector
{

    constructor(gameManager)
    {
        if(!gameManager){
            ErrorManager.error('FirebaseConnector - Missing game manager.');
        }
        this.gameManager = gameManager;
        this.gameDom = this.gameManager.gameDom;
        this.analytics = FirebaseAnalytics;
        this.app = FirebaseApp;
        this.firebaseAuth = FirebaseAuth;
        this.ui = FirebaseUi;
        this.authUi = false;
        this.isActive = false;
        this.containerId = '#firebaseui-auth-container';
        this.uiConfig = {
            signInOptions: [
                // uncomment, add or remove options as you need:
                // {provider: this.auth.EmailAuthProvider.PROVIDER_ID}
                {provider: this.firebaseAuth.GoogleAuthProvider.PROVIDER_ID},
                {provider: this.firebaseAuth.FacebookAuthProvider.PROVIDER_ID},
                // {provider: this.auth.TwitterAuthProvider.PROVIDER_ID},
                {provider: this.firebaseAuth.GithubAuthProvider.PROVIDER_ID}
            ],
            // this is to avoid the redirect in the game window:
            signInFlow: 'popup'
        };
        this.gameManager.events.on('reldens.beforeJoinGame', (props) => {
            if(props.formData['formId'] === 'firebase-login'){
                props.gameManager.userData.isFirebaseLogin = true;
            }
        });
    }

    startFirebase()
    {
        // @TODO - BETA - Refactor in multiple functions.
        let firebaseUrl = this.gameManager.appServerUrl+GameConst.ROUTE_PATHS.FIREBASE;
        this.gameDom.getJSON(firebaseUrl, (err, response) => {
            if(!response.enabled){
                return false;
            }
            let firebaseConfig = response.firebaseConfig;
            this.initAuth(firebaseConfig, this.uiConfig);
            // logout on refresh:
            this.gameDom.getWindow().addEventListener('beforeunload', () => {
                if(this.isActive){
                    this.app.auth().signOut();
                }
            });
            // check the current auth state:
            this.app.auth().onAuthStateChanged((user) => {
                user ? this.setActiveUser(user) : this.startAuthUi();
                return false;
            });
            let firebaseLogin = this.gameDom.getElement('#firebase-login');
            if(firebaseLogin){
                this.activateLoginBehavior(firebaseLogin);
            }
        });
    }

    activateLoginBehavior(firebaseLogin)
    {
        firebaseLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            if(!firebaseLogin.checkValidity()){
                return false;
            }
            this.gameDom.getElement('.firebase-row-container').classList.remove('hidden');
        });
        let firebaseUser = this.gameDom.getElement('#firebase-username');
        if(!firebaseUser){
            return false;
        }
        this.gameDom.getElement('.firebase-row-container').classList.remove('hidden');
        firebaseUser.addEventListener('change', () => {
            ErrorsBlockHandler.reset(firebaseLogin);
        });
        firebaseUser.addEventListener('focus', () => {
            ErrorsBlockHandler.reset(firebaseLogin);
        });
    }

    startAuthUi()
    {
        // if not logged then start the auth ui:
        this.isActive = false;
        if(this.gameDom.getElement(this.containerId)){
            this.gameDom.getElement(this.containerId).innerHTML = '';
        }
        this.authUi.start(this.containerId, this.uiConfig);
    }

    setActiveUser(user)
    {
        this.isActive = true;
        let formData = {
            formId: 'firebase-login',
            email: user.email,
            username: this.gameDom.getElement('#firebase-username').value,
            password: user.uid
        };
        this.gameManager.startGame(formData, true);
    }

    initAuth(firebaseConfig, uiConfig)
    {
        if(!firebaseConfig || !uiConfig){
            Logger.error('Missing firebase configuration.');
            return false;
        }
        this.firebaseConfig = firebaseConfig;
        this.uiConfig = uiConfig;
        this.app.initializeApp(this.firebaseConfig);
        if(sc.hasOwn(this.firebaseConfig, 'measurementId')){
            this.app.analytics();
        }
        this.authUi = new this.ui.auth.AuthUI(this.app.auth());
        // if callbacks or sign-in success result was not customized then we will use a return false for our default:
        if(!sc.hasOwn(this.uiConfig, 'callbacks')){
            this.uiConfig.callbacks = {};
        }
        // our signInSuccessWithAuthResult default callback is to avoid any missing redirect warnings we don't use:
        if(!sc.hasOwn(this.uiConfig.callbacks, 'signInSuccessWithAuthResult')){
            this.uiConfig.callbacks.signInSuccessWithAuthResult = () => {
                // avoid redirect:
                return false;
            };
        }
    }

}

module.exports.FirebaseConnector = FirebaseConnector;
