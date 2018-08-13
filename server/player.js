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
    saveResult: function(result, params){
        params.socket.emit('registerResponse', {success: result});
    },
    exists: function(params){
        this.db.select('SELECT * FROM users WHERE email = "'+params.email+'" OR username = "'+params.username+'"', params.player.save, params);
    },
    login: function(){
    },
};
