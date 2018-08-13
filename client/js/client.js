/**
 * Initialize!
 */
var socket = io();
// wait for doc and start:
$(document).ready(function(){

    var $register = $('#register-form');
    if($register.length){
        $register.on('submit', function(e){
            e.preventDefault();
            var params = {
                email: $('#reg-email').val(),
                username: $('#reg-username').val(),
                password: $('#reg-password').val(),
                repassword: $('#reg-re-password').val(),
            };
            socket.emit('register', params);
        });
    }

    socket.on('registerResponse', function(data){
        if(data.success){
            $('.forms-container').hide();
            $('.register-form .response-error').hide();
            $('.game-container').show();
        } else {
            $('.register-form .response-error').html('Invalid data, please try again.');
        }
    });

    var $login = $('#login-form');
    if($login.length){
        $login.on('submit', function(e){
            e.preventDefault();
            var params = {
                username: $('#username').val(),
                password: $('#password').val(),
            };
            socket.emit('login', params);
        });
    }

    socket.on('loginResponse', function(data){
        if(data.success){
            $('.forms-container').hide();
            $('.login-form .response-error').hide();
            $('.game-container').show();
            $('.player-username').html(data.username);
        } else {
            $('.login-form .response-error').html('Invalid data, please try again.');
        }
    });

});
