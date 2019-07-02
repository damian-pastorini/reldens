const $ = require('jquery');
const validate = require('jquery-validation');
const GameClient = require('./objects/game-client');

$(document).ready(function($){

    // game-client:
    let gameClient = new GameClient();

    let $register = $('#register_form'),
        $login = $('#login_form'),
        $logout = $('#logout');

    function restartError(submittedForm)
    {
        let $errorBlock = $(submittedForm).find('.response-error');
        $(submittedForm).find('input').on('focus', () => {
            $errorBlock.hide();
        });
    }

    function startGame(formData)
    {
        let gameRoom = gameClient.joinGameRoom(formData);
        gameRoom.onError.add((data) => {
            $('#'+formData.formId+' .response-error').show();
        });
        // on join activate game:
        gameRoom.onJoin.add(() => {
            $('.forms-container').detach();
            $('.game-container').show();
            $('.player-name').html(formData.username);
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
            let formData = {
                formId: $register.attr('id'),
                username: $register.find('#username').val(),
                password: $register.find('#password').val()
            };
            startGame(formData);
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
            let formData = {
                formId: $login.attr('id'),
                email: $login.find('#email').val(),
                username: $login.find('#username').val(),
                password: $login.find('#password').val()
            };
            startGame(formData);
        });
        $login.validate();
    }

    if($logout.length){
        $logout.on('click', () => {
            window.location.reload();
        });
    }

});
