/**
 *
 * Reldens - Feature Properties Overrides
 *
 * Server side e2e endpoint that changes a property of a live feature object found by its path in the server features
 * list (like the users plugin "usePlayerSpeedProperty" or the rewards subscriber "splitExperience", values the features
 * read from the config once on start; an array item is reached by its index in the path, like
 * "rewards/package/rewardsEventsHandler/activeRewards/0/eventData"), and that cancels a server event for a group (a
 * listener added once per event name sets the given flag of the event data, continueEvent by default or the flag of
 * that event like continueStart, false while the cancelled flag of that event is on, and counts every event it
 * cancelled, read by event name), both kept and restored per parallel spec group by LiveObjectsOverrides.
 *
 */

const { LiveObjectsOverrides } = require('./live-objects-overrides');
const { Logger, sc } = require('@reldens/utils');

class FeaturePropertiesOverrides
{

    static cancelledEvents = {};
    static cancelledEventsCounts = {};

    static changeFeatureProperty(serverManager, groupKey, featurePath, propertyKey, value)
    {
        let target = LiveObjectsOverrides.fetchPathTarget(serverManager.featuresManager.featuresList, featurePath.split('/'));
        if(!target || !sc.hasOwn(target, propertyKey)){
            return {error: 'Property '+propertyKey+' not found in the feature object '+featurePath+'.'};
        }
        LiveObjectsOverrides.changeProperty(groupKey, target, propertyKey, value, false);
        return {featurePath, propertyKey, value: target[propertyKey]};
    }

    static cancelEvent(serverManager, groupKey, eventName, flagKey)
    {
        if(!sc.hasOwn(FeaturePropertiesOverrides.cancelledEvents, eventName)){
            FeaturePropertiesOverrides.cancelledEvents[eventName] = false;
            FeaturePropertiesOverrides.cancelledEventsCounts[eventName] = 0;
            serverManager.events.on(eventName, (event) => {
                if(FeaturePropertiesOverrides.cancelledEvents[eventName]){
                    event[flagKey] = false;
                    FeaturePropertiesOverrides.cancelledEventsCounts[eventName]++;
                }
            });
        }
        LiveObjectsOverrides.changeProperty(groupKey, FeaturePropertiesOverrides.cancelledEvents, eventName, true, false);
        return {
            eventName,
            cancelled: FeaturePropertiesOverrides.cancelledEvents[eventName],
            cancelledCount: FeaturePropertiesOverrides.cancelledEventsCounts[eventName]
        };
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/live-objects/feature-property', (request, response) => {
            response.json(FeaturePropertiesOverrides.changeFeatureProperty(
                serverManager,
                sc.get(request.body, 'group', ''),
                String(sc.get(request.body, 'featurePath', '')),
                String(sc.get(request.body, 'propertyKey', '')),
                sc.get(request.body, 'value', null)
            ));
        });
        serverManager.app.post('/api/e2e/live-objects/cancel-event', (request, response) => {
            response.json(FeaturePropertiesOverrides.cancelEvent(
                serverManager,
                sc.get(request.body, 'group', ''),
                String(sc.get(request.body, 'eventName', '')),
                String(sc.get(request.body, 'flagKey', 'continueEvent'))
            ));
        });
        serverManager.app.get('/api/e2e/live-objects/cancelled-events', (request, response) => {
            response.json(FeaturePropertiesOverrides.cancelledEventsCounts);
        });
        Logger.info('[feature-properties-overrides] Feature properties overrides endpoint registered.');
    }

}

module.exports.FeaturePropertiesOverrides = FeaturePropertiesOverrides;
