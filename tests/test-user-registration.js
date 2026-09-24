/**
 *
 * Reldens - Test User Registration
 *
 */

const { BaseTest } = require('./base-test');
const { UserRegistration } = require('../lib/game/server/user-registration');
const { LoginAttempts } = require('../lib/game/server/memory/login-attempts');
const { Encryptor } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestUserRegistration extends BaseTest
{

    createRegistrationSetup(registeredEmails, maxPerIp)
    {
        let registrationSetup = {
            createdUsers: [],
            emittedEvents: [],
            invalidResult: {error: 'invalid'},
            now: Date.now()
        };
        let configValues = {
            'server/players/guestsUser/emailDomain': '@guest.test',
            'client/general/users/allowGuestUserName': true,
            'server/security/registration/maxPerIp': maxPerIp,
            'server/security/guests/maxPerIp': maxPerIp
        };
        registrationSetup.userRegistration = new UserRegistration({
            config: {
                getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue),
                server: {players: {initialUser: {roleId: 1, status: 1}, guestUser: {roleId: 2}}}
            },
            usersManager: {
                loadUserByEmail: async (email) => -1 !== registeredEmails.indexOf(email) ? {id: 1, email} : false,
                createUser: async (userData) => {
                    registrationSetup.createdUsers.push(userData);
                    return Object.assign({id: 10}, userData);
                }
            },
            events: {
                emit: async (eventName) => registrationSetup.emittedEvents.push(eventName),
                emitSync: (eventName) => registrationSetup.emittedEvents.push(eventName)
            },
            passwordManager: Encryptor,
            loginAttempts: new LoginAttempts({maxAttempts: 1}),
            logUserData: (userData) => ({user: {username: userData.username}})
        });
        return registrationSetup;
    }

    async processRegistrations(registrationSetup, usernames, password)
    {
        let registrationResult = false;
        for(let username of usernames){
            registrationResult = await registrationSetup.userRegistration.processRegistrationRequest(
                {username, email: username+'@test.com', password, isNewUser: true},
                '10.0.0.1',
                registrationSetup.now,
                registrationSetup.invalidResult
            );
        }
        return registrationResult;
    }

    async processGuests(registrationSetup, guestsData)
    {
        let guestResult = false;
        for(let guestData of guestsData){
            guestResult = await registrationSetup.userRegistration.processGuestRequest(
                guestData,
                '10.0.0.1',
                registrationSetup.now,
                registrationSetup.invalidResult
            );
        }
        return guestResult;
    }

    async testTheRegisteredEmailIsRejectedAsALoginFailure()
    {
        await this.test('an already registered email is rejected and counted as a login failure', async () => {
            let registrationSetup = this.createRegistrationSetup(['taken@test.com'], 10);
            let registrationResult = await this.processRegistrations(registrationSetup, ['taken'], 'secret');
            let loginAttempts = registrationSetup.userRegistration.loginAttempts;
            this.assert.strictEqual(registrationResult, registrationSetup.invalidResult);
            this.assert.strictEqual(registrationSetup.createdUsers.length, 0);
            this.assert.strictEqual(loginAttempts.isLoginBlocked('taken', '', registrationSetup.now), true);
        });
    }

    async testTheRegistrationsAboveTheLimitPerAddressAreRejected()
    {
        await this.test('the registrations above the limit per address are rejected', async () => {
            let registrationSetup = this.createRegistrationSetup([], 1);
            let registrationResult = await this.processRegistrations(registrationSetup, ['first', 'second'], 'secret');
            this.assert.strictEqual(registrationResult, registrationSetup.invalidResult);
            this.assert.strictEqual(registrationSetup.createdUsers.length, 1);
            this.assert.strictEqual([...registrationSetup.createdUsers].shift().role_id, 1);
        });
    }

    async testThePasswordShorterThanThePolicyIsRejected()
    {
        await this.test('a registration password shorter than the policy minimum is rejected', async () => {
            let registrationSetup = this.createRegistrationSetup([], 10);
            let registrationResult = await this.processRegistrations(registrationSetup, ['player'], 'ab');
            this.assert.strictEqual(registrationResult, registrationSetup.invalidResult);
            this.assert.strictEqual(registrationSetup.createdUsers.length, 0);
            this.assert.deepStrictEqual(registrationSetup.emittedEvents, ['reldens.registrationInvalidPassword']);
        });
    }

    async testTheGuestGetsGeneratedCredentialsWithTheGuestsDomainAndRole()
    {
        await this.test('the guest account gets generated credentials with the guests domain and role', async () => {
            let registrationSetup = this.createRegistrationSetup([], 10);
            let guestData = {username: 'My Name!', isGuest: true, isNewUser: true};
            await this.processGuests(registrationSetup, [guestData]);
            let createdGuest = [...registrationSetup.createdUsers].shift();
            this.assert.strictEqual(createdGuest.username.startsWith('guest-'), true);
            this.assert.strictEqual(createdGuest.username.endsWith('-MyName'), true);
            this.assert.strictEqual(createdGuest.email, createdGuest.username+'@guest.test');
            this.assert.strictEqual(createdGuest.role_id, 2);
            this.assert.strictEqual(Encryptor.validatePassword(guestData.password, createdGuest.password), true);
        });
    }

    async testTheGuestsAboveTheLimitPerAddressAreRejected()
    {
        await this.test('the guests above the limit per address are rejected', async () => {
            let registrationSetup = this.createRegistrationSetup([], 1);
            let guestResult = await this.processGuests(
                registrationSetup,
                [{isGuest: true, isNewUser: true}, {isGuest: true, isNewUser: true}]
            );
            this.assert.strictEqual(guestResult, registrationSetup.invalidResult);
            this.assert.strictEqual(registrationSetup.createdUsers.length, 1);
        });
    }

}

module.exports.TestUserRegistration = TestUserRegistration;
