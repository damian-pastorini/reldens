--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Config:
INSERT INTO `config` (`scope`, `path`, `value`, `type`)
VALUES
    ('client', 'gameEngine/banner', '0', 3),
    ('client', 'gameEngine/dom/createContainer', '1', 3),
    ('client', 'gameEngine/height', '1280', 2),
    ('client', 'gameEngine/parent', 'reldens', 1),
    ('client', 'gameEngine/physics/arcade/debug', 'false', 3),
    ('client', 'gameEngine/physics/arcade/gravity/x', '0', 2),
    ('client', 'gameEngine/physics/arcade/gravity/y', '0', 2),
    ('client', 'gameEngine/physics/default', 'arcade', 1),
    ('client', 'gameEngine/scale/autoCenter', '1', 2),
    ('client', 'gameEngine/scale/max/height', '1280', 2),
    ('client', 'gameEngine/scale/max/width', '1280', 2),
    ('client', 'gameEngine/scale/min/height', '360', 2),
    ('client', 'gameEngine/scale/min/width', '360', 2),
    ('client', 'gameEngine/scale/mode', '5', 2),
    ('client', 'gameEngine/scale/parent', 'reldens', 1),
    ('client', 'gameEngine/scale/zoom', '1', 2),
    ('client', 'gameEngine/type', '0', 2),
    ('client', 'gameEngine/width', '1280', 2),
    ('client', 'general/gameEngine/updateGameSizeTimeOut', '500', 2),
    ('client', 'ui/maximum/x', '1280', 2),
    ('client', 'ui/maximum/y', '1280', 2),
    ('client', 'ui/screen/responsive', '1', 3)
AS new_config
ON DUPLICATE KEY UPDATE `value` = new_config.`value`, `type` = new_config.`type`;

--

SET FOREIGN_KEY_CHECKS = 1;

--
