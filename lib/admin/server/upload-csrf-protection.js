/**
 *
 * Reldens - UploadCsrfProtection
 *
 * Moves the CSRF check of an administration upload route after its uploader, where the multipart body with the token
 * field is parsed. The route path is excluded from the router level check and the returned middleware runs the same
 * check of the administration router for that route.
 *
 */

const { CsrfProtection } = require('@reldens/cms/lib/admin-manager/csrf-protection');

/**
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 */
class UploadCsrfProtection
{

    /**
     * @param {AdminManager} adminManager
     * @param {string} routePath
     * @returns {Function}
     */
    static createMiddleware(adminManager, routePath)
    {
        adminManager.router.csrfProtection.ignoredPaths.push(routePath);
        return new CsrfProtection({enabled: adminManager.router.csrfProtection.enabled}).createMiddleware();
    }

}

module.exports.UploadCsrfProtection = UploadCsrfProtection;
