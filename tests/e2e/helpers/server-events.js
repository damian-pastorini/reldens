/**
 *
 * Reldens - Server Events Helper
 *
 * Wraps Colyseus room event listeners used during globalSetup data collection.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class ServerEvents
{

    static eventsFilePath()
    {
        return FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', 'server-events.jsonl');
    }

    static readAllEvents()
    {
        let filePath = ServerEvents.eventsFilePath();
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
        for(let e of allEvents) {
            if(e.ts >= timestamp && e.event === eventName) {
                result.push(e);
            }
        }
        return result;
    }

    static getLatestEvent(eventName)
    {
        let allEvents = ServerEvents.readAllEvents();
        let latest = null;
        for(let e of allEvents) {
            if(e.event === eventName) {
                latest = e;
            }
        }
        return latest;
    }
}

module.exports.ServerEvents = ServerEvents;
