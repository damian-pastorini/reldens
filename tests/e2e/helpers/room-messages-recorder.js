/**
 *
 * Reldens - Room Messages Recorder
 *
 * Records every message the server sends to the active room of the page (the listener is added once per room and the
 * start clears the recorded list), reads the recorded messages of an action, waits for one, and sends raw messages to
 * the room: any message and an object message with the id the client uses for that object, so the specs send the
 * exact payloads a modified client could send.
 *
 */

class RoomMessagesRecorder
{

    static async start(page)
    {
        await page.evaluate(() => {
            let room = window.reldens.activeRoomEvents.room;
            window.e2eRoomMessages = [];
            if(window.e2eRecordedRoomId === room.roomId){
                return;
            }
            window.e2eRecordedRoomId = room.roomId;
            room.onMessage('*', (message) => {
                if(window.e2eRecordedRoomId === room.roomId && message && 'object' === typeof message){
                    window.e2eRoomMessages.push(message);
                }
            });
        });
    }

    static async fetchMessages(page, act)
    {
        return page.evaluate(
            (expectedAct) => (window.e2eRoomMessages || []).filter(message => expectedAct === message.act),
            act
        );
    }

    static async waitForMessage(page, act, timeout)
    {
        await page.waitForFunction(
            (expectedAct) => (window.e2eRoomMessages || []).some(message => expectedAct === message.act),
            act,
            {timeout}
        );
    }

    static async sendMessage(page, message)
    {
        await page.evaluate((roomMessage) => window.reldens.activeRoomEvents.send(roomMessage), message);
    }

    static async sendObjectMessage(page, objectKey, message)
    {
        return page.evaluate((args) => {
            let objectsAnimations = window.reldens.getActiveScene().objectsAnimations;
            let objectAnimation = objectsAnimations[args.objectKey]
                || Object.values(objectsAnimations).find(animation => animation.asset_key === args.objectKey);
            if(!objectAnimation){
                return false;
            }
            let objectId = objectAnimation.key === objectAnimation.asset_key ? objectAnimation.id : objectAnimation.key;
            window.reldens.activeRoomEvents.send(Object.assign({}, args.message, {id: objectId}));
            return objectId;
        }, {objectKey, message});
    }

}

module.exports.RoomMessagesRecorder = RoomMessagesRecorder;
