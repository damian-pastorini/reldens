/**
 *
 * Reldens - FirebaseConnector
 *
 */

const FirebaseApp = require('firebase/compat/app').default;
const FirebaseAnalytics = require('firebase/compat/analytics');
const FirebaseAuth = require('firebase/compat/auth');
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
        this.auth = FirebaseAuth;
        this.isActive = false;
        this.containerId = '#firebase-auth-container';
        this.activeProviders = {};
        this.defaultProviders = {
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
        this.gameManager.events.on('reldens.beforeJoinGame', (props) => {
            if(props.formData['formId'] === 'firebase-login'){
                props.gameManager.userData.isFirebaseLogin = true;
            }
        });
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
                    this.app.auth().signOut();
                }
            });
            // check the current auth state:
            this.app.auth().onAuthStateChanged((user) => {
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

    setupAuthButtons(providersKeys)
    {
        this.isActive = false;
        let container = this.gameDom.getElement(this.containerId);
        if(!container){
            return false;
        }
        if(0 === providersKeys.length){
            return false;
        }
        for(let providerKey of providersKeys){
            let provider = sc.get(this.activeProviders, providerKey, false);
            if(!provider){
                provider = this.defaultProviders[providerKey];
            }
            if(!provider){
                return false;
            }
            let googleBtn = this.createAuthButton(providerKey, provider.label);
            googleBtn.addEventListener('click', () => {
                this.signInWithProvider(provider.authMethod);
            });
            container.appendChild(googleBtn);
        }
    }

    createAuthButton(provider, text)
    {
        let button = document.createElement('button');
        button.type = 'button';
        button.className = 'firebase-auth-btn firebase-' + provider + '-btn';
        button.innerHTML = text;
        return button;
    }

    signInWithProvider(providerAuthMethod)
    {
        if(!providerAuthMethod){
            return false;
        }
        let auth = this.app.auth();
        auth.signInWithPopup(providerAuthMethod).catch((error) => {
            Logger.error('Firebase authentication error:', error);
            let errorContainer = this.gameDom.getElement('#firebase-login .response-error');
            if(errorContainer){
                errorContainer.textContent = 'Authentication error.';
            }
        });
    }

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

    initAuth(firebaseConfig)
    {
        if(!firebaseConfig){
            Logger.error('Missing firebase configuration.');
            return false;
        }
        this.firebaseConfig = firebaseConfig;
        this.app.initializeApp(this.firebaseConfig);
        if(sc.hasOwn(this.firebaseConfig, 'measurementId')){
            this.app.analytics();
        }
    }

}

module.exports.FirebaseConnector = FirebaseConnector;
