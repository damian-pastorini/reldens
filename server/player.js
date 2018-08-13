// player object:
exports.player = {
    id: '',
    db: false,
    socket: false,
    username: '',
    email: '',
    register: function(params){
        this.exists(params);
    },
    save: function(err, result, params){
        if(!result.length) {
            params.db.insert('users', 'NULL, "'+params.username+'", "'+params.password+'", "'+params.email+'", 1, NULL', params.player.saveResult, params);
        } else {
            params.socket.emit('registerResponse', {success: false});
        }
    },
    saveResult: function(err, result, params){
        params.socket.emit('registerResponse', {success: result});
    },
    exists: function(params){
        this.db.select('SELECT * FROM users WHERE email = "'+params.email+'" OR username = "'+params.username+'"', params.player.save, params);
    },
    login: function(params){
        this.db.select('SELECT * FROM users WHERE username = "'+params.username+'" AND password = "'+params.password+'"', params.player.loginResponse, params);
    },
    loginResponse: function(err, result, params){
        if(result.length){
            Object.keys(result).forEach(function(key) {
                var row = result[key];
                params.player.id = row.id;
                params.player.username = row.username;
                params.socket.player = params.player;
                params.socket.emit('loginResponse', {success: true, username: params.player.username});
                return params.socket;
            });
        } else {
            params.socket.emit('loginResponse', {success: false});
        }
    }
};
