/**
 *
 * Reldens - SetupServerProperties
 *
 */

const { PropertiesHandler } = require('../../game/properties-handler');
const { sc } = require('@reldens/utils');

class SetupServerProperties extends PropertiesHandler
{

    constructor(props)
    {
        super();
        this.events = sc.get(props, 'events', false);
        this.dataServer = sc.get(props, 'dataServer', false);
        this.config = sc.get(props, 'config', {});
        this.featuresManager = sc.get(props, 'featuresManager', false);
        this.requiredProperties = Object.keys(this);
    }

}

module.exports.SetupServerProperties = SetupServerProperties
