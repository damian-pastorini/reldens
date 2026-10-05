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
            mapsWizardMapsNotGeneratedError: 'Maps could not be generated, the generator returned no maps.',
            mapsWizardGeneratorError: 'Maps could not be generated, the generator failed. Check the server logs.',
            mapsWizardSelectedHandlerError: 'Maps could not be generated, the selected generation option is not '
                +'compatible with the submitted data.',
            mapsWizardMissingActionError: 'Please select a maps generation option.',
            mapsWizardMissingDataError: 'Maps could not be generated, the generator configuration is missing.',
            mapsWizardWrongJsonDataError: 'Maps could not be generated, the generator configuration is not valid '
                +'JSON.',
            mapsWizardMissingHandlerError: 'Maps could not be generated, the selected generation option is unknown.',
            mapExists: 'Map could not be imported, a room with that map name already exists.',
            mapJsonMissingTileset: 'Map could not be imported, the map JSON declares no tileset.',
            mapJsonMissingTilesetImage: 'Map could not be imported, the map JSON tileset declares no image.',
            mapTilesetImageNotFound: 'Map could not be imported, the tileset image file was not found.',
            copyMapFilesError: 'Map could not be imported, the map files could not be copied.',
            mergeMapFilesError: 'Map could not be imported, the merged map file could not be written.',
            mapSaveError: 'Map could not be imported, the room record could not be saved.',
            createRoomError: 'Map could not be imported, the room record was not created.',
            mapsWizardMissingCompositeFileError: 'Maps could not be generated, the composite elements file was not '
                +'found in the session folder and no sample composite could be resolved from the installed packages.',
            mapsWizardMissingElementsFilesError: 'Maps could not be generated, the layer elements files or the '
                +'tile sheet image were not found in the session folder and no sample could be resolved from '
                +'the installed packages.',
            mapJsonNotFound: 'Map could not be imported, the generated map JSON file was not found.',
            mapJsonEmpty: 'Map could not be imported, the generated map JSON file is empty.',
            mapJsonNotLoaded: 'Map could not be imported, the generated map JSON could not be loaded.',
            changePointRoomMissing: 'Map could not be imported, one of the associated maps a change point points to '
                +'was not generated, so the change points could not be created.',
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
            errorRoomDeleteIsDefault: 'This room is the default room and can not be deleted. '
                +'Set another room as default (Set default > Save as default), then delete it.',
            errorDeletePrevented: 'This record could not be deleted because of related data.',
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

    bindDuplicateButton()
    {
        let duplicateButton = document.querySelector('.button-duplicate');
        if(!duplicateButton){
            return;
        }
        duplicateButton.addEventListener('click', () => {
            let editForm = document.querySelector('#edit-form');
            if(!editForm){
                return;
            }
            let idValueInput = editForm.querySelector('.entity-id-value');
            if(idValueInput){
                let idDisplayInput = editForm.querySelector('[name="disabled-'+idValueInput.name+'"]');
                if(idDisplayInput){
                    idDisplayInput.value = '';
                }
                idValueInput.value = '';
            }
            let titleElement = document.querySelector('.entity-edit h2');
            if(titleElement){
                titleElement.textContent = 'Duplicate';
            }
            duplicateButton.classList.add('hidden');
        });
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
        this.bindDuplicateButton();
    }
}
new AdminClient();
