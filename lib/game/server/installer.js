/**
 *
 * Reldens - Installer
 *
 */

const fs = require('fs');
const { sc } = require('@reldens/utils');
const express = require("express");

class Installer
{

    constructor(props)
    {
        this.themeManager = sc.get(props, 'themeManager');
    }


    isInstalled()
    {
        if ('' === sc.get(this.themeManager, 'installationLockPath', '')){
            return false;
        }
        return fs.existsSync(this.themeManager.installationLockPath);
    }

    async prepareSetup(app)
    {
        if(!fs.existsSync(this.themeManager.installerPathIndex)){
            await this.themeManager.buildInstaller();
        }
        app.use(express.static(this.themeManager.installerPath));
        app.use((req, res, next) => {
            if(this.isInstalled()){
                return next();
            }
            if('' === req.originalUrl || '/' === req.originalUrl){
                return res.sendFile(this.themeManager.installerPathIndex);
            }
            next();
        });
        app.post('/install', (req, res) => {
            // on error or success redirect back res.redirect('/');
            res.send('Step 2?');
        });
    }

}

module.exports.Installer = Installer;
