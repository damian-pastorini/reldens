/**
 *
 * Reldens - Index
 * Client main file, this file provide the basic first page with the login and registration forms, and start the
 * GameManager if the request was successfully processed.
 *
 */

const $ = require('jquery');
require('jquery-validation');
const { GameManager } = require('reldens/client');
const { CustomClasses } = require('../packages/client');

// @TODO - BETA.17: move everything from this file as part of the core project and include events to manage the theme.
$(document).ready(function($){

    // reldens game:
    let reldens = new GameManager();
    reldens.setupClasses(CustomClasses);
    // debug events (warning! this will output in the console ALL the event listeners and every event fired):
    // reldens.events.debug = 'all';
    // @NOTE: at this point you could specify or override a lot of configurations like your server URL.
    // reldens.serverUrl = 'wss://my-custom-url.com';
    // replace all the [values] and uncomment to initialize firebase:
    $.getJSON('/reldens-firebase', (response) => {
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
        window.onbeforeunload = () => {
            if(reldens.firebase.isActive){
                reldens.firebase.app.auth().signOut();
            }
        };

        // check the current auth state:
        reldens.firebase.app.auth().onAuthStateChanged((user) => {
            if(user){
                reldens.firebase.isActive = true;
                let formData = {
                    formId: 'firebase_login',
                    email: user.email,
                    username: $('#firebase_username').val(),
                    password: user.uid
                };
                startGame(formData, true);
            } else {
                // if not logged then start the auth ui:
                reldens.firebase.isActive = false;
                reldens.gameDom.getElement(reldens.firebase.containerId).html('');
                reldens.firebase.authUi.start(reldens.firebase.containerId, reldens.firebase.uiConfig);
            }
            return false;
        });

        let $firebaseLogin = $('#firebase_login');

        if($firebaseLogin.length){
            $firebaseLogin.on('submit', (e) => {
                e.preventDefault();
                // validate form:
                if(!$firebaseLogin.valid()){
                    return false;
                }
                // show login options:
                $('#firebaseui-auth-container').show();
            });

            let $firebaseUser = $('#firebase_username');
            if($firebaseUser.length){
                // show login options:
                // @NOTE here you could always display the options or include a length validation like:
                // if($firebaseUser.val().length){
                $('#firebaseui-auth-container').show();
                // }
                // and only display the options after the user completed the username field (see index.html around line 54).
                $firebaseUser.on('change', () => {
                    resetErrorBlock('#firebase_login');
                });
                $firebaseUser.on('focus', () => {
                    resetErrorBlock('#firebase_login');
                });
            }
        }

    });

    // client event listener example with version display:
    reldens.events.on('reldens.afterInitEngineAndStartGame', () => {
        $('#current-version').html(reldens.config.version+' -');
    });

    let $register = $('#register_form'),
        $login = $('#login_form'),
        $forgot = $('#forgot_form'),
        $fullScreen = $('.full-screen-btn'),
        $body = $('body');

    function resetErrorBlock(submittedForm)
    {
        let $errorBlock = $(submittedForm).find('.response-error');
        $(submittedForm).find('input').on('focus', () => {
            $errorBlock.hide();
        });
    }

    function startGame(formData, isNewUser)
    {
        // display the game container on join:
        let gameRoom = reldens.joinGame(formData, isNewUser);
        // you can include here the room as parameter:
        gameRoom.then(() => {
            $('.loading-container').hide();
            $('.footer').hide();
            $('.forms-container').detach();
            $('.game-container').removeClass('hidden');
            $('.full-screen-btn').show();
            $body.css('background', '#000000');
            $body.css('overflow', 'hidden');
            $('.content').css('height', '92%');
        }).catch((data) => {
            // @NOTE: game room errors should be always because some wrong login or registration data. For these cases
            // we will check the isNewUser variable to know where display the error.
            reldens.submitedForm = false;
            $('.loading-container').hide();
            $('#'+formData.formId+' .response-error').html(data).show();
            if(formData.formId === 'firebase_login'){
                reldens.firebase.app.auth().signOut();
            }
        });
    }

    if($register.length){
        resetErrorBlock($register);
        $register.on('submit', (e) => {
            e.preventDefault();
            // validate form:
            if(!$register.valid()){
                return false;
            }
            $register.find('.loading-container').show();
            let formData = {
                formId: $register.attr('id'),
                email: $register.find('#reg_email').val(),
                username: $register.find('#reg_username').val(),
                password: $register.find('#reg_password').val()
            };
            startGame(formData, true);
        });
        $register.validate({
            rules: {
                reg_re_password: {
                    equalTo: '#reg_password'
                }
            }
        });
    }

    if($login.length){
        resetErrorBlock($login);
        $login.on('submit', (e) => {
            e.preventDefault();
            if(!$login.valid()){
                return false;
            }
            if(reldens.submitedForm){
                return false;
            }
            reldens.submitedForm = true;
            $login.find('.loading-container').show();
            let formData = {
                formId: $login.attr('id'),
                email: $login.find('#email').val(),
                username: $login.find('#username').val(),
                password: $login.find('#password').val()
            };
            startGame(formData, false);
        });
        $login.validate();
    }

    if($forgot.length){
        resetErrorBlock($forgot);
        $forgot.on('submit', (e) => {
            e.preventDefault();
            if(!$forgot.valid()){
                return false;
            }
            $forgot.find('.loading-container').show();
            let formData = {
                formId: $forgot.attr('id'),
                forgot: true,
                email: $forgot.find('#forgot_email').val()
            };
            startGame(formData, false);
        });
        $forgot.validate();
    }

    if($fullScreen.length){
        $fullScreen.on('click', (e) => {
            e.preventDefault();
            if(document.fullscreenEnabled){
                document.body.requestFullscreen();
            }
            $('.header').hide();
            $('.footer').hide();
            $('.content').css('height', '100%');
            reldens.gameEngine.updateGameSize(reldens);
        });
    }

    // responsive screen behavior:
    document.addEventListener('fullscreenchange', () => {
        if(!document.fullscreenElement){
            $('.header').show();
            $('.content').css('height', '84%');
        }
    });

    // global access is not actually required, the app can be fully encapsulated, I'm leaving this here for easy tests:
    window.reldens = reldens;

});
