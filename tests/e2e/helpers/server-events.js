/**
 *
 * Reldens - Server Events Helper
 *
 * Wraps Colyseus room event listeners used during globalSetup data collection.
 *
 */

const { E2eInstance } = require('./e2e-instance');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class ServerEvents
{

    static readAllEvents()
    {
        let filePath = E2eInstance.generatedFilePath('server-events.jsonl');
        if(!FileHandler.exists(filePath)) {
            return [];
        }
        let content = FileHandler.readFile(filePath);
        if(!content) {
            return [];
        }
        let result = [];
        for(let line of content.split('\n')) {
            if(!line.trim()) {
                continue;
            }
            try {
                result.push(JSON.parse(line));
            } catch(parseError) {
                Logger.warning('[server-events] Malformed line in server-events.jsonl: '+parseError.message);
            }
        }
        return result;
    }

    static getEventsAfter(timestamp, eventName)
    {
        let allEvents = ServerEvents.readAllEvents();
        let result = [];
        for(let serverEvent of allEvents) {
            if(serverEvent.ts >= timestamp && serverEvent.event === eventName) {
                result.push(serverEvent);
            }
        }
        return result;
    }

    static getLatestEvent(eventName)
    {
        let allEvents = ServerEvents.readAllEvents();
        let latest = null;
        for(let serverEvent of allEvents) {
            if(serverEvent.event === eventName) {
                latest = serverEvent;
            }
        }
        return latest;
    }
}

module.exports.ServerEvents = ServerEvents;
