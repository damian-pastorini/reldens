/**
 *
 * Reldens - FirebaseConnector
 *
 */

const FirebaseApp = require('firebase/app');
const FirebaseAnalytics = require('firebase/analytics');
const FirebaseUi = require('firebaseui');
const { ErrorManager } = require('@reldens/utils');

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
        this.containerId = '#firebaseui-auth-container';
    }

    initAuth(props)
    {
        this.app.initializeApp(props);
        if({}.hasOwnProperty.call(props, 'measurementId')){
            this.app.analytics();
        }
        this.authUi = new this.ui.auth.AuthUI(this.app.auth());
        this.app.auth().onAuthStateChanged((user) => {
            if(user){
                // user is signed in:
                // let displayName = user.displayName;
                // let email = user.email;
                // let emailVerified = user.emailVerified;
                // let photoURL = user.photoURL;
                // let isAnonymous = user.isAnonymous;
                let uid = user.uid;
                let providerData = user.providerData;
                console.log('firebase auth changed:', uid, user.email, providerData);
                let loggedLinks = '<div class="firebase-logged-container">'
                    +'<button type="button" id="firebase-continue">Continue logged as: '+user.email+'</button>'
                    +'<button type="button" id="firebase-logout">'+user.email+' logout</button>'
                    +'</div>';
                // onclick="javascript:reldens.firebase.app.auth().signOut()"
                this.gameManager.gameDom.appendToElement(this.containerId, loggedLinks);
                let logoutBtn = this.gameManager.gameDom.getElement('#firebase-logout').on('click', () => {
                    this.app.auth().signOut();
                });
            } else {
                // user is signed out:
                console.log('logged out?');
            }
            return false;
        });
    }

}

module.exports.FirebaseConnector = FirebaseConnector;
