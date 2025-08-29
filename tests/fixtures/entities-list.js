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
            ...this.getEntitiesWithoutRequiredFK(),
            ...this.getEntitiesWithRequiredFK(),
            ...this.getEntitiesWithUploadsButNoRequiredFK(),
            ...this.getEntitiesWithUploadsAndRequiredFK()
        ];
    }

    static getEntitiesWithoutRequiredFK()
    {
        return [
            'ads', 'ads-banner', 'ads-event-video', 'ads-providers', 'ads-types',
            'config', 'config-types', 'features', 'locale', 'snippets',
            'users', 'stats', 'items-group', 'items-types', 'audio-categories',
            'operation-types', 'target-options', 'skills-levels-set', 'skills-groups',
            'skills-skill-type', 'objects-types', 'scores', 'clan-levels'
        ];
    }

    static getEntitiesWithRequiredFK()
    {
        return [
            'chat', 'chat-message-types', 'respawn', 'rewards', 'rewards-modifiers',
            'rewards-events', 'rewards-events-state', 'players', 'players-state',
            'players-stats', 'users-locale', 'objects-animations', 'objects-items-inventory',
            'objects-items-requirements', 'objects-items-rewards', 'objects-skills',
            'objects-stats', 'rooms-change-points', 'rooms-return-points',
            'skills-class-path', 'skills-class-path-level-labels', 'skills-class-path-level-skills',
            'skills-levels', 'skills-levels-modifiers', 'skills-class-level-up-animations', 'skills-owners-class-path',
            'skills-skill-attack', 'skills-skill-group-relation', 'skills-skill-owner-conditions',
            'skills-skill-owner-effects', 'skills-skill-physical-data', 'skills-skill-target-effects',
            'items-item', 'items-item-modifiers', 'audio-markers', 'audio-player-config', 'ads-played', 'objects',
            'objects-assets', 'skills-skill', 'skills-skill-animations',
            'scores-detail', 'clan', 'clan-levels-modifiers', 'clan-members', 'users-login'
        ];
    }

    static getEntitiesWithUploadsButNoRequiredFK()
    {
        return ['rooms', 'audio'];
    }

    static getEntitiesWithUploadsAndRequiredFK()
    {
        return ['drops-animations'];
    }

    static getEntityIdField(entity)
    {
        let customIdFields = {
            'objects-assets': 'object_asset_id'
        };
        return customIdFields[entity] || 'id';
    }

}

module.exports.EntitiesList = EntitiesList;
