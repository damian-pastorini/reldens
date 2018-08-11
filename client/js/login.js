/**
 * Initialize!
 */
var socket = io();
// wait for doc and start:
$(document).ready(function() {
    console.log('ready!');
    if($('#login-form').length) {
        $('#login-form').on('submit', function(e){
            console.log('Logging...');
            e.preventDefault();
            socket.emit('signIn', {username: $('#username').val(), password: $('#password').val()});
        });
    }
});
