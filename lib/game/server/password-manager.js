/**
 *
 * Reldens - PasswordManager
 *
 * This module is to handle the password encryption.
 *
 */

const bcrypt = require('bcrypt');

class PasswordManager
{

    encryptPassword(receivedPassword)
    {
        this.saltRounds = 10;
        // generate the password hash:
        let salt = bcrypt.genSaltSync(this.saltRounds);
        return bcrypt.hashSync(receivedPassword, salt);
    }

    validatePassword(receivedPassword, storedPassword)
    {
        return bcrypt.compareSync(receivedPassword, storedPassword);
    }

    makeId(length)
    {
        let result = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*()_-=+[]{}:;<>,./?';
        let charactersLength = characters.length;
        for(let i = 0; i < length; i++){
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

}

module.exports.PasswordManager = new PasswordManager();
