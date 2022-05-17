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

class AppServer
{

    createAppServer(distPath)
    {
        let appServer = false;
        let app = express();
        app.use(cors());
        app.use(express.json());
        if(process.env.RELDENS_EXPRESS_SERVE_STATICS){
            // automatically serve dist files:
            app.use('/', express.static(distPath));
        }
        // if https is not running then by default we will run on http:
        appServer = process.env.RELDENS_EXPRESS_USE_HTTPS
            ? this.createHttpsServer(appServer, app)
            : http.createServer(app);
        return {app, appServer, express, isInstalled: true};
    }

    createHttpsServer(appServer, app)
    {
        // read certificates:
        let credentials = {
            key: fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_PRIVATE_KEY, 'utf8'),
            cert: fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_CERT, 'utf8')
        };
        if (process.env.RELDENS_EXPRESS_HTTPS_CHAIN) {
            credentials['ca'] = fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_CHAIN, 'utf8');
        }
        if (process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE) {
            credentials['passphrase'] = process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE;
        }
        return https.createServer(credentials, app);
    }

}

module.exports.AppServer = new AppServer();
