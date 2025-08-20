/**
 *
 * Reldens - EntitiesList
 *
 */

class EntitiesList
{

    static getAll()
    {
        return [
            'rooms', 'objects', 'skills', 'items', 'ads', 'audio', 'chat',
            'config', 'features', 'respawn', 'rewards', 'snippets',
            'teams', 'users'
        ];
    }

}

module.exports.EntitiesList = EntitiesList;
