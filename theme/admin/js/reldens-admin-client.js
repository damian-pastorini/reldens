/**
 *
 * Reldens - Admin Client JS
 *
 */

let trustedTypesPolicy = null;
if(window.trustedTypes && window.trustedTypes.createPolicy){
    trustedTypesPolicy = window.trustedTypes.createPolicy('default', {
        createHTML: (s) => s,
        createScriptURL: (s) => s
    });
}
window.trustedTypesPolicy = trustedTypesPolicy;

class AdminClient
{
    constructor()
    {
        this.errorMessages = {
            saveBadPatchData: 'Bad patch data on update.',
            saveEntityStorageError: 'Entity storage error.',
            saveEntityError: 'Entity could not be saved.',
            shutdownError: 'Server could not be shutdown, missing "shutdownTime".',
            errorView: 'Could not render view page.',
            errorEdit: 'Could not render edit page.',
            errorId: 'Missing entity ID on POST.',
            // Reldens custom messages:
            mapsWizardImportDataError: 'Map could not be imported, missing generated map data.',
            mapsWizardImportError: 'Map could not be imported.',
            objectsImportMissingDataError: 'Object could not be imported, missing JSON files.',
            objectsImportDataError: 'Object could not be imported, missing data in JSON files.',
            objectsImportError: 'Object could not be imported.',
            skillsImportMissingDataError: 'Skills could not be imported, missing JSON files.',
            skillsImportDataError: 'Skills could not be imported, missing data in JSON files.',
            skillsImportError: 'Skills could not be imported.',
            errorMissingTileIndex: 'Missing tile index to create change point.',
            errorMissingNextRoom: 'Missing next room selection.',
            errorMissingRoomX: 'Missing return point X.',
            errorMissingRoomY: 'Missing return point Y.',
            errorSaveChangePoint: 'Error saving change point.',
            errorSaveReturnPoint: 'Error saving return point.',
            themeManagerMissingTheme: 'Please select a theme.',
            themeManagerMissingCommand: 'Please select a command.',
            themeManagerExecutionError: 'Theme command execution failed.',
        };
        this.shuttingDownTime = 0;
        window.addEventListener('DOMContentLoaded', () => this.bind());
    }

    setupUrlParams()
    {
        let urlParams = new URLSearchParams(this.location.search);
        if(urlParams.has('clearFilters')){
            urlParams.delete('clearFilters');
            let newSearch = urlParams.toString();
            let newUrl = this.location.pathname + (newSearch ? '?'+newSearch : '');
            history.replaceState(null, '', newUrl);
        }
        this.urlParams = urlParams;
    }

    bindLoginError()
    {
        if('true' !== this.urlParams.get('login-error')){
            return;
        }
        let loginErrorBox = document.querySelector('.login-form .response-error');
        if(loginErrorBox){
            loginErrorBox.innerHTML = 'Login error, please try again.';
        }
    }

    bindNotifications()
    {
        let notificationElement = document.querySelector('.notification');
        if(!notificationElement){
            return;
        }
        let closeNotificationElement = document.querySelector('.notification .close');
        closeNotificationElement?.addEventListener('click', () => {
            notificationElement.classList.remove('success', 'error');
        });
        let queryParams = new URLSearchParams(this.location.search);
        let result = queryParams.get('result');
        if(!result){
            result = adminFunctions.getCookie('result');
        }
        let notificationMessageElement = document.querySelector('.notification .message');
        if(!result || !notificationMessageElement){
            return;
        }
        let notificationClass = 'success' === result ? 'success' : 'error';
        notificationMessageElement.innerHTML = '';
        notificationElement.classList.add(notificationClass);
        notificationMessageElement.innerHTML = 'success' === result
            ? 'Success!'
            : 'There was an error: '+adminFunctions.escapeHTML(this.errorMessages[result] || result);
        adminFunctions.deleteCookie('result');
        queryParams.delete('result');
        let newUrl = this.location.pathname + (queryParams.toString() ? '?' + queryParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
    }

    tickShutdownTimer(shuttingDownTimeElement, timerId)
    {
        shuttingDownTimeElement.innerHTML = adminFunctions.escapeHTML(String(this.shuttingDownTime))+'s';
        this.shuttingDownTime--;
        if(0 === Number(this.shuttingDownTime)){
            clearInterval(timerId);
        }
    }

    bindShutdownTimer()
    {
        let shuttingDownTimeElement = document.querySelector('.shutting-down .shutting-down-time');
        if(!shuttingDownTimeElement){
            return;
        }
        let shuttingDownTime = shuttingDownTimeElement.getAttribute('data-shutting-down-time');
        if(!shuttingDownTime){
            return;
        }
        shuttingDownTimeElement.innerHTML = adminFunctions.escapeHTML(String(shuttingDownTime))+'s';
        this.shuttingDownTime = Number(shuttingDownTime);
        let timerId = setInterval(() => this.tickShutdownTimer(shuttingDownTimeElement, timerId), 1000);
    }

    bind()
    {
        this.location = window.location;
        this.currentPath = this.location.pathname;
        this.setupUrlParams();
        adminFunctions.activateExpandCollapse();
        adminFunctions.activateModalElements();
        this.bindLoginError();
        let forms = new AdminClientForms();
        forms.bind();
        new AdminClientFilters().bind(this.currentPath, this.location);
        new AdminClientMaps().bind();
        new AdminClientTheme(forms).bind();
        this.bindNotifications();
        this.bindShutdownTimer();
    }
}
new AdminClient();
