/**
 *
 * Reldens - FirebaseConnector
 *
 * Handles Firebase authentication integration on the client-side. Manages authentication providers
 * (Google, Facebook, GitHub), configures Firebase SDK, handles sign-in flows with popup authentication,
 * and coordinates with the game's login system. Integrates with GameManager and GameDom for UI updates.
 *
 */

const FirebaseApp = require('firebase/compat/app').default;
const FirebaseAnalytics = require('firebase/compat/analytics');
const FirebaseAuth = require('firebase/compat/auth');
const { ErrorsBlockHandler } = require('../../game/client/handlers/errors-block-handler');
const { GameConst } = require('../../game/constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('../../game/client/game-dom').GameDom} GameDom
 * @typedef {import('firebase/compat/app').default} FirebaseAppModule
 *
 * @typedef {Object} FirebaseProvider
 * @property {string} label
 * @property {Object} authMethod
 */
class FirebaseConnector
{

    /**
     * @param {GameManager} gameManager
     */
    constructor(gameManager)
    {
        if(!gameManager){
            ErrorManager.error('FirebaseConnector - Missing game manager.');
        }
        /** @type {GameManager} */
        this.gameManager = gameManager;
        /** @type {GameDom} */
        this.gameDom = this.gameManager.gameDom;
        /** @type {typeof FirebaseAnalytics} */
        this.analytics = FirebaseAnalytics;
        /** @type {typeof FirebaseApp} */
        this.app = FirebaseApp;
        /** @type {typeof FirebaseAuth} */
        this.auth = FirebaseAuth;
        /** @type {Object|false} */
        this.initializedApp = false;
        /** @type {boolean} */
        this.isActive = false;
        /** @type {string} */
        this.containerId = '#firebase-auth-container';
        /** @type {Object<string, FirebaseProvider>} */
        this.activeProviders = {};
        /** @type {Object<string, FirebaseProvider>} */
        this.defaultProviders = {};
        this.gameManager.events.on('reldens.beforeJoinGame', (props) => {
            if(props.formData['formId'] === 'firebase-login'){
                props.gameManager.userData.isFirebaseLogin = true;
            }
        });
    }

    /**
     * @returns {Object<string, FirebaseProvider>}
     */
    fetchDefaultProviders()
    {
        return {
            google: {
                label: 'Sign in with Google',
                authMethod: new this.app.auth.GoogleAuthProvider()
            },
            facebook: {
                label: 'Sign in with Facebook',
                authMethod: new this.app.auth.FacebookAuthProvider()
            },
            github: {
                label: 'Sign in with GitHub',
                authMethod: new this.app.auth.GithubAuthProvider()
            }
        };
    }

    startFirebase()
    {
        let firebaseUrl = this.gameManager.appServerUrl+GameConst.ROUTE_PATHS.FIREBASE;
        this.gameDom.getJSON(firebaseUrl, (err, response) => {
            if(!response.enabled){
                return false;
            }
            let firebaseConfig = response.firebaseConfig;
            this.initAuth(firebaseConfig);
            // logout on refresh:
            this.gameDom.getWindow().addEventListener('beforeunload', () => {
                if(this.isActive){
                    this.initializedApp.firebase.auth().signOut();
                }
            });
            // check the current auth state:
            this.initializedApp.firebase.auth().onAuthStateChanged((user) => {
                if(user){
                    this.setActiveUser(user);
                    return false;
                }
                this.setupAuthButtons(response.providersKeys);
                return false;
            });
            let firebaseLogin = this.gameDom.getElement('#firebase-login');
            if(firebaseLogin){
                this.activateLoginBehavior(firebaseLogin);
            }
        });
    }

    /**
     * @param {HTMLFormElement} firebaseLogin
     */
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

    /**
     * @param {Array<string>} providersKeys
     */
    setupAuthButtons(providersKeys)
    {
        this.isActive = false;
        let container = this.gameDom.getElement(this.containerId);
        if(!container){
            return false;
        }
        container.innerHTML = '';
        if(0 === providersKeys.length){
            return false;
        }
        this.defaultProviders = this.fetchDefaultProviders();
        for(let providerKey of providersKeys){
            let provider = sc.get(this.activeProviders, providerKey, false);
            if(!provider){
                provider = this.defaultProviders[providerKey];
            }
            if(!provider){
                return false;
            }
            let authButton = this.createAuthButton(providerKey, provider.label);
            authButton.addEventListener('click', () => {
                this.signInWithProvider(provider.authMethod);
            });
            container.appendChild(authButton);
        }
    }

    /**
     * @param {string} provider
     * @param {string} text
     * @returns {HTMLButtonElement}
     */
    createAuthButton(provider, text)
    {
        let button = document.createElement('button');
        button.type = 'button';
        button.className = 'firebase-auth-btn firebase-' + provider + '-btn';
        button.innerHTML = text;
        return button;
    }

    /**
     * @param {Object} providerAuthMethod
     */
    signInWithProvider(providerAuthMethod)
    {
        if(!providerAuthMethod){
            return false;
        }
        this.initializedApp.firebase.auth().signInWithPopup(providerAuthMethod).catch((error) => {
            Logger.error('Firebase authentication error:', error);
            let errorContainer = this.gameDom.getElement('#firebase-login .response-error');
            if(errorContainer){
                errorContainer.textContent = 'Authentication error.';
            }
        });
    }

    /**
     * @param {Object} user
     */
    setActiveUser(user)
    {
        this.isActive = true;
        let usernameInput = this.gameDom.getElement('#firebase-username');
        if(!usernameInput || '' === usernameInput.value.trim()){
            let errorContainer = this.gameDom.getElement('#firebase-login .response-error');
            if(errorContainer){
                errorContainer.textContent = 'Please enter a username.';
            }
            return false;
        }
        let formData = {
            formId: 'firebase-login',
            email: user.email,
            username: usernameInput.value,
            password: user.uid
        };
        this.gameManager.startGame(formData, true);
    }

    /**
     * @param {Object} firebaseConfig
     */
    initAuth(firebaseConfig)
    {
        if(!firebaseConfig){
            Logger.error('Missing firebase configuration.');
            return false;
        }
        this.firebaseConfig = firebaseConfig;
        this.initializedApp = this.app.initializeApp(this.firebaseConfig);
        if(sc.hasOwn(this.firebaseConfig, 'measurementId')){
            this.initializedApp.firebase.analytics();
        }
    }

}

module.exports.FirebaseConnector = FirebaseConnector;
