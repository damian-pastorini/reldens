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

$(document).ready(function($){

    // reldens game:
    let reldens = new GameManager();
    reldens.setupClasses(CustomClasses);
    window.reldens = reldens;

    // client event listener example with version display:
    reldens.events.on('reldens.afterInitEngineAndStartGame', () => {
        $('#current-version').html(reldens.config.version+' -');
    });

    let $register = $('#register_form'),
        $login = $('#login_form'),
        $fullScreen = $('.full-screen-btn');

    function restartError(submittedForm)
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
            $('.forms-container').detach();
            $('.game-container').show();
            $('.full-screen-btn').show();
            $('body').css('background', '#000000');
        }).catch((data) => {
            // @NOTE: game room errors should be always because some wrong login or registration data. For these cases
            // we will check the isNewUser variable to know where display the error.
            $('.loading-container').hide();
            $('#'+formData.formId+' .response-error').html(data).show();
        });
    }

    if($register.length){
        restartError($register);
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
        restartError($login);
        $login.on('submit', (e) => {
            e.preventDefault();
            if(!$login.valid()){
                return false;
            }
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

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            $('.header').show();
            $('.footer').show();
            $('.content').css('height', '84%');
        }
    });

});
