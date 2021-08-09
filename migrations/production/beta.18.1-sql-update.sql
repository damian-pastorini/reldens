#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config missing:

INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/responsiveX', '34', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/responsiveY', '2.4', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/x', '180', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/y', '10', 'i');

# Audio markers fix:

TRUNCATE audio_markers;

SET @reldens_town_audio_id = (SELECT id FROM audio WHERE `audio_key` = 'ReldensTownAudio');
SET @footstep_audio_id = (SELECT id FROM audio WHERE `audio_key` = 'footstep');

INSERT INTO `audio_markers` (`id`, `audio_id`, `marker_key`, `start`, `duration`, `config`) VALUES
    (NULL, @reldens_town_audio_id, 'ReldensTown', 0, 41, NULL),
    (NULL, @footstep_audio_id,'journeyman_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'journeyman_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'journeyman_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'journeyman_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_journeyman_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_journeyman_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_journeyman_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_journeyman_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'sorcerer_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'sorcerer_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'sorcerer_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'sorcerer_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_sorcerer_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_sorcerer_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_sorcerer_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_sorcerer_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warlock_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warlock_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warlock_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warlock_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warlock_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warlock_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warlock_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warlock_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'swordsman_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'swordsman_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'swordsman_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'swordsman_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_swordsman_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_swordsman_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_swordsman_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_swordsman_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warrior_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warrior_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warrior_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'warrior_down', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warrior_right', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warrior_left', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warrior_up', 0, 1, NULL),
    (NULL, @footstep_audio_id,'r_warrior_down', 0, 1, NULL);

## -------------------------------------------------------------------------------------------------------------------
