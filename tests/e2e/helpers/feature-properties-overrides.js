/**
 *
 * Reldens - Feature Properties Overrides
 *
 * Server side e2e endpoint that changes a property of a live feature object found by its path in the server features
 * list (like the users plugin "usePlayerSpeedProperty" or the rewards subscriber "splitExperience", values the features
 * read from the config once on start), kept and restored per parallel spec group by LiveObjectsOverrides.
 *
 */

const { LiveObjectsOverrides } = require('./live-objects-overrides');
const { Logger, sc } = require('@reldens/utils');

class FeaturePropertiesOverrides
{

    static changeFeatureProperty(serverManager, groupKey, featurePath, propertyKey, value)
    {
        let target = sc.getByPath(serverManager.featuresManager.featuresList, featurePath.split('/'), false);
        if(!target || !sc.hasOwn(target, propertyKey)){
            return {error: 'Property '+propertyKey+' not found in the feature object '+featurePath+'.'};
        }
        LiveObjectsOverrides.changeProperty(groupKey, target, propertyKey, value, false);
        return {featurePath, propertyKey, value: target[propertyKey]};
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
        Logger.info('[feature-properties-overrides] Feature properties overrides endpoint registered.');
    }

}

module.exports.FeaturePropertiesOverrides = FeaturePropertiesOverrides;
