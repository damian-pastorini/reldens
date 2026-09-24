/**
 *
 * Reldens - PasswordPolicy
 *
 * Single source of the password minimum length, read from the client scoped configuration with the environment
 * variable as the default, and the validation applied by the login, the registration, the password reset and the CLI
 * commands, with an optional maximum length.
 *
 */

const { sc } = require('@reldens/utils');

class PasswordPolicy
{

    /**
     * @param {Object} configManager
     * @returns {number}
     */
    static fetchMinimumLength(configManager)
    {
        return Number(configManager.getWithoutLogs(
            'client/players/password/minimumLength',
            configManager.getWithoutLogs('server/security/passwordMinimumLength', 3)
        ));
    }

    /**
     * @param {string} password
     * @param {number} minimumLength
     * @param {number} [maximumLength]
     * @returns {boolean}
     */
    static isValid(password, minimumLength, maximumLength = 0)
    {
        if(!sc.isString(password)){
            return false;
        }
        if(0 < maximumLength && maximumLength < password.length){
            return false;
        }
        return minimumLength <= password.length;
    }

}

module.exports.PasswordPolicy = PasswordPolicy;
