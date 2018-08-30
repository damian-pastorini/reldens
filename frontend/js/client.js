jQuery(document).ready(function($){

    var room = '';
    var $register = $('#register_form');
    var $login = $('#login_form');
    var host = window.document.location.host.replace(/:.*/, '');
    var client = new Colyseus.Client(location.protocol.replace('http', 'ws')+host+(location.port ? ':'+location.port : ''));
    var players = {};
    var colors = ['red', 'green', 'yellow', 'blue', 'cyan', 'magenta'];
    var userData = '';

    function joinRoom(submitedForm, isNewUser=false){
        if(!$(submitedForm).valid()){
            return false;
        }
        userData = {};
        if(isNewUser){
            userData.isNewUser = true;
            userData.username = $('#reg_username').val();
            userData.password = $('#reg_password').val();
            userData.email = $('#reg_email').val();
        } else {
            userData.username = $('#username').val();
            userData.password = $('#password').val();
        }
        room = client.join('game_room', userData);
        var $errorBlock = $(submitedForm).find('.response-error');
        $(submitedForm).find('input').on('focus', function(){
            $errorBlock.hide();
        });
        if(isNewUser) {
            room.onError.add(function(data){
                $errorBlock.html('Registration error, please try again.');
                $errorBlock.show();
            });
        } else {
            room.onError.add(function(data){
                $errorBlock.html('Login error please try again.');
                $errorBlock.show();
            });
        }
        room.onJoin.add(function(){
            $('.forms-container').detach();
            $('.game-container').show();
        });
        if(room){
            function up(){
                room.send({y: -1});
            }
            function right(){
                room.send({x: 1});
            }
            function down(){
                room.send({y: 1});
            }
            function left(){
                room.send({x: -1});
            }
            // listen to patches coming from the server
            room.listen('players/:id', function(change){
                if (change.operation === 'add'){
                    var dom = document.createElement('div');
                    dom.className = 'player';
                    dom.style.left = change.value.x + 'px';
                    dom.style.top = change.value.y + 'px';
                    dom.style.background = colors[Math.floor(Math.random() * colors.length)];
                    dom.innerHTML = 'Player '+change.path.id;
                    players[change.path.id] = dom;
                    document.body.appendChild(dom);
                } else if (change.operation === 'remove'){
                    document.body.removeChild(players[change.path.id]);
                    delete players[change.path.id];
                }
            });
            room.listen('players/:id/:axis', function(change){
                var dom = players[change.path.id];
                var styleAttribute = (change.path.axis === 'x') ? 'left' : 'top';
                dom.style[styleAttribute] = change.value+'px';
            });
            window.addEventListener('keydown', function(e){
                if (e.which === 38) {
                    up();
                } else if (e.which === 39) {
                    right();
                } else if (e.which === 40) {
                    down();
                } else if (e.which === 37) {
                    left();
                }
            });
            $('#up').on('click', function(){
                up();
            });
            $('#right').on('click', function(){
                right();
            });
            $('#down').on('click', function(){
                down();
            });
            $('#left').on('click', function(){
                left();
            });
        }
    }

    if($register.length){
        $register.on('submit', function(e){
            e.preventDefault();
            joinRoom(this, true);
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
        $login.on('submit', function(e){
            e.preventDefault();
            joinRoom(this);
        });
        $login.validate();
    }

    if($('#logout').length){
        $('#logout').on('click', function(){
            window.location.reload(true);
        });
    }

});
