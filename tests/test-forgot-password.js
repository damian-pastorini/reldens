/**
 *
 * Reldens - Test Forgot Password
 *
 */

const { BaseTest } = require('./base-test');
const { ForgotPassword } = require('../lib/game/server/forgot-password');
const { LoginAttempts } = require('../lib/game/server/memory/login-attempts');
const { UsersManager } = require('../lib/users/server/manager');
const { sc } = require('@reldens/utils');

class TestForgotPassword extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.userEmail = 'user@reldens.com';
        this.forgotLimitHours = 4;
        this.forgotIntervalMs = this.forgotLimitHours * 60 * 60 * 1000;
    }

    createForgotPasswordSetup(lastSentTime, emailSendResult)
    {
        let forgotSetup = {storedSentTime: lastSentTime, sentEmails: [], reservations: [], userUpdates: []};
        let forgotPassword = Object.create(ForgotPassword.prototype);
        forgotPassword.forgotPasswordLimit = this.forgotLimitHours;
        forgotPassword.requestsMaxPerIp = 10;
        forgotPassword.loginAttempts = new LoginAttempts({});
        forgotPassword.events = {emitSync: () => true};
        forgotPassword.mailer = {isEnabled: () => true};
        forgotPassword.usersManager = {
            loadUserByEmail: async (email) => ({
                id: 1,
                email,
                password: 'stored-password-hash',
                password_reset_sent_at: sc.formatDate(new Date(lastSentTime))
            }),
            reservePasswordResetSentTime: async (email, sentTime, intervalStartTime) => {
                if(forgotSetup.storedSentTime > intervalStartTime){
                    return false;
                }
                forgotSetup.storedSentTime = sentTime;
                forgotSetup.reservations.push({email, sentTime});
                return true;
            },
            updateUserByEmail: async (email, updatePatch) => forgotSetup.userUpdates.push({email, updatePatch})
        };
        forgotPassword.sendForgotPasswordEmail = async (userData) => {
            forgotSetup.sentEmails.push(userData.email);
            return emailSendResult;
        };
        forgotSetup.forgotPassword = forgotPassword;
        return forgotSetup;
    }

    createUsersManagerWithUpdateResult(updateResult, updateCalls)
    {
        let usersManager = Object.create(UsersManager.prototype);
        usersManager.usersRepository = {
            update: async (filters, updatePatch) => {
                updateCalls.push({filters, updatePatch});
                return updateResult;
            }
        };
        return usersManager;
    }

    async testTheResetEmailIsNotSentAgainInsideTheStoredInterval()
    {
        await this.test('the reset email is not sent again inside the stored per user interval', async () => {
            let forgotSetup = this.createForgotPasswordSetup(Date.now()-60000, true);
            await forgotSetup.forgotPassword.processForgotPassword({forgot: true, email: this.userEmail}, '10.0.0.1');
            this.assert.strictEqual(forgotSetup.sentEmails.length, 0);
            this.assert.strictEqual(forgotSetup.reservations.length, 0);
            this.assert.strictEqual(forgotSetup.userUpdates.length, 0);
        });
    }

    async testTheResetEmailIsSentAfterReservingTheSentTime()
    {
        await this.test('the reset email is sent after reserving the sent time once the interval passed', async () => {
            let forgotSetup = this.createForgotPasswordSetup(Date.now()-this.forgotIntervalMs-1000, true);
            let requestTime = Date.now();
            await forgotSetup.forgotPassword.processForgotPassword({forgot: true, email: this.userEmail}, '10.0.0.1');
            this.assert.deepStrictEqual(forgotSetup.sentEmails, [this.userEmail]);
            this.assert.strictEqual(forgotSetup.reservations.length, 1);
            this.assert.strictEqual([...forgotSetup.reservations].shift().email, this.userEmail);
            this.assert.strictEqual(requestTime <= [...forgotSetup.reservations].shift().sentTime, true);
            this.assert.strictEqual(forgotSetup.userUpdates.length, 0);
        });
    }

    async testConcurrentRequestsSendASingleResetEmail()
    {
        await this.test('concurrent forgot password requests for one account send a single reset email', async () => {
            let forgotSetup = this.createForgotPasswordSetup(Date.now()-this.forgotIntervalMs-1000, true);
            let forgotRequest = {forgot: true, email: this.userEmail};
            await Promise.all([
                forgotSetup.forgotPassword.processForgotPassword(forgotRequest, '10.0.0.1'),
                forgotSetup.forgotPassword.processForgotPassword(forgotRequest, '10.0.0.2')
            ]);
            this.assert.deepStrictEqual(forgotSetup.sentEmails, [this.userEmail]);
            this.assert.strictEqual(forgotSetup.reservations.length, 1);
        });
    }

    async testAFailedSendReleasesTheReservedSentTime()
    {
        await this.test('a reset email that could not be sent restores the previous sent time', async () => {
            let lastSentTime = Date.now()-this.forgotIntervalMs-1000;
            let forgotSetup = this.createForgotPasswordSetup(lastSentTime, false);
            await forgotSetup.forgotPassword.processForgotPassword({forgot: true, email: this.userEmail}, '10.0.0.1');
            this.assert.strictEqual(forgotSetup.reservations.length, 1);
            this.assert.deepStrictEqual(forgotSetup.userUpdates, [{
                email: this.userEmail,
                updatePatch: {password_reset_sent_at: sc.formatDate(new Date(lastSentTime))}
            }]);
        });
    }

    async testTheReservationUpdatesOnlyAUserWithoutASendInsideTheInterval()
    {
        await this.test('the reservation updates the user only without a send stored inside the interval', async () => {
            let updateCalls = [];
            let usersManager = this.createUsersManagerWithUpdateResult(1, updateCalls);
            let sentTime = Date.now();
            let intervalStartTime = sentTime - this.forgotIntervalMs;
            let reserved = await usersManager.reservePasswordResetSentTime(
                this.userEmail,
                sentTime,
                intervalStartTime
            );
            this.assert.strictEqual(reserved, true);
            this.assert.deepStrictEqual(updateCalls, [{
                filters: {
                    email: this.userEmail,
                    OR: [
                        {password_reset_sent_at: null},
                        {password_reset_sent_at: {operator: 'LTE', value: sc.formatDate(new Date(intervalStartTime))}}
                    ]
                },
                updatePatch: {password_reset_sent_at: sc.formatDate(new Date(sentTime))}
            }]);
        });
    }

    async testTheReservationFailsWhenNoRowWasUpdated()
    {
        await this.test('the reservation fails when the driver reports no updated rows', async () => {
            let sentTime = Date.now();
            let intervalStartTime = sentTime - this.forgotIntervalMs;
            for(let updateResult of [0, {count: 0}]){
                let usersManager = this.createUsersManagerWithUpdateResult(updateResult, []);
                let reserved = await usersManager.reservePasswordResetSentTime(
                    this.userEmail,
                    sentTime,
                    intervalStartTime
                );
                this.assert.strictEqual(reserved, false);
            }
            let countUsersManager = this.createUsersManagerWithUpdateResult({count: 1}, []);
            let countReserved = await countUsersManager.reservePasswordResetSentTime(
                this.userEmail,
                sentTime,
                intervalStartTime
            );
            this.assert.strictEqual(countReserved, true);
        });
    }

    async testThePasswordIsReplacedOnlyWhenTheStoredHashDidNotChange()
    {
        await this.test('the password replace filters by the user ID and the current hash', async () => {
            let updateCalls = [];
            let usersManager = this.createUsersManagerWithUpdateResult(1, updateCalls);
            let replaced = await usersManager.replacePasswordIfUnchanged(7, 'current-hash', 'new-hash');
            this.assert.strictEqual(replaced, true);
            this.assert.deepStrictEqual(updateCalls, [{
                filters: {id: 7, password: 'current-hash'},
                updatePatch: {password: 'new-hash'}
            }]);
        });
    }

    async testThePasswordReplaceFailsWhenNoRowWasUpdated()
    {
        await this.test('the password replace fails when the driver reports no updated rows', async () => {
            for(let updateResult of [0, {count: 0}]){
                let usersManager = this.createUsersManagerWithUpdateResult(updateResult, []);
                this.assert.strictEqual(await usersManager.replacePasswordIfUnchanged(7, 'old', 'new'), false);
            }
        });
    }

}

module.exports.TestForgotPassword = TestForgotPassword;
