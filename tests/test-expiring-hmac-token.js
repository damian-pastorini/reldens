/**
 *
 * Reldens - Test Expiring HMAC Token
 *
 */

const { BaseTest } = require('./base-test');
const { ExpiringHmacToken } = require('../lib/game/server/expiring-hmac-token');

class TestExpiringHmacToken extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.secret = 'test-secret';
        this.expirationMs = 60000;
        this.email = 'user@reldens.com';
        this.passwordHash = 'salt:hash';
    }

    async testTheResetTokenIsValidBeforeExpiration()
    {
        await this.test('the reset token is valid for the same email and password hash before expiration', async () => {
            let expiringHmacToken = new ExpiringHmacToken({secret: this.secret});
            let now = Date.now();
            let token = expiringHmacToken.generate([this.email, this.passwordHash], now+this.expirationMs);
            this.assert.strictEqual(expiringHmacToken.validate([this.email, this.passwordHash], token, now), true);
        });
    }

    async testTheResetTokenIsInvalidAfterExpiration()
    {
        await this.test('the reset token is invalid after the expiration time', async () => {
            let expiringHmacToken = new ExpiringHmacToken({secret: this.secret});
            let now = Date.now();
            let expiresAt = now+this.expirationMs;
            let token = expiringHmacToken.generate([this.email, this.passwordHash], expiresAt);
            this.assert.strictEqual(expiringHmacToken.validate([this.email, this.passwordHash], token, expiresAt+1), false);
        });
    }

    async testTheResetTokenIsInvalidAfterThePasswordChanged()
    {
        await this.test('the reset token is invalid once the user password hash changed', async () => {
            let expiringHmacToken = new ExpiringHmacToken({secret: this.secret});
            let now = Date.now();
            let token = expiringHmacToken.generate([this.email, this.passwordHash], now+this.expirationMs);
            this.assert.strictEqual(expiringHmacToken.validate([this.email, 'new-salt:new-hash'], token, now), false);
        });
    }

    async testTheTokenIsInvalidWithAnotherSecret()
    {
        await this.test('the token is invalid when validated with another secret', async () => {
            let now = Date.now();
            let token = new ExpiringHmacToken({secret: this.secret}).generate(['victim'], now+this.expirationMs);
            let otherSecretToken = new ExpiringHmacToken({secret: 'other-secret'});
            this.assert.strictEqual(otherSecretToken.validate(['victim'], token, now), false);
        });
    }

    async testTheTokenIsInvalidWhenTheExpirationIsTampered()
    {
        await this.test('the token is invalid when the expiration time is modified', async () => {
            let expiringHmacToken = new ExpiringHmacToken({secret: this.secret});
            let now = Date.now();
            let token = expiringHmacToken.generate(['victim'], now+this.expirationMs);
            let tamperedToken = (now+this.expirationMs*2)+token.substring(token.indexOf('.'));
            this.assert.strictEqual(expiringHmacToken.validate(['victim'], tamperedToken, now), false);
        });
    }

    async testTheMalformedTokenIsRejectedWithoutThrowing()
    {
        await this.test('a token with a multi-byte signature of the expected length is rejected', async () => {
            let expiringHmacToken = new ExpiringHmacToken({secret: this.secret});
            let now = Date.now();
            let malformedToken = (now+this.expirationMs)+'.'+'a'.repeat(63)+'é';
            let tokenValues = [this.email, this.passwordHash];
            this.assert.strictEqual(expiringHmacToken.validate(tokenValues, malformedToken, now), false);
        });
    }

    async testTheTokenWithoutTheExpectedFormatIsRejected()
    {
        await this.test('the tokens without the expiration and hex signature format are rejected', async () => {
            let expiringHmacToken = new ExpiringHmacToken({secret: this.secret});
            let now = Date.now();
            let validToken = expiringHmacToken.generate([this.email], now+this.expirationMs);
            this.assert.strictEqual(expiringHmacToken.validate([this.email], validToken+'.extra', now), false);
            this.assert.strictEqual(expiringHmacToken.validate([this.email], validToken.toUpperCase(), now), false);
            this.assert.strictEqual(expiringHmacToken.validate([this.email], validToken, now), true);
        });
    }

    async testTheTokenIsNotGeneratedWithoutSecret()
    {
        await this.test('the token is not generated without a secret', async () => {
            let expiringHmacToken = new ExpiringHmacToken({secret: ''});
            this.assert.strictEqual(expiringHmacToken.generate(['victim'], Date.now()+this.expirationMs), false);
        });
    }

}

module.exports.TestExpiringHmacToken = TestExpiringHmacToken;
