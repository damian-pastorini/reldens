/**
 *
 * Reldens - CrudTestData
 *
 */

class CrudTestData
{

    static getBaseTestIds()
    {
        return {
            users: 1001,
            rooms: 1001,
            objects: 1001,
            audio: 1001,
            config: 1003,
            features: 1003,
            respawn: 1001,
            rewards: 1001,
            snippets: 1001,
            chat: 1001,
            players: 1001,
            ads: 100,
            locale: 1,
            'items-item': 1001,
            'skills-skill': 1,
            stats: 1,
            'skills-levels': 1,
            'items-group': 1,
            'audio-categories': 1,
            'skills-class-path': 1,
            'skills-levels-set': 1,
            'skills-groups': 1,
            'objects-types': 1,
            'ads-providers': 1,
            'ads-types': 1,
            'config-types': 1,
            'skills-skill-type': 1,
            'items-types': 1,
            'operation-types': 1,
            'target-options': 1,
            'clan-levels': 1,
            scores: 1,
            'skills-skill-animations': 1,
            clan: 1,
            'users-locale-main': 1004,
            'users-locale-delete': 1005
        };
    }

    static getValidTestData(entity, testPrefix, uniqueSuffix = '')
    {
        let baseIds = this.getBaseTestIds();
        let timestamp = Date.now();
        let uniqueKey = uniqueSuffix ? testPrefix+'-'+uniqueSuffix+'-'+timestamp : testPrefix+'-'+timestamp;
        let testData = {
            rooms: {
                name: uniqueKey+'-room-test',
                title: 'Test Room '+uniqueSuffix+' '+timestamp,
                map_filename: 'test-room-'+uniqueSuffix+'.json',
                scene_images: 'test-scene-'+uniqueSuffix+'.png',
                room_class_key: null,
                server_url: null,
                customData: '{"allowGuest":true}'
            },
            objects: {
                room_id: baseIds.rooms,
                layer_name: 'test-objects-layer',
                tile_index: 1000+timestamp%1000,
                class_type: 1,
                object_class_key: uniqueKey+'-object-test',
                client_key: 'test-object-'+uniqueSuffix+'-'+timestamp,
                title: 'Test Object '+uniqueSuffix+' '+timestamp,
                private_params: '{"testParam":true}',
                client_params: '{"testClientParam":true}',
                enabled: 1
            },
            'objects-assets': {
                object_id: baseIds.objects,
                asset_type: 'spritesheet',
                asset_key: uniqueKey+'-asset',
                asset_file: 'test-asset-'+uniqueSuffix+'.png',
                extra_params: '{"frameWidth":32,"frameHeight":32}'
            },
            'skills-skill': {
                key: uniqueKey+'-skill-test',
                type: 1,
                label: 'Test Skill '+uniqueSuffix+' '+timestamp,
                autoValidation: 1,
                skillDelay: 1000,
                castTime: 0,
                usesLimit: 0,
                range: 100,
                rangeAutomaticValidation: 1,
                rangePropertyX: 'state/x',
                rangePropertyY: 'state/y',
                allowSelfTarget: 0,
                criticalChance: 10,
                criticalMultiplier: 2,
                criticalFixedValue: 0
            },
            'items-item': {
                key: uniqueKey+'-item-test',
                type: 1,
                group_id: 1,
                label: 'Test Item '+uniqueSuffix+' '+timestamp,
                description: 'Test item description '+uniqueSuffix,
                qty_limit: 0,
                uses_limit: 1,
                useTimeOut: null,
                execTimeOut: null,
                customData: '{"canBeDropped":true}'
            },
            ads: {
                key: uniqueKey+'-ad-test',
                provider_id: 1,
                type_id: 1,
                width: 320,
                height: 50,
                position: '',
                top: 0,
                bottom: 0,
                left: 0,
                right: 80,
                replay: 0,
                enabled: 1
            },
            'ads-banner': {
                ads_id: uniqueSuffix === 'delete' ? 101 : (uniqueSuffix === 'edit' ? 102 : baseIds.ads),
                banner_data: '{"testBanner":true}'
            },
            'ads-event-video': {
                ads_id: uniqueSuffix === 'delete' ? 101 : (uniqueSuffix === 'edit' ? 102 : baseIds.ads),
                event_key: 'test_event_'+uniqueSuffix,
                event_data: '{"testEvent":true}'
            },
            'ads-providers': {
                key: uniqueKey+'-provider',
                enabled: 1
            },
            'ads-types': {
                key: uniqueKey+'-type',
                label: 'Test Ad Type '+uniqueSuffix
            },
            'ads-played': {
                ads_id: baseIds.ads,
                player_id: baseIds.players,
                played_at: '2025-01-01 12:00:00'
            },
            audio: {
                audio_key: uniqueKey+'-audio-test',
                files_name: 'test-audio-'+uniqueSuffix+'-'+timestamp+'.mp3',
                config: '{"testConfig":true}',
                room_id: baseIds.rooms,
                category_id: baseIds['audio-categories'],
                enabled: 1
            },
            'audio-categories': {
                category_key: uniqueKey+'-category',
                category_label: 'Test Audio Category '+uniqueSuffix,
                enabled: 1,
                single_audio: 0
            },
            'audio-markers': {
                audio_id: baseIds.audio,
                marker_key: uniqueKey+'-marker'+(uniqueSuffix === 'delete' ? '-del' : ''),
                start: 0,
                duration: 10,
                config: null
            },
            'audio-player-config': {
                player_id: baseIds.players,
                category_id: uniqueSuffix === 'delete' ? 3 : baseIds['audio-categories'],
                enabled: 1,
                volume: 50
            },
            chat: {
                player_id: baseIds.players,
                room_id: baseIds.rooms,
                message: 'Test message '+uniqueSuffix+' '+timestamp,
                message_type: 1,
                message_time: '2025-01-01 12:00:00'
            },
            'chat-message-types': {
                key: uniqueKey+'-message-type'
            },
            config: {
                scope: 'test',
                path: uniqueKey+'.path.test',
                value: 'test value '+uniqueSuffix+' '+timestamp,
                type: 1
            },
            'config-types': {
                label: 'Test Config Type '+uniqueSuffix,
                node_type: 'string'
            },
            features: {
                code: uniqueKey+'-feature-test',
                title: 'Test Feature '+uniqueSuffix+' '+timestamp,
                is_enabled: 1
            },
            respawn: {
                object_id: baseIds.objects,
                respawn_time: 10000,
                instances_limit: 5,
                layer: 'test-respawn-layer'
            },
            rewards: {
                object_id: baseIds.objects,
                item_id: baseIds['items-item'],
                modifier_id: null,
                experience: 100,
                drop_rate: 100,
                drop_quantity: 1,
                is_unique: 0,
                was_given: 0,
                has_drop_body: 1
            },
            'rewards-modifiers': {
                reward_id: baseIds.rewards,
                key: uniqueKey+'-modifier'+(uniqueSuffix === 'delete' ? '-del' : ''),
                property_key: 'stats/atk',
                operation: 1,
                value: 10,
                minValue: null,
                maxValue: null
            },
            'rewards-events': {
                label: 'Test Reward Event '+uniqueSuffix,
                description: 'Test reward event description',
                handler_key: 'login',
                event_key: 'test.event',
                event_data: '{"test":true}',
                position: 0,
                enabled: 1,
                active_from: null,
                active_to: null
            },
            'rewards-events-state': {
                player_id: baseIds.players,
                rewards_events_id: uniqueSuffix === 'delete' ? 2 : 1,
                current_count: 1,
                last_execution: '2025-01-01 12:00:00'
            },
            snippets: {
                locale_id: baseIds.locale,
                key: uniqueKey+'-snippet-test',
                value: 'Test snippet content '+uniqueSuffix+' '+timestamp
            },
            locale: {
                locale: uniqueKey+'-locale-test',
                language_code: 'te',
                country_code: 'TS'
            },
            users: {
                email: uniqueKey+'-test@deterministic.com',
                username: uniqueKey+'-user-test',
                password: 'test123password',
                role_id: 1,
                status: '1',
                played_time: 0,
                login_count: 0
            },
            'users-locale': {
                locale_id: baseIds.locale,
                user_id: uniqueSuffix === 'delete' ? baseIds['users-locale-delete'] : (uniqueSuffix === 'main' ? baseIds['users-locale-main'] : baseIds.users)
            },
            'users-login': {
                user_id: baseIds.users,
                login_date: '2025-01-01 12:00:00'
            },
            players: {
                user_id: baseIds.users,
                name: uniqueKey+'-player',
                created_at: '2025-01-01 12:00:00'
            },
            'players-state': {
                player_id: baseIds.players,
                room_id: baseIds.rooms,
                x: 100,
                y: 100,
                dir: 'down'
            },
            'players-stats': {
                player_id: baseIds.players,
                stat_id: uniqueSuffix === 'delete' ? 2 : baseIds.stats,
                base_value: 100,
                value: 100
            },
            stats: {
                key: uniqueKey+'-stat',
                label: 'Test Stat '+uniqueSuffix,
                description: 'Test stat description',
                base_value: 100,
                customData: null
            },
            'items-group': {
                key: uniqueKey+'-group',
                label: 'Test Item Group '+uniqueSuffix,
                description: 'Test group description',
                files_name: null,
                sort: 1,
                items_limit: 0,
                limit_per_item: 0
            },
            'items-types': {
                label: 'Test Item Type '+uniqueSuffix,
                key: uniqueKey+'-item-type'
            },
            'items-item-modifiers': {
                item_id: baseIds['items-item'],
                key: uniqueKey+'-modifier'+(uniqueSuffix === 'delete' ? '-del' : ''),
                property_key: 'stats/atk',
                operation: 1,
                value: 10,
                maxProperty: null
            },
            'objects-animations': {
                object_id: baseIds.objects,
                animationKey: uniqueKey+'-animation'+(uniqueSuffix === 'delete' ? '-del' : ''),
                animationData: '{"start":0,"end":5}'
            },
            'objects-items-inventory': {
                owner_id: baseIds.objects,
                item_id: baseIds['items-item'],
                qty: 1,
                remaining_uses: -1,
                is_active: 0
            },
            'objects-items-requirements': {
                object_id: baseIds.objects,
                item_key: 'test-item-list',
                required_item_key: 'coins',
                required_quantity: 1,
                auto_remove_requirement: 1
            },
            'objects-items-rewards': {
                object_id: baseIds.objects,
                item_key: 'test-item-edit',
                reward_item_key: 'coins',
                reward_quantity: 1,
                reward_item_is_required: 0
            },
            'objects-skills': {
                object_id: baseIds.objects,
                skill_id: baseIds['skills-skill'],
                target_id: 1
            },
            'objects-stats': {
                object_id: baseIds.objects,
                stat_id: uniqueSuffix === 'delete' ? 2 : baseIds.stats,
                base_value: 100,
                value: 100
            },
            'objects-types': {
                key: uniqueKey+'-object-type',
                label: 'Test Object Type '+uniqueSuffix
            },
            'rooms-change-points': {
                room_id: baseIds.rooms,
                tile_index: 100,
                next_room_id: baseIds.rooms
            },
            'rooms-return-points': {
                room_id: baseIds.rooms,
                direction: 'down',
                x: 100,
                y: 100,
                is_default: 1,
                from_room_id: null
            },
            'skills-class-path': {
                key: uniqueKey+'-class-path',
                label: 'Test Class Path '+uniqueSuffix,
                levels_set_id: baseIds['skills-levels-set'],
                enabled: 1
            },
            'skills-class-path-level-labels': {
                class_path_id: baseIds['skills-class-path'],
                level_id: uniqueSuffix === 'delete' ? 2 : baseIds['skills-levels'],
                label: 'Test Level Label '+uniqueSuffix
            },
            'skills-class-path-level-skills': {
                class_path_id: baseIds['skills-class-path'],
                level_id: baseIds['skills-levels'],
                skill_id: uniqueSuffix === 'delete' ? 3 : baseIds['skills-skill']
            },
            'skills-levels': {
                key: uniqueSuffix === 'delete' ? 99 : 98,
                label: 'Level '+uniqueSuffix,
                required_experience: 100,
                level_set_id: uniqueSuffix === 'delete' ? 2 : baseIds['skills-levels-set']
            },
            'skills-levels-modifiers': {
                level_id: baseIds['skills-levels'],
                key: uniqueKey+'-modifier',
                property_key: 'stats/atk',
                operation: 1,
                value: 10,
                minValue: null,
                maxValue: null,
                minProperty: null,
                maxProperty: null
            },
            'skills-class-level-up-animations': {
                class_path_id: baseIds['skills-class-path'],
                level_id: uniqueSuffix === 'delete' ? 2 : baseIds['skills-levels'],
                animationData: '{"test":"animation"}'
            },
            'skills-levels-set': {
                autoFillRanges: 1,
                autoFillExperienceMultiplier: uniqueSuffix === 'delete' ? 1.5 : null
            },
            'skills-owners-class-path': {
                class_path_id: baseIds['skills-class-path'],
                owner_id: baseIds.players,
                currentLevel: uniqueSuffix === 'delete' ? 2 : 1,
                currentExp: 0
            },
            'skills-skill-attack': {
                skill_id: baseIds['skills-skill'],
                affectedProperty: 'stats/hp',
                allowEffectBelowZero: 0,
                hitDamage: 10,
                applyDirectDamage: 0,
                attackProperties: 'stats/atk',
                defenseProperties: 'stats/def',
                aimProperties: 'stats/aim',
                dodgeProperties: 'stats/dodge',
                dodgeFullEnabled: 0,
                dodgeOverAimSuccess: 1,
                damageAffected: 0,
                criticalAffected: 0
            },
            'skills-skill-group-relation': {
                skill_id: baseIds['skills-skill'],
                skill_group_id: baseIds['skills-groups'],
                group_id: baseIds['skills-groups']
            },
            'skills-groups': {
                key: uniqueKey+'-skill-group',
                label: 'Test Skill Group '+uniqueSuffix,
                description: 'Test skill group description',
                sort: 1
            },
            'skills-skill-owner-conditions': {
                skill_id: baseIds['skills-skill'],
                key: uniqueKey+'-condition',
                property_key: uniqueSuffix === 'delete' ? 'stats/hp' : 'stats/mp',
                conditional: 'ge',
                value: '5'
            },
            'skills-skill-owner-effects': {
                skill_id: baseIds['skills-skill'],
                key: uniqueKey+'-effect'+(uniqueSuffix === 'delete' ? '-del' : ''),
                property_key: 'stats/mp',
                operation: 2,
                value: '5',
                minValue: '0',
                maxValue: '100',
                minProperty: null,
                maxProperty: null
            },
            'skills-skill-physical-data': {
                skill_id: baseIds['skills-skill'],
                magnitude: 100,
                objectWidth: 5,
                objectHeight: 5,
                validateTargetOnHit: 0
            },
            'skills-skill-target-effects': {
                skill_id: baseIds['skills-skill'],
                key: uniqueKey+'-target-effect'+(uniqueSuffix === 'delete' ? '-del' : ''),
                property_key: 'stats/hp',
                operation: 1,
                value: '10',
                minValue: '0',
                maxValue: '0',
                minProperty: null,
                maxProperty: 'statsBase/hp'
            },
            'skills-skill-type': {
                label: 'Test Skill Type '+uniqueSuffix,
                key: uniqueKey+'-skill-type'
            },
            'operation-types': {
                label: 'Test Operation Type '+uniqueSuffix,
                key: uniqueSuffix === 'delete' ? 99 : (uniqueSuffix === 'edit' ? 98 : 97)
            },
            'target-options': {
                target_key: uniqueKey+'-target-option',
                target_label: 'Test Target Option '+uniqueSuffix
            },
            'drops-animations': {
                item_id: baseIds['items-item'],
                asset_type: 'spritesheet',
                asset_key: uniqueKey+'-drop-animation',
                file: 'test-drop.png',
                extra_params: '{"frameWidth":32,"frameHeight":32}'
            },
            scores: {
                player_id: baseIds.players,
                total_score: 100,
                players_kills_count: 0,
                npcs_kills_count: 0,
                last_player_kill_time: '2025-01-01 12:00:00',
                last_npc_kill_time: '2025-01-01 12:00:00',
                created_at: '2025-01-01 12:00:00'
            },
            'scores-detail': {
                scores_id: baseIds.scores,
                player_id: baseIds.players,
                obtained_score: 150,
                kill_player_id: baseIds.players,
                kill_npc_id: baseIds.objects,
                detail_key: uniqueKey+'-detail',
                detail_value: 'Test detail value'
            },
            clan: {
                name: 'Test Clan '+uniqueSuffix,
                owner_id: uniqueSuffix === 'delete' ? 1002 : baseIds.players,
                level: baseIds['clan-levels'],
                points: 0,
                created_at: '2025-01-01 12:00:00'
            },
            'clan-levels': {
                key: uniqueSuffix === 'delete' ? 99 : (uniqueSuffix === 'edit' ? 98 : 97),
                label: 'Test Clan Level '+uniqueSuffix,
                required_experience: 100
            },
            'clan-levels-modifiers': {
                level_id: uniqueSuffix === 'delete' ? 2 : baseIds['clan-levels'],
                clan_level_id: uniqueSuffix === 'delete' ? 2 : baseIds['clan-levels'],
                key: uniqueKey+'-clan-modifier',
                property_key: 'stats/atk',
                operation: 1,
                value: 10,
                minValue: null,
                maxValue: null
            },
            'clan-members': {
                clan_id: baseIds.clan,
                player_id: uniqueSuffix === 'delete' ? 1002 : baseIds.players,
                role_id: 1,
                joined_at: '2025-01-01 12:00:00'
            },
            'skills-skill-animations': {
                key: uniqueKey+'-animation',
                skill_id: baseIds['skills-skill'],
                classKey: 'test-class',
                animationData: '{"test":"animation"}',
                files_name: 'test-animation-'+uniqueSuffix+'.json'
            }
        };
        return testData[entity] || {
            name: uniqueKey+'-'+entity+'-test'
        };
    }

    static getUploadFieldsForEntity(entity)
    {
        let uploadFields = {
            rooms: ['map_filename', 'scene_images'],
            audio: ['files_name'],
            'drops-animations': ['file']
        };
        return uploadFields[entity] || [];
    }

    static getFileExtension(entity, field)
    {
        let extensions = {
            rooms: {map_filename: 'json', scene_images: 'png'},
            audio: {files_name: 'mp3'},
            'skills-skill-animations': {files_name: 'json'}
        };
        return extensions[entity] && extensions[entity][field] || 'txt';
    }

    static getMockFileContent(entity, field)
    {
        let mockContent = {
            rooms: {
                map_filename: '{"width":20,"height":20,"tilewidth":32,"tileheight":32,"type":"map","version":"1.0"}',
                scene_images: 'PNG_MOCK_DATA_DETERMINISTIC'
            },
            audio: {files_name: 'MOCK_AUDIO_DATA_DETERMINISTIC'},
            'skills-skill-animations': {files_name: 'JSON_MOCK_ANIMATION_DETERMINISTIC'}
        };
        return mockContent[entity] && mockContent[entity][field] || 'MOCK_FILE_CONTENT_DETERMINISTIC';
    }

    static getContentType(entity, field)
    {
        let contentTypes = {
            rooms: {map_filename: 'application/json', scene_images: 'image/png'},
            audio: {files_name: 'audio/mpeg'},
            'skills-skill-animations': {files_name: 'application/json'}
        };
        return contentTypes[entity] && contentTypes[entity][field] || 'text/plain';
    }

    static getInvalidTestData(entity)
    {
        let invalidData = {
            rooms: {name: '', title: ''},
            objects: {room_id: 1001, object_class_key: '', client_key: ''},
            'skills-skill': {key: '', type: 1},
            'items-item': {key: '', type: 1, group_id: 1},
            item: {key: '', type: 1, group_id: 1},
            ads: {key: '', provider_id: 1, type_id: 1},
            audio: {audio_key: '', room_id: 1001, category_id: 1},
            chat: {player_id: 1001, room_id: 1001},
            config: {scope: '', path: '', type: 1},
            features: {code: '', title: ''},
            respawn: {object_id: 1001, respawn_time: ''},
            rewards: {object_id: 1001, item_id: 1001, drop_rate: ''},
            snippets: {locale_id: 1, key: '', value: ''},
            locale: {locale: '', language_code: ''},
            users: {email: '', username: '', role_id: 1},
            'ads-banner': {ads_id: '', banner_data: ''},
            'ads-event-video': {ads_id: '', event_key: ''},
            'ads-providers': {key: ''},
            'ads-types': {key: ''},
            'config-types': {label: ''},
            'audio-categories': {category_key: '', category_label: ''},
            'chat-message-types': {key: ''},
            'items-group': {key: '', label: ''},
            'items-types': {label: ''},
            'skills-groups': {key: ''},
            'operation-types': {key: 'invalid-string', label: 'Test Label'},
            'target-options': {target_label: 'Test Label'},
            'clan-levels': {key: '', label: ''},
            scores: {player_id: '', total_score: ''},
            stats: {key: '', label: ''},
            players: {user_id: '', name: ''},
            'skills-class-path': {key: '', levels_set_id: ''},
            'skills-levels': {key: '', level_set_id: ''},
            clan: {name: '', owner_id: ''},
            'skills-skill-animations': {key: ''}
        };
        return invalidData[entity] || null;
    }

    static getExpectedValidationErrors(entity)
    {
        let errors = {
            rooms: 'error',
            objects: 'error',
            'skills-skill': 'error',
            'items-item': 'error',
            ads: 'error',
            audio: 'error',
            chat: 'error',
            config: 'error',
            features: 'error',
            respawn: 'error',
            rewards: 'error',
            snippets: 'error',
            locale: 'error',
            users: 'error'
        };
        return errors[entity] || 'error';
    }

    static getTestPrefix()
    {
        return 'test-crud-deterministic';
    }

}

module.exports.CrudTestData = CrudTestData;
