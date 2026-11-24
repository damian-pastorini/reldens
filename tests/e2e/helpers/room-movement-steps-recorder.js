/**
 *
 * Reldens - Room Movement Steps Recorder
 *
 * Server side e2e endpoints that record the movement of one player body of a live scene room step by step: on every
 * physics world step the position, the velocity, the path it follows and the speed to next retry counter, and on every
 * wall or object hit event of that body the event name and the other body. The recorded steps are read once, which
 * stops the recording, so a movement spec that fails can show which step emptied or stopped the path.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { RoomMovementState } = require('./room-movement-state');
const { Logger, sc } = require('@reldens/utils');

class RoomMovementStepsRecorder
{

    static HIT_EVENTS = [
        'reldens.playerHitWallBegin',
        'reldens.startPlayerHitWallEnd',
        'reldens.endPlayerHitWallEnd',
        'reldens.startPlayerHitObjectBegin',
        'reldens.playerHitObjectEnd'
    ];
    static MAX_STEPS = 600;
    static recording = false;

    static mapStep(body, stepName)
    {
        return {
            step: stepName,
            x: sc.roundToPrecision(body.position[0], 2),
            y: sc.roundToPrecision(body.position[1], 2),
            velocity: [sc.roundToPrecision(body.velocity[0], 2), sc.roundToPrecision(body.velocity[1], 2)],
            path: RoomMovementState.mapPath(body.autoMoving),
            retries: Object.assign({}, body.speedToNextRetryCounter)
        };
    }

    static pushStep(body, stepName)
    {
        if(RoomMovementStepsRecorder.MAX_STEPS <= RoomMovementStepsRecorder.recording.steps.length){
            return false;
        }
        RoomMovementStepsRecorder.recording.steps.push(RoomMovementStepsRecorder.mapStep(body, stepName));
        return true;
    }

    static stop()
    {
        if(!RoomMovementStepsRecorder.recording){
            return [];
        }
        let recording = RoomMovementStepsRecorder.recording;
        recording.world.off('postStep', recording.onPostStep);
        RoomMovementStepsRecorder.recording = false;
        return recording.steps;
    }

    static start(room, playerName)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        if(!playerSchema){
            return {error: 'Player '+playerName+' not found in room '+room.roomName+'.'};
        }
        RoomMovementStepsRecorder.stop();
        let body = playerSchema.physicalBody;
        RoomMovementStepsRecorder.recording = {
            body,
            world: room.roomWorld,
            steps: [],
            onPostStep: () => RoomMovementStepsRecorder.pushStep(body, 'postStep')
        };
        room.roomWorld.on('postStep', RoomMovementStepsRecorder.recording.onPostStep);
        return {recording: true};
    }

    static recordHitEvent(eventName, event)
    {
        if(!RoomMovementStepsRecorder.recording || RoomMovementStepsRecorder.recording.body !== event?.playerBody){
            return false;
        }
        let otherBody = event.wallBody || event.otherBody || false;
        return RoomMovementStepsRecorder.pushStep(
            event.playerBody,
            eventName+':'+(otherBody ? (otherBody.bodyKey || otherBody.id) : '')
        );
    }

    static registerEndpoints(serverManager)
    {
        for(let eventName of RoomMovementStepsRecorder.HIT_EVENTS){
            serverManager.events.on(eventName, (event) => RoomMovementStepsRecorder.recordHitEvent(eventName, event));
        }
        serverManager.app.post('/api/e2e/movement/steps-record', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomMovementStepsRecorder.start(room, sc.get(request.body, 'playerName', ''))
            );
        });
        serverManager.app.get('/api/e2e/movement/steps-recorded', (request, response) => {
            response.json({steps: RoomMovementStepsRecorder.stop()});
        });
        Logger.info('[room-movement-steps-recorder] Movement steps recorder endpoints registered.');
    }

}

module.exports.RoomMovementStepsRecorder = RoomMovementStepsRecorder;
