/**
 *
 * Reldens - AppServerFactory
 *
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const TemplateEngine = require('mustache');

class AppServerFactory
{

    createAppServer()
    {
        // @TODO - BETA - Generally improve server factory.
        let appServer = false;
        let app = express();
        app.use(cors());
        app.use(express.json());
        // if https is not running then by default we will run on http:
        appServer = process.env.RELDENS_EXPRESS_USE_HTTPS
            ? this.createHttpsServer(appServer, app)
            : http.createServer(app);
        return {app, appServer, express, isInstalled: true};
    }

    createHttpsServer(appServer, app)
    {
        // @TODO - BETA - Change hardcoded 'utf8' to process.env.RELDENS_DEFAULT_ENCODING.
        let credentials = {
            key: fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_PRIVATE_KEY, 'utf8'),
            cert: fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_CERT, 'utf8')
        };
        if(process.env.RELDENS_EXPRESS_HTTPS_CHAIN){
            credentials['ca'] = fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_CHAIN, 'utf8');
        }
        if(process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE){
            credentials['passphrase'] = process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE;
        }
        return https.createServer(credentials, app);
    }

    enableServeHome(app, distPath)
    {
        // @TODO - BETA - Change hardcoded 'utf8' to process.env.RELDENS_DEFAULT_ENCODING.
        app.use('/', (req, res, next) => {
            if('/' === req._parsedUrl.pathname){
                let filePath = req.query.lang && fs.existsSync(distPath+'/'+req.query.lang+'/index.html')
                    ? distPath+'/'+req.query.lang+'/index.html'
                    : distPath+'/index.html';
                // @TODO - BETA - Move the rendering process outside this AppServerFactory.
                let html = fs.readFileSync(filePath, 'utf8');
                res.send(TemplateEngine.render(html, {}));
                return;
            }
            next();
        });
    }

    enableServeStatics(app, distPath)
    {
        app.use(express.static(distPath));
    }

}

module.exports.AppServerFactory = new AppServerFactory();
