/**
 *
 * Reldens - EventHandler
 *
 * Base class for reward event handlers, providing a template method for updating event state.
 *
 */

const { Logger } = require('@reldens/utils');

class EventHandler
{

    // @Note: handler will be bind to the RewardsEventsHandler.
    updateEventState()
    {
        Logger.warning('Update event state undefined.');
    }

}

module.exports.EventHandler = EventHandler;
