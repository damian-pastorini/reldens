/**
 *
 * Reldens - Installer
 *
 */

const fs = require('fs');
const path = require('path');
const { sc } = require('@reldens/utils');
const express = require("express");

class Installer
{

    constructor(props)
    {
        this.projectRoot = sc.get(props, 'projectRoot', '');
        this.installationLockPath = '' !== this.projectRoot ? path.join(this.projectRoot, 'install.lock') : '';
        this.installPath = this.projectRoot
            ? path.join(this.projectRoot, 'install')
            : '';
    }


    isInstalled()
    {
        if ('' === this.installationLockPath){
            return false;
        }
        return fs.existsSync(this.installationLockPath);
    }

    prepareSetup(app)
    {
        app.use(express.static(this.installPath));
        app.use((req, res, next) => {
            if(this.isInstalled()){
                return next();
            }
            if('' === req.originalUrl || '/' === req.originalUrl){
                return res.sendFile(path.join(this.installPath, 'index.html'));
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
