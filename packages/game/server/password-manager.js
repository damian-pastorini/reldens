/**
 *
 * Reldens - PasswordManager
 *
 * This module is to handle the passwords encryption.
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

}

module.exports.PasswordManager = new PasswordManager();
