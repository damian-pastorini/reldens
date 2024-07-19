--

SET FOREIGN_KEY_CHECKS = 0;

--

-- Config:
UPDATE `config` SET `value` = '/css/reldens-admin-client.css' WHERE `scope` = 'server' AND `path` = 'admin/stylesPath';

--

SET FOREIGN_KEY_CHECKS = 1;

--
