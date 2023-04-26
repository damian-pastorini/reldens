/**
 *
 * Reldens - Index
 *
 */

// set logger level and trace, this needs to be specified before the game manager is required:
window.RELDENS_LOG_LEVEL = 9;
window.RELDENS_ENABLE_TRACE_FOR = 'emergency,alert,critical,error,warning';

const { GameManager } = require('reldens/client');
const { ClientPlugin } = require('../plugins/client-plugin');
const { GameConst } = require('reldens/lib/game/constants');

// @TODO - BETA - Move everything from this file as part of the core project and include events to manage the theme.
// @TODO - BETA - Make all the texts come from the server or from a translations system.
// @TODO - BETA - CLEAN THIS THING ASAP!
window.addEventListener('DOMContentLoaded', () => {
    // reldens game:
    let reldens = new GameManager();
    // @NOTE: you can specify your game server and your app server URLs in case you serve the client static files from
    // a different location.
    // reldens.gameServerUrl = 'ws://localhost:8000';
    // reldens.appServerUrl = 'http://localhost:8000';
    let dom = reldens.gameDom;
    reldens.setupCustomClientPlugin(ClientPlugin);
    // debug events (warning! this will output in the console ALL the event listeners and every event fired):
    // reldens.events.debug = 'all';
    // @NOTE: at this point you could specify or override a lot of configurations like your server URL.
    // reldens.serverUrl = 'wss://my-custom-url.com';
    // replace all the [values] and uncomment to initialize firebase:

    // client event listener example with version display:
    reldens.events.on('reldens.afterInitEngineAndStartGame', () => {
        dom.getElement('#current-version').innerHTML = reldens.config.version+' -';
    });

    let register = dom.getElement('#register_form'),
        login = dom.getElement('#login_form'),
        forgot = dom.getElement('#forgot_form'),
        fullScreen = dom.getElement('.full-screen-btn'),
        body = dom.getElement('body');

    reldens.displayForgotPassword();

    function resetErrorBlock(submittedForm)
    {
        let errorBlock = submittedForm.querySelector('.response-error');
        submittedForm.querySelector('input').addEventListener('focus', () => {
            errorBlock.style.display = 'none';
        });
    }

    function startGame(formData, isNewUser)
    {
        // display the game container on join:
        let gameRoom = reldens.joinGame(formData, isNewUser);
        // you can include here the room as parameter:
        gameRoom.then(() => {
            dom.getElements('.loading-container').forEach((element) => {
                element.style.display = 'none';
            });
            dom.getElement('.footer').style.display = 'none';
            dom.getElement('.forms-container').remove();
            dom.getElement('.game-container').classList.remove('hidden');
            fullScreen.style.display = 'block';
            body.style.background = '#000000';
            dom.getElement('.content').style.height = '92%';
            reldens.gameRoom.onMessage(async (message) => {
                if(message.act === GameConst.CREATE_PLAYER_RESULT && !message.error){
                    dom.getElement('body').style.overflow = 'hidden';
                }
            });
        }).catch((err) => {
            // @NOTE: game room errors should be always because some wrong login or registration data. For these cases
            // we will check the isNewUser variable to know where display the error.
            reldens.submitedForm = false;
            dom.getElements('.loading-container').forEach((element) => {
                element.style.display = 'none';
            });
            let errorElement = dom.getElement('#'+formData.formId+' .response-error');
            if(errorElement){
                errorElement.innerHTML = err.message || err;
                errorElement.style.display = 'block';
            }
            if(formData.formId === 'firebase_login'){
                reldens.firebase.app.auth().signOut();
            }
        });
    }

    // firebase integration:
    reldens.firebase.resetErrorBlockCallback = resetErrorBlock;
    reldens.firebase.startGameCallback = startGame;
    reldens.firebase.startFirebase();

    if(register){
        resetErrorBlock(register);
        let acceptTermsCheckbox = dom.getElement('#accept-terms-and-conditions');
        let termsContainer = dom.getElement('#terms-and-conditions');
        register.addEventListener('submit', (e) => {
            e.preventDefault();
            if(!register.checkValidity()){
                return false;
            }
            let password = register.querySelector('#reg_password').value;
            let rePassword = register.querySelector('#reg_re_password').value;
            if(password !== rePassword){
                register.querySelector('.response-error').style.display = 'block';
                register.querySelector('.response-error').innerHTML = 'Password and confirmation does not match.';
                return false;
            }
            if (!acceptTermsCheckbox.checked) {
                register.querySelector('.response-error').style.display = 'block';
                register.querySelector('.response-error').innerHTML = 'Terms and conditions not accepted.'
                    +' Please read the terms and conditions and continue.';
                return false;
            }
            termsContainer?.classList.add('hidden');
            register.querySelector('.loading-container').style.display = 'block';
            register.querySelector('.loading-container').classList.remove('hidden');
            let formData = {
                formId: register.id,
                email: register.querySelector('#reg_email').value,
                username: register.querySelector('#reg_username').value,
                password: password,
                rePassword: rePassword
            };
            startGame(formData, true);
        });

        let termsLinkContainer = dom.getElement('.terms-and-conditions-link-container');
        reldens.gameDom.getJSON(reldens.appServerUrl+'/terms-and-conditions', (err, response) => {
            if(!response.body || !response.heading || !response.checkboxLabel || !response.link){
                return false;
            }
            if(err){
                // log error.
                return false;
            }
            dom.updateContent('.terms-heading', response.heading);
            dom.updateContent('.terms-body', response.body);
            dom.updateContent('.accept-terms-and-conditions-label', response.checkboxLabel);
            dom.updateContent('.terms-and-conditions-link', response.link);
            let termsLink = dom.getElement('.terms-and-conditions-link');
            termsLink?.addEventListener('click', (e) => {
                e.preventDefault();
                termsContainer?.classList.remove('hidden');
            });
            dom.getElement('#terms-and-conditions-close')?.addEventListener('click', () => {
                termsContainer?.classList.add('hidden');
            });
            let errorBlock = dom.getElement('.response-error', register);
            dom.getElement('.accept-terms-and-conditions-label').addEventListener('click', () => {
                if(acceptTermsCheckbox.checked){
                    errorBlock.style.display = 'none';
                }
            });
            acceptTermsCheckbox.addEventListener('click', () => {
                if(acceptTermsCheckbox.checked){
                    errorBlock.style.display = 'none';
                }
            });
            termsLinkContainer?.classList.remove('hidden');
        });
    }

    if(login){
        resetErrorBlock(login);
        login.addEventListener('submit', (e) => {
            e.preventDefault();
            if(!login.checkValidity()){
                return false;
            }
            if(reldens.submitedForm){
                return false;
            }
            reldens.submitedForm = true;
            login.querySelector('.loading-container').style.display = 'block';
            login.querySelector('.loading-container').classList.remove('hidden');
            let formData = {
                formId: login.id,
                username: login.querySelector('#username').value,
                password: login.querySelector('#password').value
            };
            startGame(formData, false);
        });
    }

    if(forgot){
        resetErrorBlock(forgot);
        forgot.addEventListener('submit', (e) => {
            e.preventDefault();
            if(!forgot.checkValidity()){
                return false;
            }
            forgot.querySelector('.loading-container').style.display = 'block';
            forgot.querySelector('.loading-container').classList.remove('hidden');
            let formData = {
                formId: forgot.id,
                forgot: true,
                email: forgot.querySelector('#forgot_email').value
            };
            startGame(formData, false);
        });
    }

    if(fullScreen){
        fullScreen.addEventListener('click', (e) => {
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
