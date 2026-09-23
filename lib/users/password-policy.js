/**
 *
 * Reldens - PasswordPolicy
 *
 * Single source of the password minimum length, read from the client scoped configuration with the environment
 * variable as the default, and the validation applied by the login, the registration and the CLI commands.
 *
 */

const { sc } = require('@reldens/utils');

class PasswordPolicy
{

    /**
     * @param {Object} configManager
     * @param {number} defaultMinimumLength
     * @returns {number}
     */
    static fetchMinimumLength(configManager, defaultMinimumLength)
    {
        return Number(configManager.getWithoutLogs(
            'client/players/password/minimumLength',
            Number(defaultMinimumLength || 3)
        ));
    }

    /**
     * @param {string} password
     * @param {number} minimumLength
     * @returns {boolean}
     */
    static isValid(password, minimumLength)
    {
        if(!sc.isString(password)){
            return false;
        }
        return minimumLength <= password.length;
    }

}

module.exports.PasswordPolicy = PasswordPolicy;
