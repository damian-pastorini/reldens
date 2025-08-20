/**
 *
 * Reldens - Base Test
 *
 */

const assert = require('assert');
const http = require('http');
const https = require('https');
const querystring = require('querystring');
const { Logger } = require('@reldens/utils');

class BaseTest
{

    constructor(config)
    {
        this.assert = assert;
        this.testCount = 0;
        this.passedCount = 0;
        this.config = config;
        this.baseUrl = config.baseUrl;
        this.adminPath = config.adminPath;
        this.adminUser = config.adminUser;
        this.adminPassword = config.adminPassword;
        let parsedUrl = new URL(this.baseUrl);
        this.hostname = parsedUrl.hostname;
        this.port = parsedUrl.port || ('https:' === parsedUrl.protocol ? 443 : 80);
        this.isHttps = 'https:' === parsedUrl.protocol;
    }

    async test(name, fn)
    {
        this.testCount++;
        try {
            await fn();
            Logger.log(100, '', '✓ PASS: '+name);
            this.passedCount++;
        } catch(error){
            Logger.log(100, '', '✗ FAIL: '+name);
            Logger.log(100, '', '    Error: '+error.message);
        }
    }

    async makeRequest(method, path, data)
    {
        return new Promise((resolve, reject) => {
            let options = {
                hostname: this.hostname,
                port: this.port,
                path: path,
                method: method,
                headers: {'Content-Type': 'application/json'},
                timeout: 10000
            };
            let httpModule = this.isHttps ? https : http;
            let req = httpModule.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            if(data){
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    async makeAuthenticatedRequest(method, path, data, session)
    {
        return new Promise((resolve, reject) => {
            let cookieHeader = this.formatCookies(session);
            let options = {
                hostname: this.hostname,
                port: this.port,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookieHeader
                },
                timeout: 10000
            };
            let httpModule = this.isHttps ? https : http;
            let req = httpModule.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            if(data){
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    async makeFormRequest(method, path, data, session)
    {
        return new Promise((resolve, reject) => {
            let postData = querystring.stringify(data);
            let headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            };
            if(session){
                headers['Cookie'] = this.formatCookies(session);
            }
            let options = {
                hostname: this.hostname,
                port: this.port,
                path: path,
                method: method,
                headers: headers,
                timeout: 10000
            };
            let httpModule = this.isHttps ? https : http;
            let req = httpModule.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.write(postData);
            req.end();
        });
    }

    async makeFormRequestWithTimeout(method, path, data, session, timeoutMs)
    {
        return new Promise((resolve, reject) => {
            let cookieHeader = this.formatCookies(session);
            let postData = this.formatFormData(data);
            let options = {
                hostname: this.hostname,
                port: this.port,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                    'Cookie': cookieHeader
                },
                timeout: timeoutMs || 15000
            };
            let req = require('http').request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode, 
                        headers: res.headers, 
                        body: body
                    });
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.write(postData);
            req.end();
        });
    }

    formatCookies(sessionCookies)
    {
        if(!sessionCookies){
            return '';
        }
        if('string' === typeof sessionCookies){
            return sessionCookies;
        }
        if(Array.isArray(sessionCookies)){
            return sessionCookies.map(cookie => cookie.split(';')[0]).join('; ');
        }
        return '';
    }

    formatFormData(data)
    {
        let formData = '';
        for(let key of Object.keys(data)){
            formData += encodeURIComponent(key)+'='+encodeURIComponent(data[key])+'&';
        }
        return formData.slice(0, -1);
    }

    async cleanupTestRecords(entityName, testPrefix, session)
    {
        if(!entityName || !testPrefix || !session){
            return false;
        }
        try {
            let cleanupData = {
                action: 'cleanup-test-data',
                testPrefix: testPrefix
            };
            let response = await this.makeFormRequest('POST',
                this.adminPath+'/'+entityName+'/bulk-delete', cleanupData, session);
            if(302 === response.statusCode &&
                !response.headers.location.includes('error')){
                return true;
            }
            return false;
        } catch(error){
            Logger.log(100, '', 'Cleanup failed for '+entityName+': '+error.message);
            return false;
        }
    }

}

module.exports.BaseTest = BaseTest;
