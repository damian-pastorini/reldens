/**
 *
 * Reldens - PasswordManager
 *
 */

let crypto = require('crypto');

class PasswordManager
{
    constructor()
    {
        // recommended minimum for PBKDF2 with SHA-512
        this.iterations = 60000;
        this.keylen = 64;
        this.digest = 'sha512';
    }

    encryptPassword(password)
    {
        // generate the password hash:
        let salt = crypto.randomBytes(16).toString('hex');
        let hash = crypto.pbkdf2Sync(password, salt, this.iterations, this.keylen, this.digest ).toString('hex');
        return salt + ':' + hash;
    }

    validatePassword(password, storedPassword)
    {
        let parts = storedPassword.split(':');
        if(2 !== parts.length){
            return false;
        }
        let salt = parts[0];
        let storedHash = parts[1];
        let hash = crypto.pbkdf2Sync(password, salt, this.iterations, this.keylen, this.digest).toString('hex');
        return storedHash === hash;
    }
}

module.exports.PasswordManager = new PasswordManager();
