/**
 *
 * Reldens - AppServer
 *
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const path = require('path');

class AppServer
{

    createAppServer(projectRoot)
    {
        let appServer = false;
        let app = express();
        app.use(cors());
        app.use(express.json());
        if(process.env.RELDENS_EXPRESS_SERVE_STATICS){
            // automatically serve dist files:
            let distPath = path.join(projectRoot, 'dist');
            app.use('/', express.static(distPath));
        }
        let runningHttps = false;
        if(process.env.RELDENS_EXPRESS_USE_HTTPS){
            // read certificates:
            const credentials = {
                key: fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_PRIVATE_KEY, 'utf8'),
                cert: fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_CERT, 'utf8')
            };
            if(process.env.RELDENS_EXPRESS_HTTPS_CHAIN){
                credentials['ca'] = fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_CHAIN, 'utf8');
            }
            if(process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE){
                credentials['passphrase'] = process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE;
            }
            appServer = https.createServer(credentials, app);
            runningHttps = true;
        }
        // if https is not running then by default we will run on http:
        if(!runningHttps){
            appServer = http.createServer(app);
        }
        return {app, appServer, express};
    }
}

module.exports.AppServer = new AppServer();
