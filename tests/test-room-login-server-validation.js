/**
 *
 * Reldens - Test Room Login Server Validation
 *
 * Tests RoomLogin.isValidRoomOnServer with the room options built like the server does (the validation flag read from
 * the config and this server addresses from the shared servers values): with server/rooms/validateRoomOnServer on, a room
 * stored with this server baseUrl or publicUrl is valid with or without a trailing slash and with the ws scheme, a room
 * of another server or with an address that is not a URL is not; only the parsable baseUrl and publicUrl are checked
 * (with an empty or unparsable baseUrl the publicUrl alone); and a room without server URL, a server with no parsable
 * URL or the validation off accept every room.
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { ServerMessengerPropsBuilder } = require('./fixtures/server-messenger-props-builder');
const { RoomLogin } = require('../lib/rooms/server/login');

class TestRoomLoginServerValidation extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.baseUrl = 'http://localhost:8080';
        this.publicUrl = 'https://game.example.com/play';
    }

    isValidRoom(configValues, roomServerUrl)
    {
        return Object.create(RoomLogin.prototype).isValidRoomOnServer({
            validateRoomOnServer: GameplayPlayerBuilder.createConfigManager(configValues).getWithoutLogs(
                'server/rooms/validateRoomOnServer',
                true
            ),
            loginManager: {serverToServerMessengerProps: ServerMessengerPropsBuilder.createShared('', {}, '', configValues)},
            roomData: {serverUrl: roomServerUrl}
        });
    }

    async testARoomOfThisServerIsValidWithAnyEquivalentAddress()
    {
        await this.test('a room stored with this server baseUrl or publicUrl is valid with or without trailing slash', async () => {
            let configValues = {'server/baseUrl': this.baseUrl, 'server/publicUrl': this.publicUrl};
            let roomServerUrls = [
                this.baseUrl,
                this.baseUrl+'/',
                'ws://localhost:8080',
                this.publicUrl,
                this.publicUrl+'/',
                'wss://game.example.com/play'
            ];
            this.assert.deepStrictEqual(
                roomServerUrls.map(roomServerUrl => this.isValidRoom(configValues, roomServerUrl)),
                roomServerUrls.map(() => true)
            );
        });
    }

    async testARoomOfAnotherServerOrAnInvalidAddressIsNotValid()
    {
        await this.test('a room of another server or with an address that is not a URL is not valid', async () => {
            let roomServerUrls = [
                'http://localhost:8081',
                'https://localhost:8080',
                'https://game.example.com/other',
                'https://other.example.com/play',
                'not a url'
            ];
            for(let configValues of [
                {'server/baseUrl': this.baseUrl, 'server/publicUrl': this.publicUrl},
                {'server/baseUrl': this.baseUrl}
            ]){
                this.assert.deepStrictEqual(
                    roomServerUrls.map(roomServerUrl => this.isValidRoom(configValues, roomServerUrl)),
                    roomServerUrls.map(() => false)
                );
            }
            this.assert.strictEqual(this.isValidRoom({'server/baseUrl': this.baseUrl}, this.publicUrl), false);
        });
    }

    async testOnlyTheParseableServerUrlsAreChecked()
    {
        await this.test('with no or an unparsable baseUrl the room is checked against the publicUrl alone', async () => {
            let results = [];
            for(let baseUrl of ['', 'not a url']){
                let configValues = {'server/baseUrl': baseUrl, 'server/publicUrl': this.publicUrl};
                results.push([this.isValidRoom(configValues, this.publicUrl), this.isValidRoom(configValues, this.baseUrl)]);
            }
            this.assert.deepStrictEqual(
                [results, this.isValidRoom({'server/baseUrl': 'not a url'}, 'http://localhost:8081')],
                [[[true, false], [true, false]], true]
            );
        });
    }

    async testTheValidationAcceptsEveryRoomWhenItCanNotApply()
    {
        await this.test('a room without server URL, a server without baseUrl or the validation off accept every room', async () => {
            this.assert.deepStrictEqual(
                [
                    this.isValidRoom({'server/baseUrl': this.baseUrl}, ''),
                    this.isValidRoom({}, 'http://localhost:8081'),
                    this.isValidRoom(
                        {'server/baseUrl': this.baseUrl, 'server/rooms/validateRoomOnServer': false},
                        'http://localhost:8081'
                    )
                ],
                [true, true, true]
            );
        });
    }

}

module.exports.TestRoomLoginServerValidation = TestRoomLoginServerValidation;
