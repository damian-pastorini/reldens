/**
 *
 * Reldens - Index
 * Client main file, this file provide the basic first page with the login and registration forms, and start the
 * GameManager if the request was successfully processed.
 *
 */

const $ = require('jquery');
const validate = require('jquery-validation');
// @TODO: change relative path to package reldens/src/game/manager.
const GameManager = require('../src/game/manager');

$(document).ready(function($){

    // reldens game:
    let reldens = new GameManager();
    window.reldens = reldens;

    let $register = $('#register_form'),
        $login = $('#login_form');

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
        let gameRoom = reldens.joinGameRoom(formData, isNewUser);
        gameRoom.then((room) => {
            $('.loading-container').hide();
            $('.forms-container').detach();
            $('.game-container').show();
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

});
