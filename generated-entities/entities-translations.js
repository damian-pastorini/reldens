/**
 *
 * Reldens - Entities Translations
 *
 */

module.exports.entitiesTranslations = {
    labels: {
        'ads_banner': 'Ads Banner',
        'ads': 'Ads',
        'ads_event_video': 'Ads Event Video',
        'ads_played': 'Ads Played',
        'ads_providers': 'Ads Providers',
        'ads_types': 'Ads Types',
        'audio_categories': 'Audio Categories',
        'audio': 'Audio',
        'audio_markers': 'Audio Markers',
        'audio_player_config': 'Audio Player Config',
        'chat': 'Chat',
        'chat_message_types': 'Chat Message Types',
        'clan': 'Clan',
        'clan_levels': 'Clan Levels',
        'clan_levels_modifiers': 'Clan Levels Modifiers',
        'clan_members': 'Clan Members',
        'config': 'Config',
        'config_types': 'Config Types',
        'drops_animations': 'Drops Animations',
        'features': 'Features',
        'items_group': 'Items Group',
        'items_inventory': 'Items Inventory',
        'items_item': 'Items Item',
        'items_item_modifiers': 'Items Item Modifiers',
        'items_types': 'Items Types',
        'locale': 'Locale',
        'objects_animations': 'Objects Animations',
        'objects_assets': 'Objects Assets',
        'objects': 'Objects',
        'objects_items_inventory': 'Objects Items Inventory',
        'objects_items_requirements': 'Objects Items Requirements',
        'objects_items_rewards': 'Objects Items Rewards',
        'objects_skills': 'Objects Skills',
        'objects_stats': 'Objects Stats',
        'objects_types': 'Objects Types',
        'operation_types': 'Operation Types',
        'players': 'Players',
        'players_state': 'Players State',
        'players_stats': 'Players Stats',
        'respawn': 'Respawn',
        'rewards': 'Rewards',
        'rewards_events': 'Rewards Events',
        'rewards_events_state': 'Rewards Events State',
        'rewards_modifiers': 'Rewards Modifiers',
        'rooms_change_points': 'Rooms Change Points',
        'rooms': 'Rooms',
        'rooms_return_points': 'Rooms Return Points',
        'scores_detail': 'Scores Detail',
        'scores': 'Scores',
        'skills_class_level_up_animations': 'Skills Class Level Up Animations',
        'skills_class_path': 'Skills Class Path',
        'skills_class_path_level_labels': 'Skills Class Path Level Labels',
        'skills_class_path_level_skills': 'Skills Class Path Level Skills',
        'skills_groups': 'Skills Groups',
        'skills_levels': 'Skills Levels',
        'skills_levels_modifiers_conditions': 'Skills Levels Modifiers Conditions',
        'skills_levels_modifiers': 'Skills Levels Modifiers',
        'skills_levels_set': 'Skills Levels Set',
        'skills_owners_class_path': 'Skills Owners Class Path',
        'skills_skill_animations': 'Skills Skill Animations',
        'skills_skill_attack': 'Skills Skill Attack',
        'skills_skill': 'Skills Skill',
        'skills_skill_group_relation': 'Skills Skill Group Relation',
        'skills_skill_owner_conditions': 'Skills Skill Owner Conditions',
        'skills_skill_owner_effects_conditions': 'Skills Skill Owner Effects Conditions',
        'skills_skill_owner_effects': 'Skills Skill Owner Effects',
        'skills_skill_physical_data': 'Skills Skill Physical Data',
        'skills_skill_target_effects_conditions': 'Skills Skill Target Effects Conditions',
        'skills_skill_target_effects': 'Skills Skill Target Effects',
        'skills_skill_type': 'Skills Skill Type',
        'snippets': 'Snippets',
        'stats': 'Stats',
        'target_options': 'Target Options',
        'users': 'Users',
        'users_locale': 'Users Locale',
        'users_login': 'Users Login'
    },
    fields: {
        'ads_banner': {
            'id': 'ID',
            'ads_id': 'Ads ID',
            'banner_data': 'Banner Data'
        },
        'ads': {
            'id': 'ID',
            'key': 'Key',
            'provider_id': 'Provider ID',
            'type_id': 'Type ID',
            'width': 'Width',
            'height': 'Height',
            'position': 'Position',
            'top': 'Top',
            'bottom': 'Bottom',
            'left': 'Left',
            'right': 'Right',
            'replay': 'Replay',
            'enabled': 'Enabled',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'ads_event_video': {
            'id': 'ID',
            'ads_id': 'Ads ID',
            'event_key': 'Event Key',
            'event_data': 'Event Data'
        },
        'ads_played': {
            'id': 'ID',
            'ads_id': 'Ads ID',
            'player_id': 'Player ID',
            'started_at': 'Started At',
            'ended_at': 'Ended At'
        },
        'ads_providers': {
            'id': 'ID',
            'key': 'Key',
            'enabled': 'Enabled'
        },
        'ads_types': {
            'id': 'ID',
            'key': 'Key'
        },
        'audio_categories': {
            'id': 'ID',
            'category_key': 'Category Key',
            'category_label': 'Category Label',
            'enabled': 'Enabled',
            'single_audio': 'Single Audio',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'audio': {
            'id': 'ID',
            'audio_key': 'Audio Key',
            'files_name': 'Files Name',
            'config': 'Config',
            'room_id': 'Room ID',
            'category_id': 'Category ID',
            'enabled': 'Enabled',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'audio_markers': {
            'id': 'ID',
            'audio_id': 'Audio ID',
            'marker_key': 'Marker Key',
            'start': 'Start',
            'duration': 'Duration',
            'config': 'Config'
        },
        'audio_player_config': {
            'id': 'ID',
            'player_id': 'Player ID',
            'category_id': 'Category ID',
            'enabled': 'Enabled'
        },
        'chat': {
            'id': 'ID',
            'player_id': 'Player ID',
            'room_id': 'Room ID',
            'message': 'Message',
            'private_player_id': 'Private Player ID',
            'message_type': 'Message Type',
            'message_time': 'Message Time'
        },
        'chat_message_types': {
            'id': 'ID',
            'key': 'Key',
            'show_tab': 'Show Tab',
            'also_show_in_type': 'Also Show In Type'
        },
        'clan': {
            'id': 'ID',
            'owner_id': 'Owner ID',
            'name': 'Name',
            'points': 'Points',
            'level': 'Level',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'clan_levels': {
            'id': 'ID',
            'key': 'Key',
            'label': 'Label',
            'required_experience': 'Required Experience'
        },
        'clan_levels_modifiers': {
            'id': 'ID',
            'level_id': 'Level ID',
            'key': 'Key',
            'property_key': 'Property Key',
            'operation': 'Operation',
            'value': 'Value',
            'minValue': 'MinValue',
            'maxValue': 'MaxValue',
            'minProperty': 'MinProperty',
            'maxProperty': 'MaxProperty'
        },
        'clan_members': {
            'id': 'ID',
            'clan_id': 'Clan ID',
            'player_id': 'Player ID'
        },
        'config': {
            'id': 'ID',
            'scope': 'Scope',
            'path': 'Path',
            'value': 'Value',
            'type': 'Type'
        },
        'config_types': {
            'id': 'ID',
            'label': 'Label'
        },
        'drops_animations': {
            'id': 'ID',
            'item_id': 'Item ID',
            'asset_type': 'Asset Type',
            'asset_key': 'Asset Key',
            'file': 'File',
            'extra_params': 'Extra Params'
        },
        'features': {
            'id': 'ID',
            'code': 'Code',
            'title': 'Title',
            'is_enabled': 'Is Enabled'
        },
        'items_group': {
            'id': 'ID',
            'key': 'Key',
            'label': 'Label',
            'description': 'Description',
            'files_name': 'Files Name',
            'sort': 'Sort',
            'items_limit': 'Items Limit',
            'limit_per_item': 'Limit Per Item'
        },
        'items_inventory': {
            'id': 'ID',
            'owner_id': 'Owner ID',
            'item_id': 'Item ID',
            'qty': 'Qty',
            'remaining_uses': 'Remaining Uses',
            'is_active': 'Is Active'
        },
        'items_item': {
            'id': 'ID',
            'key': 'Key',
            'type': 'Type',
            'group_id': 'Group ID',
            'label': 'Label',
            'description': 'Description',
            'qty_limit': 'Qty Limit',
            'uses_limit': 'Uses Limit',
            'useTimeOut': 'UseTimeOut',
            'execTimeOut': 'ExecTimeOut',
            'customData': 'CustomData',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'items_item_modifiers': {
            'id': 'ID',
            'item_id': 'Item ID',
            'key': 'Key',
            'property_key': 'Property Key',
            'operation': 'Operation',
            'value': 'Value',
            'maxProperty': 'MaxProperty'
        },
        'items_types': {
            'id': 'ID',
            'key': 'Key'
        },
        'locale': {
            'id': 'ID',
            'locale': 'Locale',
            'language_code': 'Language Code',
            'country_code': 'Country Code',
            'enabled': 'Enabled'
        },
        'objects_animations': {
            'id': 'ID',
            'object_id': 'Object ID',
            'animationKey': 'AnimationKey',
            'animationData': 'AnimationData'
        },
        'objects_assets': {
            'object_asset_id': 'Object Asset ID',
            'object_id': 'Object ID',
            'asset_type': 'Asset Type',
            'asset_key': 'Asset Key',
            'asset_file': 'Asset File',
            'extra_params': 'Extra Params'
        },
        'objects': {
            'id': 'ID',
            'room_id': 'Room ID',
            'layer_name': 'Layer Name',
            'tile_index': 'Tile Index',
            'class_type': 'Class Type',
            'object_class_key': 'Object Class Key',
            'client_key': 'Client Key',
            'title': 'Title',
            'private_params': 'Private Params',
            'client_params': 'Client Params',
            'enabled': 'Enabled',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'objects_items_inventory': {
            'id': 'ID',
            'owner_id': 'Owner ID',
            'item_id': 'Item ID',
            'qty': 'Qty',
            'remaining_uses': 'Remaining Uses',
            'is_active': 'Is Active'
        },
        'objects_items_requirements': {
            'id': 'ID',
            'object_id': 'Object ID',
            'item_key': 'Item Key',
            'required_item_key': 'Required Item Key',
            'required_quantity': 'Required Quantity',
            'auto_remove_requirement': 'Auto Remove Requirement'
        },
        'objects_items_rewards': {
            'id': 'ID',
            'object_id': 'Object ID',
            'item_key': 'Item Key',
            'reward_item_key': 'Reward Item Key',
            'reward_quantity': 'Reward Quantity',
            'reward_item_is_required': 'Reward Item Is Required'
        },
        'objects_skills': {
            'id': 'ID',
            'object_id': 'Object ID',
            'skill_id': 'Skill ID',
            'target_id': 'Target ID'
        },
        'objects_stats': {
            'id': 'ID',
            'object_id': 'Object ID',
            'stat_id': 'Stat ID',
            'base_value': 'Base Value',
            'value': 'Value'
        },
        'objects_types': {
            'id': 'ID',
            'key': 'Key'
        },
        'operation_types': {
            'id': 'ID',
            'label': 'Label',
            'key': 'Key'
        },
        'players': {
            'id': 'ID',
            'user_id': 'User ID',
            'name': 'Name',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'players_state': {
            'id': 'ID',
            'player_id': 'Player ID',
            'room_id': 'Room ID',
            'x': 'X',
            'y': 'Y',
            'dir': 'Dir'
        },
        'players_stats': {
            'id': 'ID',
            'player_id': 'Player ID',
            'stat_id': 'Stat ID',
            'base_value': 'Base Value',
            'value': 'Value'
        },
        'respawn': {
            'id': 'ID',
            'object_id': 'Object ID',
            'respawn_time': 'Respawn Time',
            'instances_limit': 'Instances Limit',
            'layer': 'Layer',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'rewards': {
            'id': 'ID',
            'object_id': 'Object ID',
            'item_id': 'Item ID',
            'modifier_id': 'Modifier ID',
            'experience': 'Experience',
            'drop_rate': 'Drop Rate',
            'drop_quantity': 'Drop Quantity',
            'is_unique': 'Is Unique',
            'was_given': 'Was Given',
            'has_drop_body': 'Has Drop Body',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'rewards_events': {
            'id': 'ID',
            'label': 'Label',
            'description': 'Description',
            'handler_key': 'Handler Key',
            'event_key': 'Event Key',
            'event_data': 'Event Data',
            'position': 'Position',
            'enabled': 'Enabled',
            'active_from': 'Active From',
            'active_to': 'Active To'
        },
        'rewards_events_state': {
            'id': 'ID',
            'rewards_events_id': 'Rewards Events ID',
            'player_id': 'Player ID',
            'state': 'State'
        },
        'rewards_modifiers': {
            'id': 'ID',
            'key': 'Key',
            'property_key': 'Property Key',
            'operation': 'Operation',
            'value': 'Value',
            'minValue': 'MinValue',
            'maxValue': 'MaxValue',
            'minProperty': 'MinProperty',
            'maxProperty': 'MaxProperty'
        },
        'rooms_change_points': {
            'id': 'ID',
            'room_id': 'Room ID',
            'tile_index': 'Tile Index',
            'next_room_id': 'Next Room ID'
        },
        'rooms': {
            'id': 'ID',
            'name': 'Name',
            'title': 'Title',
            'map_filename': 'Map Filename',
            'scene_images': 'Scene Images',
            'room_class_key': 'Room Class Key',
            'server_url': 'Server Url',
            'customData': 'CustomData',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'rooms_return_points': {
            'id': 'ID',
            'room_id': 'Room ID',
            'direction': 'Direction',
            'x': 'X',
            'y': 'Y',
            'is_default': 'Is Default',
            'from_room_id': 'From Room ID'
        },
        'scores_detail': {
            'id': 'ID',
            'player_id': 'Player ID',
            'obtained_score': 'Obtained Score',
            'kill_time': 'Kill Time',
            'kill_player_id': 'Kill Player ID',
            'kill_npc_id': 'Kill Npc ID'
        },
        'scores': {
            'id': 'ID',
            'player_id': 'Player ID',
            'total_score': 'Total Score',
            'players_kills_count': 'Players Kills Count',
            'npcs_kills_count': 'Npcs Kills Count',
            'last_player_kill_time': 'Last Player Kill Time',
            'last_npc_kill_time': 'Last Npc Kill Time',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'skills_class_level_up_animations': {
            'id': 'ID',
            'class_path_id': 'Class Path ID',
            'level_id': 'Level ID',
            'animationData': 'AnimationData'
        },
        'skills_class_path': {
            'id': 'ID',
            'key': 'Key',
            'label': 'Label',
            'levels_set_id': 'Levels Set ID',
            'enabled': 'Enabled',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'skills_class_path_level_labels': {
            'id': 'ID',
            'class_path_id': 'Class Path ID',
            'level_id': 'Level ID',
            'label': 'Label'
        },
        'skills_class_path_level_skills': {
            'id': 'ID',
            'class_path_id': 'Class Path ID',
            'level_id': 'Level ID',
            'skill_id': 'Skill ID'
        },
        'skills_groups': {
            'id': 'ID',
            'key': 'Key',
            'label': 'Label',
            'description': 'Description',
            'sort': 'Sort'
        },
        'skills_levels': {
            'id': 'ID',
            'key': 'Key',
            'label': 'Label',
            'required_experience': 'Required Experience',
            'level_set_id': 'Level Set ID'
        },
        'skills_levels_modifiers_conditions': {
            'id': 'ID',
            'levels_modifier_id': 'Levels Modifier ID',
            'key': 'Key',
            'property_key': 'Property Key',
            'conditional': 'Conditional',
            'value': 'Value'
        },
        'skills_levels_modifiers': {
            'id': 'ID',
            'level_id': 'Level ID',
            'key': 'Key',
            'property_key': 'Property Key',
            'operation': 'Operation',
            'value': 'Value',
            'minValue': 'MinValue',
            'maxValue': 'MaxValue',
            'minProperty': 'MinProperty',
            'maxProperty': 'MaxProperty'
        },
        'skills_levels_set': {
            'id': 'ID',
            'key': 'Key',
            'label': 'Label',
            'autoFillRanges': 'AutoFillRanges',
            'autoFillExperienceMultiplier': 'AutoFillExperienceMultiplier',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'skills_owners_class_path': {
            'id': 'ID',
            'class_path_id': 'Class Path ID',
            'owner_id': 'Owner ID',
            'currentLevel': 'CurrentLevel',
            'currentExp': 'CurrentExp'
        },
        'skills_skill_animations': {
            'id': 'ID',
            'skill_id': 'Skill ID',
            'key': 'Key',
            'classKey': 'ClassKey',
            'animationData': 'AnimationData'
        },
        'skills_skill_attack': {
            'id': 'ID',
            'skill_id': 'Skill ID',
            'affectedProperty': 'AffectedProperty',
            'allowEffectBelowZero': 'AllowEffectBelowZero',
            'hitDamage': 'HitDamage',
            'applyDirectDamage': 'ApplyDirectDamage',
            'attackProperties': 'AttackProperties',
            'defenseProperties': 'DefenseProperties',
            'aimProperties': 'AimProperties',
            'dodgeProperties': 'DodgeProperties',
            'dodgeFullEnabled': 'DodgeFullEnabled',
            'dodgeOverAimSuccess': 'DodgeOverAimSuccess',
            'damageAffected': 'DamageAffected',
            'criticalAffected': 'CriticalAffected'
        },
        'skills_skill': {
            'id': 'ID',
            'key': 'Key',
            'type': 'Type',
            'label': 'Label',
            'autoValidation': 'AutoValidation',
            'skillDelay': 'SkillDelay',
            'castTime': 'CastTime',
            'usesLimit': 'UsesLimit',
            'range': 'Range',
            'rangeAutomaticValidation': 'RangeAutomaticValidation',
            'rangePropertyX': 'RangePropertyX',
            'rangePropertyY': 'RangePropertyY',
            'rangeTargetPropertyX': 'RangeTargetPropertyX',
            'rangeTargetPropertyY': 'RangeTargetPropertyY',
            'allowSelfTarget': 'AllowSelfTarget',
            'criticalChance': 'CriticalChance',
            'criticalMultiplier': 'CriticalMultiplier',
            'criticalFixedValue': 'CriticalFixedValue',
            'customData': 'CustomData',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'skills_skill_group_relation': {
            'id': 'ID',
            'skill_id': 'Skill ID',
            'group_id': 'Group ID'
        },
        'skills_skill_owner_conditions': {
            'id': 'ID',
            'skill_id': 'Skill ID',
            'key': 'Key',
            'property_key': 'Property Key',
            'conditional': 'Conditional',
            'value': 'Value'
        },
        'skills_skill_owner_effects_conditions': {
            'id': 'ID',
            'skill_owner_effect_id': 'Skill Owner Effect ID',
            'key': 'Key',
            'property_key': 'Property Key',
            'conditional': 'Conditional',
            'value': 'Value'
        },
        'skills_skill_owner_effects': {
            'id': 'ID',
            'skill_id': 'Skill ID',
            'key': 'Key',
            'property_key': 'Property Key',
            'operation': 'Operation',
            'value': 'Value',
            'minValue': 'MinValue',
            'maxValue': 'MaxValue',
            'minProperty': 'MinProperty',
            'maxProperty': 'MaxProperty'
        },
        'skills_skill_physical_data': {
            'id': 'ID',
            'skill_id': 'Skill ID',
            'magnitude': 'Magnitude',
            'objectWidth': 'ObjectWidth',
            'objectHeight': 'ObjectHeight',
            'validateTargetOnHit': 'ValidateTargetOnHit'
        },
        'skills_skill_target_effects_conditions': {
            'id': 'ID',
            'skill_target_effect_id': 'Skill Target Effect ID',
            'key': 'Key',
            'property_key': 'Property Key',
            'conditional': 'Conditional',
            'value': 'Value'
        },
        'skills_skill_target_effects': {
            'id': 'ID',
            'skill_id': 'Skill ID',
            'key': 'Key',
            'property_key': 'Property Key',
            'operation': 'Operation',
            'value': 'Value',
            'minValue': 'MinValue',
            'maxValue': 'MaxValue',
            'minProperty': 'MinProperty',
            'maxProperty': 'MaxProperty'
        },
        'skills_skill_type': {
            'id': 'ID',
            'key': 'Key'
        },
        'snippets': {
            'id': 'ID',
            'locale_id': 'Locale ID',
            'key': 'Key',
            'value': 'Value',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'stats': {
            'id': 'ID',
            'key': 'Key',
            'label': 'Label',
            'description': 'Description',
            'base_value': 'Base Value',
            'customData': 'CustomData',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        },
        'target_options': {
            'id': 'ID',
            'target_key': 'Target Key',
            'target_label': 'Target Label'
        },
        'users': {
            'id': 'ID',
            'email': 'Email',
            'username': 'Username',
            'password': 'Password',
            'role_id': 'Role ID',
            'status': 'Status',
            'created_at': 'Created At',
            'updated_at': 'Updated At',
            'played_time': 'Played Time',
            'login_count': 'Login Count'
        },
        'users_locale': {
            'id': 'ID',
            'locale_id': 'Locale ID',
            'user_id': 'User ID'
        },
        'users_login': {
            'id': 'ID',
            'user_id': 'User ID',
            'login_date': 'Login Date',
            'logout_date': 'Logout Date'
        }
    }
};
