/**
 *
 * Reldens - Index
 * Client main file, this file provide the basic first page with the login and registration forms, and start the
 * GameManager if the request was successfully processed.
 *
 */

const { GameManager } = require('reldens/client');
const { CustomClasses } = require('../packages/client');
const { GameConst } = require('reldens/packages/game/constants');

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
            dom.getElement('.loading-container').style.display = 'none';
            let errorElement = dom.getElement('#'+formData.formId+' .response-error');
            if(errorElement){
                errorElement.innerHTML = err;
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
        register.addEventListener('submit', (e) => {
            e.preventDefault();
            // validate form:
            if(!register.checkValidity()){
                return false;
            }
            register.querySelector('.loading-container').style.display = 'block';
            register.querySelector('.loading-container').classList.remove('hidden');
            let formData = {
                formId: register.id,
                email: register.querySelector('#reg_email').value,
                username: register.querySelector('#reg_username').value,
                password: register.querySelector('#reg_password').value
            };
            startGame(formData, true);
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
