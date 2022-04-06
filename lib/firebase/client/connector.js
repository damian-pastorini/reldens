/**
 *
 * Reldens - FirebaseConnector
 *
 */

const FirebaseApp = require('firebase/compat/app').default;
const FirebaseAnalytics = require('firebase/compat/analytics');
const FirebaseAuth = require('firebase/auth');
const FirebaseUi = require('firebaseui');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

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
        this.firebaseAuth = FirebaseAuth;
        this.ui = FirebaseUi;
        this.authUi = false;
        this.isActive = false;
        this.containerId = '#firebaseui-auth-container';
        this.startGameCallback = () => {};
        this.resetErrorBlockCallback = () => {};
        // eslint-disable-next-line no-unused-vars
        this.gameManager.events.on('reldens.beforeJoinGame', (props) => {
            // firebase check:
            if(props.formData['formId'] === 'firebase_login'){
                props.gameManager.userData.isFirebaseLogin = true;
            }
        });
    }

    startFirebase()
    {
        // @TODO - BETA - Refactor in multiple functions.
        this.gameManager.gameDom.getJSON(this.gameManager.appServerUrl+'/reldens-firebase', (err, response) => {
            if(!response.enabled){
                return false;
            }
            let firebaseConfig = response.firebaseConfig;
            let uiConfig = {
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
            this.initAuth(firebaseConfig, uiConfig);
            // logout on refresh:
            this.gameManager.gameDom.getWindow().addEventListener('beforeunload', () => {
                if(this.isActive){
                    this.app.auth().signOut();
                }
            });
            // check the current auth state:
            this.app.auth().onAuthStateChanged((user) => {
                user ? this.setActiveUser(user) : this.startAuthUi();
                return false;
            });
            let firebaseLogin = this.gameManager.gameDom.getElement('#firebase_login');
            if(firebaseLogin){
                this.activateLoginBehavior(firebaseLogin);
            }
        });
    }

    activateLoginBehavior(firebaseLogin)
    {
        firebaseLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            // validate form:
            if (!firebaseLogin.checkValidity()) {
                return false;
            }
            // show login options:
            this.gameManager.gameDom.getElement('#firebaseui-auth-container').style.display = 'block';
            this.gameManager.gameDom.getElement('#firebaseui-auth-container').classList.remove('hidden');
        });
        let firebaseUser = this.gameManager.gameDom.getElement('#firebase_username');
        if (firebaseUser) {
            // show login options:
            // @NOTE here you could always display the options or include a length validation like:
            // if(firebaseUser.value.length){
            this.gameManager.gameDom.getElement('#firebaseui-auth-container').style.display = 'block';
            this.gameManager.gameDom.getElement('#firebaseui-auth-container').classList.remove('hidden');
            // }
            // and only display the options after the user completed the username field (see index.html around line 54).
            firebaseUser.addEventListener('change', () => {
                this.resetErrorBlockCallback(firebaseLogin);
            });
            firebaseUser.addEventListener('focus', () => {
                this.resetErrorBlockCallback(firebaseLogin);
            });
        }
    }

    startAuthUi()
    {
        // if not logged then start the auth ui:
        this.isActive = false;
        if (this.gameManager.gameDom.getElement(this.containerId)) {
            this.gameManager.gameDom.getElement(this.containerId).innerHTML = '';
        }
        this.authUi.start(this.containerId, this.uiConfig);
    }

    setActiveUser(user)
    {
        this.isActive = true;
        let formData = {
            formId: 'firebase_login',
            email: user.email,
            username: this.gameManager.gameDom.getElement('#firebase_username').value,
            password: user.uid
        };
        this.startGameCallback(formData, true);
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
        if(sc.hasOwn(this.firebaseConfig, 'measurementId')){
            this.app.analytics();
        }
        // initialize auth ui:
        this.authUi = new this.ui.auth.AuthUI(this.app.auth());
        // if callbacks or sign-in success result was not customized then we will use a return false for our default.
        if(!sc.hasOwn(this.uiConfig, 'callbacks')){
            this.uiConfig.callbacks = {};
        }
        // our signInSuccessWithAuthResult default callback is to avoid any missing redirect warnings we don't use:
        if(!sc.hasOwn(this.uiConfig.callbacks, 'signInSuccessWithAuthResult')){
            // eslint-disable-next-line no-unused-vars
            this.uiConfig.callbacks.signInSuccessWithAuthResult = (authResult, redirectUrl) => {
                // avoid redirect:
                return false;
            };
        }
    }

}

module.exports.FirebaseConnector = FirebaseConnector;
