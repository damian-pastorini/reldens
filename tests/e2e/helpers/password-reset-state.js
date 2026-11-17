/**
 *
 * Reldens - Password Reset State
 *
 * Server side e2e endpoints for the forgot password and reset password flows: signs reset tokens with any expiration,
 * sets the reset email sent time of an account, lowers the forgot requests limit per address, makes the next emails
 * fail to send, removes the signed tokens secret and reports the forgot password interval. The reset restores every
 * value before every test.
 *
 */

const { sc } = require('@reldens/utils');

class PasswordResetState
{

    static HOUR_MS = 3600000;
    static defaults = {};
    static failingSends = 0;

    static captureDefaults(serverManager)
    {
        PasswordResetState.defaults = {
            requestsMaxPerIp: serverManager.loginManager.forgotPassword.requestsMaxPerIp,
            secret: serverManager.loginManager.expiringHmacToken.secret
        };
    }

    static consumeFailingSend()
    {
        let isFailing = 0 < PasswordResetState.failingSends;
        if(isFailing){
            PasswordResetState.failingSends--;
        }
        return isFailing;
    }

    static resetAll(serverManager)
    {
        PasswordResetState.failingSends = 0;
        serverManager.loginManager.forgotPassword.requestsMaxPerIp = PasswordResetState.defaults.requestsMaxPerIp;
        serverManager.loginManager.expiringHmacToken.secret = PasswordResetState.defaults.secret;
    }

    static registerEndpoints(serverManager)
    {
        PasswordResetState.captureDefaults(serverManager);
        let loginManager = serverManager.loginManager;
        let app = serverManager.app;
        app.post('/api/e2e/password-reset/settings', (request, response) => {
            loginManager.forgotPassword.requestsMaxPerIp = Number(
                sc.get(request.body, 'requestsMaxPerIp', PasswordResetState.defaults.requestsMaxPerIp)
            );
            PasswordResetState.failingSends = Number(sc.get(request.body, 'failingSends', 0));
            loginManager.expiringHmacToken.secret = sc.get(request.body, 'removeSecret', false)
                ? ''
                : PasswordResetState.defaults.secret;
            response.json({forgotPasswordIntervalMs: loginManager.forgotPassword.forgotPasswordLimit * PasswordResetState.HOUR_MS});
        });
        app.post('/api/e2e/password-reset/token', async (request, response) => {
            let email = sc.get(request.body, 'email', '');
            let user = await loginManager.usersManager.loadUserByEmail(email);
            response.json({
                token: loginManager.expiringHmacToken.generate(
                    [email, sc.get(user, 'password', '')],
                    Number(sc.get(request.body, 'expiresAt', 0))
                )
            });
        });
        app.post('/api/e2e/password-reset/sent-at', async (request, response) => {
            await loginManager.usersManager.updateUserByEmail(sc.get(request.body, 'email', ''), {
                password_reset_sent_at: sc.formatDate(new Date(Number(sc.get(request.body, 'sentAt', 0))))
            });
            response.json({ok: true});
        });
    }

}

module.exports.PasswordResetState = PasswordResetState;
