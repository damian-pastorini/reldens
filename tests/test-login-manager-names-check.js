/**
 *
 * Reldens - Test Login Manager Names Check
 *
 * Tests the names check wiring of the LoginManager: the checked servers are the valid configured databases URLs
 * without trailing slashes nor this server (with a path and a trailing slash too), the own address the received checks
 * are validated with is the normalized public URL (empty when it can not be parsed), and the usernames and the player
 * names get their own check on their own route, the registration the usernames one and the player creation the player
 * names one.
 *
 */

const { BaseTest } = require('./base-test');
const { LoginManager } = require('../lib/game/server/login-manager');
const { ServerMessengerPropsBuilder } = require('./fixtures/server-messenger-props-builder');
const { UserDisconnectionBuilder } = require('./fixtures/user-disconnection-builder');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestLoginManagerNamesCheck extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.serverAUrl = 'http://server-a:8080';
        this.routePaths = GameConst.ROUTE_PATHS;
    }

    createLoginManager(configValues)
    {
        let loginManager = Object.create(LoginManager.prototype);
        loginManager.config = {getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue)};
        loginManager.serverToServerMessengerProps = ServerMessengerPropsBuilder.createShared('', {}, '', configValues);
        return loginManager;
    }

    fetchServersUrls(loginManager)
    {
        return loginManager.createCrossServerNamesCheck(this.routePaths.CHECK_PLAYER_NAME).serversUrls;
    }

    async testTheCheckedServersAreTheValidConfiguredUrlsWithoutThisServer()
    {
        await this.test('the checked servers are the valid configured URLs without trailing slashes nor this server', async () => {
            let configuredServers = ' http://server-a:8080/ , http://server-b:8080,not an url,, http://server-c:8080//'
                +',http://server-d:8080/game/';
            let loginManager = this.createLoginManager({
                'server/rooms/databases': configuredServers,
                'server/publicUrl': this.serverAUrl
            });
            this.assert.deepStrictEqual(this.fetchServersUrls(loginManager), [
                'http://server-b:8080',
                'http://server-c:8080',
                'http://server-d:8080/game'
            ]);
            let withoutPublicUrl = this.createLoginManager({'server/rooms/databases': configuredServers});
            this.assert.deepStrictEqual(this.fetchServersUrls(withoutPublicUrl), [
                'http://server-a:8080',
                'http://server-b:8080',
                'http://server-c:8080',
                'http://server-d:8080/game'
            ]);
            this.assert.deepStrictEqual(this.fetchServersUrls(this.createLoginManager({})), []);
        });
    }

    async testThisServerWithAPathAndATrailingSlashIsNotChecked()
    {
        await this.test('this server public URL with a path and a trailing slash is never a checked server', async () => {
            let loginManager = this.createLoginManager({
                'server/rooms/databases': 'http://server-d:8080/game/,http://server-b:8080',
                'server/publicUrl': 'http://server-d:8080/game/'
            });
            this.assert.deepStrictEqual(this.fetchServersUrls(loginManager), ['http://server-b:8080']);
            let withoutSlash = this.createLoginManager({
                'server/rooms/databases': 'http://server-d:8080/game/,http://server-b:8080',
                'server/publicUrl': 'http://server-d:8080/game'
            });
            this.assert.deepStrictEqual(this.fetchServersUrls(withoutSlash), ['http://server-b:8080']);
        });
    }

    async testTheServerSelfAddressIsTheNormalizedPublicUrl()
    {
        await this.test('the own names check address is the normalized public URL and empty when it can not be parsed', async () => {
            let publicUrls = ['ws://server-a:8080/', 'http://server-d:8080/game/', 'not an url', ''];
            let addresses = [];
            for(let publicUrl of publicUrls){
                addresses.push(
                    this.createLoginManager({'server/publicUrl': publicUrl})
                        .createCrossServerNamesCheck(this.routePaths.CHECK_USER_NAME)
                        .serverSelfAddress
                );
            }
            this.assert.deepStrictEqual(addresses, [this.serverAUrl, 'http://server-d:8080/game', '', '']);
        });
    }

    async testEveryNamesRouteGetsItsOwnCheck()
    {
        await this.test('the usernames and the player names get their own check on their own route', async () => {
            let loginManager = UserDisconnectionBuilder.createLoginManager({});
            this.assert.deepStrictEqual(
                [
                    loginManager.userNamesCheck.routePath,
                    loginManager.playerNamesCheck.routePath,
                    loginManager.userRegistration.crossServerNamesCheck === loginManager.userNamesCheck,
                    loginManager.playerCreation.crossServerNamesCheck === loginManager.playerNamesCheck
                ],
                [this.routePaths.CHECK_USER_NAME, this.routePaths.CHECK_PLAYER_NAME, true, true]
            );
        });
    }

}

module.exports.TestLoginManagerNamesCheck = TestLoginManagerNamesCheck;
