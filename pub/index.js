const $ = require('jquery');
const validate = require('jquery-validation');
const Reldens = require('../src/game/reldens');

$(document).ready(function($){

    // reldens game:
    let reldens = new Reldens();
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
            $('.loading').hide();
            $('.forms-container').detach();
            $('.game-container').show();
        });
        gameRoom.catch((data) => {
            console.log('ERROR - GameRoom error.', data);
            $('#'+formData.formId+' .response-error').show();
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