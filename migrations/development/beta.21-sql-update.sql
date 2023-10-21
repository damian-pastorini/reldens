#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:

INSERT INTO `config` VALUES(NULL, 'client', 'players/tapMovement/enabled', '1', 'b');

# Chat:

INSERT INTO `config` VALUES(NULL, 'client', 'chat/messages/characterLimit', '100', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'chat/messages/characterLimitOverhead', '50', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadChat/enabled', '1', 'b');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadChat/isTyping', '1', 'b');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadChat/closeChatBoxAfterSend', '1', 'b');

INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/fontFamily', 'Verdana, Geneva, sans-serif', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/fontSize', '12px', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/fill', '#ffffff', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/align', 'center', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/stroke', 'rgba(0,0,0,0.7)', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/strokeThickness', '4', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/shadowX', '5', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/shadowY', '5', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/shadowColor', 'rgba(0,0,0,0.7)', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/shadowBlur', '5', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/depth', '200000', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/height', '15', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/textLength', '4', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/topOffset', '20', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/chat/overheadText/timeOut', '5000', 'i');

# Player name:

INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/fontFamily', 'Verdana, Geneva, sans-serif', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/fontSize', '12px', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/fill', '#ffffff', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/align', 'center', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/stroke', '#000000', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/strokeThickness', '4', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/shadowX', '5', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/shadowY', '5', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/shadowColor', 'rgba(0,0,0,0.7)', 't');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/shadowBlur', '5', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/depth', '200000', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/height', '15', 'i');
INSERT INTO `config` VALUES(NULL, 'client', 'ui/players/nameText/textLength', '4', 'i');

DELETE FROM `config` WHERE path IN (
    'ui/players/nameStrokeThickness',
    'ui/players/nameStroke',
    'ui/players/nameShadowColor',
    'ui/players/nameHeight',
    'ui/players/nameFontSize',
    'ui/players/nameFontFamily',
    'ui/players/nameFill'
);

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################
