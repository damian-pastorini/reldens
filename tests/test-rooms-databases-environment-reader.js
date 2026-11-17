/**
 *
 * Reldens - Test Rooms Databases Environment Reader
 *
 * Tests the rooms databases read from RELDENS_ROOMS_DATABASES into the server configuration: the configured URLs are
 * kept as they are and a missing variable gives an empty value, so the names are checked on no other server.
 *
 */

const { BaseTest } = require('./base-test');
const { EnvironmentVariablesReader } = require('../lib/game/server/environment-variables-reader');
const { sc } = require('@reldens/utils');

class TestRoomsDatabasesEnvironmentReader extends BaseTest
{

    readRoomsDatabases(environmentValue)
    {
        let hasPreviousValue = sc.hasOwn(process.env, 'RELDENS_ROOMS_DATABASES');
        let previousValue = process.env.RELDENS_ROOMS_DATABASES;
        delete process.env.RELDENS_ROOMS_DATABASES;
        if(false !== environmentValue){
            process.env.RELDENS_ROOMS_DATABASES = environmentValue;
        }
        let roomsDatabases = EnvironmentVariablesReader.fetchConfigServerFromEnvironmentVariables().rooms.databases;
        delete process.env.RELDENS_ROOMS_DATABASES;
        if(hasPreviousValue){
            process.env.RELDENS_ROOMS_DATABASES = previousValue;
        }
        return roomsDatabases;
    }

    async testTheRoomsDatabasesAreReadFromTheEnvironment()
    {
        await this.test('the rooms databases are read from the environment and are empty when not set', async () => {
            this.assert.deepStrictEqual(
                [this.readRoomsDatabases('http://server-b:8080,http://server-c:8080'), this.readRoomsDatabases(false)],
                ['http://server-b:8080,http://server-c:8080', '']
            );
        });
    }

}

module.exports.TestRoomsDatabasesEnvironmentReader = TestRoomsDatabasesEnvironmentReader;
