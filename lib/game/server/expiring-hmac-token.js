/**
 *
 * Reldens - ExpiringHmacToken
 *
 * Generates and validates expiring HMAC tokens signed with a server secret. The signed data is composed by the given
 * values and the expiration time, so any change on the values (for example, the user password hash) or an expired
 * time invalidates the token.
 *
 */

const { Encryptor } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class ExpiringHmacToken
{

    /**
     * @param {Object} props
     * @param {string} props.secret
     */
    constructor(props)
    {
        /** @type {string} */
        this.secret = sc.get(props, 'secret', '');
        /** @type {typeof Encryptor} */
        this.encryptor = Encryptor;
        /** @type {string} */
        this.tokenSeparator = '.';
    }

    /**
     * @param {Array<string>} values
     * @param {number} expiresAt
     * @returns {string|false}
     */
    generate(values, expiresAt)
    {
        let signature = this.encryptor.generateHMAC(sc.toJsonString([...values, expiresAt]), this.secret);
        if(!signature){
            return false;
        }
        return expiresAt+this.tokenSeparator+signature;
    }

    /**
     * @param {Array<string>} values
     * @param {string} token
     * @param {number} now
     * @returns {boolean}
     */
    validate(values, token, now)
    {
        if(!sc.isString(token)){
            return false;
        }
        let expiresAt = Number(token.split(this.tokenSeparator).shift());
        if(!sc.isValidInteger(expiresAt)){
            return false;
        }
        if(now > expiresAt){
            return false;
        }
        return this.encryptor.constantTimeCompare(token, this.generate(values, expiresAt));
    }

}

module.exports.ExpiringHmacToken = ExpiringHmacToken;
