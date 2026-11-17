/**
 *
 * Reldens - Test Animation Objects
 *
 * Tests the town animation objects (exclusive group, two players in the town, the room messages of both recorded and
 * the start, complete and restart events of the object sprite watched on both clients): the house door, stored to run
 * on hit and visible to the room, walked into by one player sends its animation to both players and plays on both, and
 * on the client that stays in the town it is rewound and paused on its first frame once its stored restart time
 * passed; the door changed to be visible only to the player sends its animation only to the player who walked into it;
 * and Alfred, stored to run on action and visible only to the player, sends its animation only to the player who opened
 * its dialog, and changed to be visible to the room, to both players.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TeamSteps } = require('./helpers/team-steps');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { NpcDialogSteps } = require('./helpers/npc-dialog-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ObjectsConst } = require('../../lib/objects/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAnimationObjects
{

    static DOOR_KEY = 'door_house_3';
    static DOOR_HOUSE_ROOM = 'reldens-house-1';
    static SPRITE_EVENTS = ['animationstart', 'animationcomplete', 'animationrestart'];
    static fetchSpriteEvents = async (player) => player.page.evaluate(() => window.e2eSpriteEvents);
    static fetchSpriteFrame = async (player, objectKey) => player.page.evaluate(
        (key) => (({isPaused, currentFrame}) => ({isPaused, isFirst: Boolean(currentFrame?.isFirst)}))(
            window.reldens.getActiveScene().objectsAnimations[key].sceneSprite.anims
        ),
        objectKey
    );
    static fetchStoredParams = async (context, objectKey) => (await E2eSeedAndRestoreApi.loadRows(
        context.gameConfig,
        'objects',
        {client_key: objectKey}
    )).map(row => ({privateParams: sc.toJson(row.private_params, {}), clientParams: sc.toJson(row.client_params, {})})).shift();
    static walkIntoDoor = async (context, player) => ChangePointsSteps.walkUpIntoRoom(
        context,
        player,
        await ChangePointsSteps.loadTopology(context.gameConfig),
        Login.TOWN_ROOM_NAME,
        TestAnimationObjects.DOOR_HOUSE_ROOM
    );

    static async watchSpriteEvents(player, objectKey)
    {
        await player.page.evaluate((args) => {
            window.e2eSpriteEvents = [];
            let sprite = window.reldens.getActiveScene().objectsAnimations[args.objectKey].sceneSprite;
            let record = (eventName, animation) => window.e2eSpriteEvents.push({event: eventName+':'+animation.key, at: Date.now()});
            for(let eventName of args.eventNames){
                sprite.on(eventName, (animation) => record(eventName, animation));
            }
        }, {objectKey, eventNames: TestAnimationObjects.SPRITE_EVENTS});
    }

    static async enterWatching(context, objectKey)
    {
        let players = await TeamSteps.enterPlayers(context, 2);
        for(let player of players){
            await Phaser.waitForObject(player.page, objectKey, TimeConstants.SCENE_LOAD);
            await RoomMessagesRecorder.start(player.page);
            await TestAnimationObjects.watchSpriteEvents(player, objectKey);
        }
        return players;
    }

    static async expectAnimationReached(players, objectKey, expectedCounts, message)
    {
        await players[0].page.waitForTimeout(TimeConstants.ACTION);
        for(let i = 0; i < players.length; i++){
            expect(
                (await RoomMessagesRecorder.fetchMessages(players[i].page, ObjectsConst.OBJECT_ANIMATION))
                    .filter(animationMessage => objectKey === animationMessage.key).length,
                message+': '+players[i].playerName
            ).toBe(expectedCounts[i]);
        }
    }

    static async runDoorRoomVisibleTest(context)
    {
        let doorKey = TestAnimationObjects.DOOR_KEY;
        let stored = await TestAnimationObjects.fetchStoredParams(context, doorKey);
        expect(stored.privateParams, 'The door is stored to run on hit for the room').toMatchObject({runOnHit: true, roomVisible: true});
        let players = await TestAnimationObjects.enterWatching(context, doorKey);
        expect(await TestAnimationObjects.fetchSpriteFrame(players[1], doorKey), 'The door has not played its animation yet')
            .toEqual({isPaused: false, isFirst: false});
        await TestAnimationObjects.walkIntoDoor(context, players[0]);
        await TestAnimationObjects.expectAnimationReached(players, doorKey, [1, 1], 'The door animation reaches every player');
        expect(
            (await TestAnimationObjects.fetchSpriteEvents(players[0])).shift().event,
            'The door animation plays for the player walking into it'
        ).toBe('animationstart:'+doorKey);
        await expect.poll(
            async () => [
                (await TestAnimationObjects.fetchSpriteEvents(players[1])).map(spriteEvent => spriteEvent.event),
                await TestAnimationObjects.fetchSpriteFrame(players[1], doorKey)
            ],
            {
                message: 'The door plays for the other player and is rewound and paused on its first frame',
                timeout: stored.clientParams.restartTime + TimeConstants.SERVER_RESPONSE
            }
        ).toEqual([
            TestAnimationObjects.SPRITE_EVENTS.map(eventName => eventName+':'+doorKey),
            {isPaused: true, isFirst: true}
        ]);
        let observedEvents = await TestAnimationObjects.fetchSpriteEvents(players[1]);
        expect(observedEvents[2].at - observedEvents[1].at, 'The door is rewound once its restart time passed')
            .toBeGreaterThanOrEqual(stored.clientParams.restartTime);
    }

    static async runDoorPlayerVisibleTest(context)
    {
        let doorKey = TestAnimationObjects.DOOR_KEY;
        let players = await TestAnimationObjects.enterWatching(context, doorKey);
        await NpcDialogSteps.changeObjectProperty(context, Login.TOWN_ROOM_NAME, doorKey, 'roomVisible', false);
        await NpcDialogSteps.changeObjectProperty(context, Login.TOWN_ROOM_NAME, doorKey, 'playerVisible', true);
        await TestAnimationObjects.walkIntoDoor(context, players[0]);
        await TestAnimationObjects.expectAnimationReached(
            players,
            doorKey,
            [1, 0],
            'The player visible door animation reaches only the player walking into it'
        );
        expect(await TestAnimationObjects.fetchSpriteEvents(players[1]), 'The door does not play for the other player')
            .toEqual([]);
    }

    static async runNpcActionTest(context, isRoomVisible)
    {
        let npcKey = context.gameConfig.e2eNpcKey;
        expect((await TestAnimationObjects.fetchStoredParams(context, npcKey)).privateParams, 'Alfred is stored to run on action')
            .toMatchObject({runOnAction: true, playerVisible: true});
        let players = await TestAnimationObjects.enterWatching(context, npcKey);
        if(isRoomVisible){
            await NpcDialogSteps.changeObjectProperty(context, Login.TOWN_ROOM_NAME, npcKey, 'roomVisible', true);
            await NpcDialogSteps.changeObjectProperty(context, Login.TOWN_ROOM_NAME, npcKey, 'playerVisible', false);
        }
        await NpcDialogSteps.openDialog(context, players[0].page, npcKey);
        await TestAnimationObjects.expectAnimationReached(
            players,
            npcKey,
            [1, isRoomVisible ? 1 : 0],
            'The NPC action animation reaches the players it is visible to'
        );
    }

    static run()
    {
        test.describe('Animation Objects', () => {
            test('the room visible door walked into plays on every client and is rewound after its restart time', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestAnimationObjects.runDoorRoomVisibleTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the player visible door walked into plays only for the player walking into it', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestAnimationObjects.runDoorPlayerVisibleTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('the player visible NPC action animation reaches only the player opening its dialog', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestAnimationObjects.runNpcActionTest({page, secondPage, gameConfig, e2eGroup, longRun}, false);
            });
            test('the room visible NPC action animation reaches every player of the room', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestAnimationObjects.runNpcActionTest({page, secondPage, gameConfig, e2eGroup, longRun}, true);
            });
        });
    }

}

TestAnimationObjects.run();
