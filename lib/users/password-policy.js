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
     * @returns {number}
     */
    static fetchMinimumLength(configManager)
    {
        return Number(configManager.getWithoutLogs(
            'client/players/password/minimumLength',
            Number(sc.get(process.env, 'RELDENS_PASSWORD_MINIMUM_LENGTH', 3))
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
