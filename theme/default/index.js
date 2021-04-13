/**
 *
 * Reldens - Index
 * Client main file, this file provide the basic first page with the login and registration forms, and start the
 * GameManager if the request was successfully processed.
 *
 */

const { GameManager } = require('reldens/client');
const { CustomClasses } = require('../packages/client');

// @TODO - BETA.17: move everything from this file as part of the core project and include events to manage the theme.
window.addEventListener('DOMContentLoaded', () => {
    // reldens game:
    let reldens = new GameManager();
    let dom = reldens.gameDom;
    reldens.setupClasses(CustomClasses);
    // debug events (warning! this will output in the console ALL the event listeners and every event fired):
    // reldens.events.debug = 'all';
    // @NOTE: at this point you could specify or override a lot of configurations like your server URL.
    // reldens.serverUrl = 'wss://my-custom-url.com';
    // replace all the [values] and uncomment to initialize firebase:
    dom.getJSON('/reldens-firebase', (err, response) => {
        if(!response.enabled){
            return false;
        }
        let firebaseConfig = response.firebaseConfig;
        let uiConfig = {
            signInOptions: [
                // uncomment, add or remove options as you need:
                // reldens.firebase.auth.EmailAuthProvider.PROVIDER_ID
                reldens.firebase.app.auth.GoogleAuthProvider.PROVIDER_ID,
                reldens.firebase.app.auth.FacebookAuthProvider.PROVIDER_ID,
                // reldens.firebase.auth.TwitterAuthProvider.PROVIDER_ID,
                reldens.firebase.app.auth.GithubAuthProvider.PROVIDER_ID
            ],
            // this is to avoid the redirect in the game window:
            signInFlow: 'popup'
        };
        reldens.firebase.initAuth(firebaseConfig, uiConfig);

        // logout on refresh:
        window.addEventListener('beforeunload', () => {
            if(reldens.firebase.isActive){
                reldens.firebase.app.auth().signOut();
            }
        });

        // check the current auth state:
        reldens.firebase.app.auth().onAuthStateChanged((user) => {
            if(user){
                reldens.firebase.isActive = true;
                let formData = {
                    formId: 'firebase_login',
                    email: user.email,
                    username: dom.getElement('#firebase_username').value,
                    password: user.uid
                };
                startGame(formData, true);
            } else {
                // if not logged then start the auth ui:
                reldens.firebase.isActive = false;
                dom.getElement(reldens.firebase.containerId).innerHTML = '';
                reldens.firebase.authUi.start(reldens.firebase.containerId, reldens.firebase.uiConfig);
            }
            return false;
        });

        let $firebaseLogin = dom.getElement('#firebase_login');

        if($firebaseLogin){
            $firebaseLogin.addEventListener('submit', (e) => {
                e.preventDefault();
                // validate form:
                if(!$firebaseLogin.checkValidity()){
                    return false;
                }
                // show login options:
                dom.getElement('#firebaseui-auth-container').style.display = 'block';
                dom.getElement('#firebaseui-auth-container').classList.remove('hidden');
            });

            let $firebaseUser = dom.getElement('#firebase_username');
            if($firebaseUser){
                // show login options:
                // @NOTE here you could always display the options or include a length validation like:
                // if($firebaseUser.value.length){
                dom.getElement('#firebaseui-auth-container').style.display = 'block';
                dom.getElement('#firebaseui-auth-container').classList.remove('hidden');
                // }
                // and only display the options after the user completed the username field (see index.html around line 54).
                $firebaseUser.addEventListener('change', () => {
                    resetErrorBlock($firebaseLogin);
                });
                $firebaseUser.addEventListener('focus', () => {
                    resetErrorBlock($firebaseLogin);
                });
            }
        }

    });

    // client event listener example with version display:
    reldens.events.on('reldens.afterInitEngineAndStartGame', () => {
        dom.getElement('#current-version').innerHTML = reldens.config.version+' -';
    });

    let $register = dom.getElement('#register_form'),
        $login = dom.getElement('#login_form'),
        $forgot = dom.getElement('#forgot_form'),
        $fullScreen = dom.getElement('.full-screen-btn'),
        $body = dom.getElement('body');

    function resetErrorBlock(submittedForm)
    {
        let $errorBlock = submittedForm.querySelector('.response-error');
        submittedForm.querySelector('input').addEventListener('focus', () => {
            $errorBlock.style.display = 'none';
        });
    }

    function startGame(formData, isNewUser)
    {
        // display the game container on join:
        let gameRoom = reldens.joinGame(formData, isNewUser);
        // you can include here the room as parameter:
        gameRoom.then(() => {
            dom.getElement('.loading-container').style.display = 'none';
            dom.getElement('.footer').style.display = 'none';
            dom.getElement('.forms-container').remove();
            dom.getElement('.game-container').classList.remove('hidden');
            $fullScreen.style.display = 'block';
            $body.style.background = '#000000';
            $body.style.overflow = 'hidden';
            dom.getElement('.content').style.height = '92%';
        }).catch((err) => {
            // @NOTE: game room errors should be always because some wrong login or registration data. For these cases
            // we will check the isNewUser variable to know where display the error.
            reldens.submitedForm = false;
            dom.getElement('.loading-container').style.display = 'none';
            let errorElement = dom.getElement('#'+formData.formId+' .response-error');
            errorElement.innerHTML = err;
            errorElement.style.display = 'block';
            if(formData.formId === 'firebase_login'){
                reldens.firebase.app.auth().signOut();
            }
        });
    }

    if($register){
        resetErrorBlock($register);
        $register.addEventListener('submit', (e) => {
            e.preventDefault();
            // validate form:
            if(!$register.checkValidity()){
                return false;
            }
            $register.querySelector('.loading-container').style.display = 'block';
            $register.querySelector('.loading-container').classList.remove('hidden');
            let formData = {
                formId: $register.id,
                email: $register.querySelector('#reg_email').value,
                username: $register.querySelector('#reg_username').value,
                password: $register.querySelector('#reg_password').value
            };
            startGame(formData, true);
        });
    }

    if($login){
        resetErrorBlock($login);
        $login.addEventListener('submit', (e) => {
            e.preventDefault();
            if(!$login.checkValidity()){
                return false;
            }
            if(reldens.submitedForm){
                return false;
            }
            reldens.submitedForm = true;
            $login.querySelector('.loading-container').style.display = 'block';
            $login.querySelector('.loading-container').classList.remove('hidden');
            let formData = {
                formId: $login.id,
                username: $login.querySelector('#username').value,
                password: $login.querySelector('#password').value
            };
            startGame(formData, false);
        });
    }

    if($forgot){
        resetErrorBlock($forgot);
        $forgot.addEventListener('submit', (e) => {
            e.preventDefault();
            if(!$forgot.checkValidity()){
                return false;
            }
            $forgot.querySelector('.loading-container').style.display = 'block';
            $forgot.querySelector('.loading-container').classList.remove('hidden');
            let formData = {
                formId: $forgot.id,
                forgot: true,
                email: $forgot.querySelector('#forgot_email').value
            };
            startGame(formData, false);
        });
    }

    if($fullScreen){
        $fullScreen.addEventListener('click', (e) => {
            e.preventDefault();
            if(document.fullscreenEnabled){
                document.body.requestFullscreen();
            }
            dom.getElement('.header').style.display = 'none';
            dom.getElement('.footer').style.display = 'none';
            dom.getElement('.content').style.height = '100%';
            reldens.gameEngine.updateGameSize(reldens);
        });
    }

    // responsive screen behavior:
    document.addEventListener('fullscreenchange', () => {
        if(!document.fullscreenElement){
            dom.getElement('.header').style.display = 'block';
            dom.getElement('.content').style.height = '84%';
        }
    });

    // global access is not actually required, the app can be fully encapsulated, I'm leaving this here for easy tests:
    window.reldens = reldens;

});
