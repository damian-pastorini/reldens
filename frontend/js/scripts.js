// wait for doc and start:
$(document).ready(function(){

    var $register = $('#register-form');
    if($register.length){
        $register.on('submit', function(e){
            // if(!$(this).validate()) {
            //     e.preventDefault();
            // }
        });
    }

    var $login = $('#login-form');
    if($login.length){
        $login.on('submit', function(e){
            // if(!$(this).validate()) {
            //     e.preventDefault();
            // }
        });
    }

});
