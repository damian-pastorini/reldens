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

function buildFormConfirmOptions(form)
{
    let options = {};
    if(form.classList.contains('form-delete')){
        options.title = 'Confirm Delete';
        options.message = 'Are you sure you want to delete?';
        options.confirmText = 'Delete';
        options.confirmClass = 'button-danger';
    }
    let submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
    if(submitButton){
        if(submitButton.dataset.modalConfirmLabel){
            options.confirmText = submitButton.dataset.modalConfirmLabel;
        }
        if(submitButton.dataset.modalConfirmClass){
            options.confirmClass = 'button-' + submitButton.dataset.modalConfirmClass;
        }
        if(submitButton.dataset.modalCancelLabel){
            options.cancelText = submitButton.dataset.modalCancelLabel;
        }
        if(submitButton.dataset.modalCancelClass){
            options.cancelClass = 'button-' + submitButton.dataset.modalCancelClass;
        }
    }
    return options;
}

window.addEventListener('DOMContentLoaded', () => {

    // helpers:
    let location = window.location;
    let currentPath = location.pathname;
    let queryString = location.search;
    let urlParams = new URLSearchParams(queryString);

    // remove clearFilters param from URL after page load so sort buttons work correctly:
    if(urlParams.has('clearFilters')){
        urlParams.delete('clearFilters');
        let newSearch = urlParams.toString();
        let newUrl = location.pathname + (newSearch ? '?'+newSearch : '');
        history.replaceState(null, '', newUrl);
    }

    // error codes messages map:
    let errorMessages = {
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

    activateExpandCollapse();

    activateModalElements();

    // login errors:
    if('true' === urlParams.get('login-error')){
        let loginErrorBox = document.querySelector('.login-form .response-error');
        if(loginErrorBox){
            loginErrorBox.innerHTML = 'Login error, please try again.';
        }
    }

    // entity search functionality:
    let entityFilterTerm = document.querySelector('#entityFilterTerm');
    let filterForm = document.querySelector('#filter-form');
    let allFilters = document.querySelectorAll('.filters-toggle-content .filter input');
    if(entityFilterTerm && filterForm){
        entityFilterTerm.addEventListener('input', () => {
            if(entityFilterTerm.value){
                for(let filterInput of allFilters){
                    filterInput.value = '';
                }
            }
        });
        entityFilterTerm.addEventListener('keypress', (event) => {
            if(13 === event.keyCode){
                event.preventDefault();
                filterForm.submit();
            }
        });
        for(let filterInput of allFilters){
            filterInput.addEventListener('input', () => {
                if(filterInput.value){
                    entityFilterTerm.value = '';
                }
            });
        }
        filterForm.addEventListener('submit', () => {
            if(entityFilterTerm.value && allFilters.some(input => input.value)){
                for(let filterInput of allFilters){
                    filterInput.value = '';
                }
            }
        });
    }

    // forms behavior:
    let forms = document.querySelectorAll('form');
    if(forms){
        for(let form of forms){
            if(form.classList.contains('no-auto-disable')){
                continue;
            }
            form.addEventListener('submit', (event) => {
                let submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
                submitButton.disabled = true;
                let loadingImage = form.querySelector('.loading');
                if(form.classList.contains('form-delete') || form.classList.contains('confirmation-required')){
                    event.preventDefault();
                    showConfirmDialog((confirmed) => {
                        if(confirmed){
                            if(form.classList.contains('maps-import-form')){
                                let importDialog = document.querySelector('.confirm-dialog');
                                if(importDialog){
                                    let titleEl = importDialog.querySelector('.dialog-title');
                                    let messageEl = importDialog.querySelector('.dialog-message');
                                    let confirmBtn = importDialog.querySelector('.dialog-confirm');
                                    let cancelBtn = importDialog.querySelector('.dialog-cancel');
                                    let closeBtn = importDialog.querySelector('.dialog-close');
                                    if(titleEl){
                                        titleEl.textContent = 'Importing...';
                                    }
                                    if(messageEl){
                                        messageEl.textContent = 'Importing maps, please wait...';
                                    }
                                    if(confirmBtn){
                                        confirmBtn.classList.add('hidden');
                                    }
                                    if(cancelBtn){
                                        cancelBtn.classList.add('hidden');
                                    }
                                    if(closeBtn){
                                        closeBtn.classList.add('hidden');
                                    }
                                    importDialog.classList.remove('hidden');
                                }
                            }
                            if(loadingImage){
                                loadingImage.classList.remove('hidden');
                            }
                            form.submit();
                        }
                        if(!confirmed){
                            submitButton.disabled = false;
                        }
                    }, buildFormConfirmOptions(form));
                    return;
                }
                if(loadingImage){
                    loadingImage.classList.remove('hidden');
                }
            });
        }
    }

    // sidebar headers click behavior:
    let sideBarHeaders = document.querySelectorAll('.with-sub-items .side-bar-item-header');
    if(sideBarHeaders){
        for(let header of sideBarHeaders){
            header.addEventListener('click', (event) => {
                event.currentTarget.parentNode.classList.toggle('active');
            });
        }
    }

    let logoutLink = document.querySelector('a[href*="/logout"]');
    if(logoutLink){
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            let logoutHref = logoutLink.href;
            showConfirmDialog((confirmed) => {
                if(confirmed){
                    window.location.href = logoutHref;
                }
            }, 'Are you sure you want to log out?');
        });
    }

    // expand menu on load:
    let subItemContainers = document.querySelectorAll('.with-sub-items');
    if(subItemContainers){
        let done = false;
        for(let container of subItemContainers){
            let links = container.querySelectorAll('.side-bar-item a');
            for(let link of links){
                let linkWithoutHost = link.href.replace(location.host, '').replace(location.protocol+'//', '');
                if(currentPath === linkWithoutHost || 0 === currentPath.indexOf(linkWithoutHost+'/')){
                    link.parentNode.classList.add('active');
                    container.classList.add('active');
                    done = true;
                    break;
                }
            }
            if(done){
                break;
            }
        }
    }

    // filters toggle visibility:
    let filtersToggle = document.querySelector('.filters-toggle');
    let filtersToggleContent = document.querySelector('.filters-toggle-content');
    if(filtersToggle && filtersToggleContent){
        filtersToggle.addEventListener('click', () => {
            filtersToggle.classList.toggle('active');
            filtersToggleContent.classList.toggle('hidden');
        });
        let allFilters = document.querySelectorAll('.filters-toggle-content .filter input');
        let entitySearchInput = document.querySelector('#entityFilterTerm');
        let hasEntitySearch = entitySearchInput && '' !== entitySearchInput.value;
        let activeFilters = Array.from(allFilters).filter(input => '' !== input.value);
        if(0 < activeFilters.length || hasEntitySearch){
            filtersToggleContent.classList.remove('hidden');
        }
        let paginationLinks = document.querySelectorAll('.pagination a');
        if(paginationLinks && filterForm){
            for(let link of paginationLinks){
                link.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    let url = new URL(link.href);
                    let params = new URLSearchParams(url.search);
                    if(entitySearchInput && entitySearchInput.value){
                        params.set('entityFilterTerm', entitySearchInput.value);
                    }
                    for(let filterInput of allFilters){
                        if(filterInput.value){
                            let filterName = filterInput.name;
                            params.set(filterName, filterInput.value);
                        }
                    }
                    let sortedHeader = document.querySelector('.sorted');
                    if(sortedHeader){
                        let columnName = sortedHeader.getAttribute('data-column');
                        let sortDirection = sortedHeader.classList.contains('sorted-asc') ? 'asc' : 'desc';
                        params.set('sortBy', columnName);
                        params.set('sortDirection', sortDirection);
                    }
                    window.location.href = url.pathname+'?'+params;
                    return false;
                });
            }
        }
    }

    // column sorting functionality:
    let sortableHeaders = document.querySelectorAll('.sortable');
    if(sortableHeaders){
        for(let header of sortableHeaders){
            header.addEventListener('click', () => {
                let sortForm = header.querySelector('.sort-form');
                if(!sortForm){
                    return;
                }
                let columnName = header.getAttribute('data-column');
                let currentSortDirection = header.classList.contains('sorted-asc')
                    ? 'asc'
                    : header.classList.contains('sorted-desc') ? 'desc' : '';
                let newSortDirection = 'asc';
                if('asc' === currentSortDirection){
                    newSortDirection = 'desc';
                }
                let sortByInput = sortForm.querySelector('input[name="sortBy"]');
                let sortDirectionInput = sortForm.querySelector('input[name="sortDirection"]');
                sortByInput.value = columnName;
                sortDirectionInput.value = newSortDirection;
                let entitySearchInput = document.querySelector('#entityFilterTerm');
                let entityFilterTermInput = sortForm.querySelector('input[name="entityFilterTerm"]');
                if(entityFilterTermInput){
                    entityFilterTermInput.value = entitySearchInput?.value || '';
                }
                let allFilters = document.querySelectorAll('.filters-toggle-content .filter input');
                for(let filterInput of allFilters){
                    let filterName = filterInput.name.replace(/^filters\[/, '').replace(/\]$/, '');
                    let sortFormFilterInput = sortForm.querySelector('input[data-filter-key="'+filterName+'"]');
                    if(sortFormFilterInput){
                        sortFormFilterInput.value = filterInput.value;
                    }
                }
                sortForm.submit();
            });
        }
    }

    // list "select all" option:
    let listSelect = document.querySelector('.list-select');
    if(listSelect){
        listSelect.addEventListener('click', (event) => {
            let isChecked = 1 === Number(event.currentTarget.dataset.checked);
            let checkboxes = document.querySelectorAll('.ids-checkbox');
            for(let checkbox of checkboxes){
                checkbox.checked = isChecked;
            }
            let selectAllCheckbox = event.currentTarget.querySelector('input[type="checkbox"]');
            if(selectAllCheckbox){
                selectAllCheckbox.checked = isChecked;
            }
            event.currentTarget.dataset.checked = isChecked ? 0 : 1;
        });
    }

    // list delete selection:
    let listDeleteSelection = document.querySelector('.list-delete-selection');
    let deleteSelectionForm = document.getElementById('delete-selection-form');
    let hiddenInput = document.querySelector('.hidden-ids-input');
    if(listDeleteSelection && deleteSelectionForm && hiddenInput){
        listDeleteSelection.addEventListener('click', (event) => {
            event.preventDefault();
            if(!document.querySelectorAll('.ids-checkbox:checked').length){
                return;
            }
            showConfirmDialog((confirmed) => {
                if(confirmed){
                    let checkboxes = document.querySelectorAll('.ids-checkbox');
                    let ids = [];
                    for(let checkbox of checkboxes){
                        if(checkbox.checked){
                            ids.push(checkbox.value);
                        }
                    }
                    if(0 === ids.length){
                        return;
                    }
                    deleteSelectionForm.innerHTML = '';
                    for(let id of ids){
                        let input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = 'ids[]';
                        input.value = id;
                        deleteSelectionForm.appendChild(input);
                    }
                    deleteSelectionForm.submit();
                }
            }, { title: 'Confirm Delete', message: 'Are you sure you want to delete the selected items?', confirmText: 'Delete', confirmClass: 'button-danger' });
        });
    }

    // display notifications from query params:
    let notificationElement = document.querySelector('.notification');
    if(notificationElement){
        let closeNotificationElement = document.querySelector('.notification .close');
        closeNotificationElement?.addEventListener('click', () => {
            notificationElement.classList.remove('success', 'error');
        });
        let queryParams = new URLSearchParams(location.search);
        let result = queryParams.get('result');
        if(!result){
            result = getCookie('result');
        }
        let notificationMessageElement = document.querySelector('.notification .message');
        if(result && notificationMessageElement){
            let notificationClass = 'success' === result ? 'success' : 'error';
            notificationMessageElement.innerHTML = '';
            notificationElement.classList.add(notificationClass);
            notificationMessageElement.innerHTML = 'success' === result
                ? 'Success!'
                : 'There was an error: '+escapeHTML(errorMessages[result] || result);
            deleteCookie('result');
            queryParams.delete('result');
            let newUrl = location.pathname + (queryParams.toString() ? '?' + queryParams.toString() : '');
            window.history.replaceState({}, '', newUrl);
        }
    }

    // shutdown timer:
    let shuttingDownTimeElement = document.querySelector('.shutting-down .shutting-down-time');
    if(shuttingDownTimeElement){
        let shuttingDownTime = shuttingDownTimeElement.getAttribute('data-shutting-down-time');
        if(shuttingDownTime){
            shuttingDownTimeElement.innerHTML = escapeHTML(String(shuttingDownTime))+'s';
            shuttingDownTime = Number(shuttingDownTime);
            let shuttingDownTimer = setInterval(
                () => {
                    shuttingDownTimeElement.innerHTML = escapeHTML(String(shuttingDownTime))+'s';
                    shuttingDownTime--;
                    if(0 === Number(shuttingDownTime)){
                        clearInterval(shuttingDownTimer);
                    }
                },
                1000
            );
        }
    }

    // cache clear all functionality:
    let cacheClearAllButton = document.querySelector('.cache-clear-all-button');
    let cacheClearForm = document.querySelector('.cache-clear-form');
    if(cacheClearAllButton){
        cacheClearAllButton.addEventListener('click', () => {
            showConfirmDialog((confirmed) => {
                if(confirmed && cacheClearForm){
                    let submitButton = cacheClearForm.querySelector('button[type="submit"]');
                    if(submitButton){
                        submitButton.disabled = true;
                    }
                    cacheClearForm.submit();
                }
            });
        });
    }

    // remove upload button functionality:
    let removeUploadButtons = document.querySelectorAll('.remove-upload-btn');
    if(removeUploadButtons){
        for(let button of removeUploadButtons){
            button.addEventListener('click', (event) => {
                event.preventDefault();
                let fieldName = button.getAttribute('data-field');
                let fileName = button.getAttribute('data-filename');
                let fileInput = document.getElementById(fieldName);
                let form = fileInput?.closest('form');
                if(!fileInput){
                    return;
                }
                if(!form){
                    return;
                }
                let currentFileDisplay = button.closest('.upload-current-file');
                let container = button.closest('.upload-files-container');
                let isRequired = container && 'true' === container.dataset.required;
                if(isRequired){
                    let remainingFiles = container.querySelectorAll('.upload-current-file');
                    if(2 === remainingFiles.length){
                        let allRemoveButtons = container.querySelectorAll('.remove-upload-btn');
                        for(let removeBtn of allRemoveButtons){
                            removeBtn.remove();
                        }
                    }
                }
                if(currentFileDisplay){
                    currentFileDisplay.remove();
                }
                if(fileName){
                    let hiddenFieldName = 'removed_'+fieldName;
                    let existingHiddenInput = form.querySelector('input[name="'+hiddenFieldName+'"]');
                    if(existingHiddenInput){
                        let currentValue = existingHiddenInput.value;
                        let filesArray = currentValue ? currentValue.split(',') : [];
                        if(-1 === filesArray.indexOf(fileName)){
                            filesArray.push(fileName);
                        }
                        existingHiddenInput.value = filesArray.join(',');
                        return;
                    }
                    let hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.name = hiddenFieldName;
                    hiddenInput.value = fileName;
                    form.appendChild(hiddenInput);
                    return;
                }
                fileInput.value = '';
                let clearFieldName = 'clear_'+fieldName;
                let existingClearInput = form.querySelector('input[name="'+clearFieldName+'"]');
                if(existingClearInput){
                    return;
                }
                let clearInput = document.createElement('input');
                clearInput.type = 'hidden';
                clearInput.name = clearFieldName;
                clearInput.value = '1';
                form.appendChild(clearInput);
            });
        }
    }

    // tileset alert icon toggle:
    let tilesetAlertIcons = document.querySelectorAll('.alert-icon');
    if(tilesetAlertIcons){
        for(let icon of tilesetAlertIcons){
            icon.addEventListener('click', () => {
                let message = icon.nextElementSibling;
                if(message && message.classList.contains('tileset-info-message')){
                    message.classList.toggle('hidden');
                }
            });
        }
    }

    // Reldens custom functions:

    // create rooms link function:
    let entityDataElement = document.querySelector('[data-entity-serialized-data]');
    let mapLoadElement = document.querySelector('[data-map-loader]');
    if(entityDataElement){
        let entityData = entityDataElement?.dataset.entitySerializedData
            ? JSON.parse(entityDataElement.dataset.entitySerializedData)
            : false;
        let elementCurrentRoomChangePointTileIndex = document.querySelector('#currentRoomChangePointTileIndex');
        let roomsSelector = document.querySelector('.nextRoomSelector');
        let elementNextRoomPositionX = document.querySelector('#nextRoomPositionX');
        let elementNextRoomPositionY = document.querySelector('#nextRoomPositionY');
        let nextRoomMapContainer = document.querySelector('.next-room-return-position-container');
        let roomsList = entityData?.extraData?.roomsList;
        if(roomsList && nextRoomMapContainer && roomsSelector instanceof HTMLSelectElement){
            let roomListKey = Object.keys(roomsList);
            for(let key of roomListKey){
                let roomListData = roomsList[key];
                let option = document.createElement('option');
                option.text = roomListData.name;
                option.value = roomListData.id;
                option.dataset.mapFile = roomListData.mapFile;
                option.dataset.mapImages = roomListData.mapImages;
                roomsSelector.add(option);
            }
            roomsSelector.addEventListener('change', (event) => {
                let selectedOption = event.target.options[event.target.selectedIndex];
                nextRoomMapContainer.innerHTML = '';
                elementNextRoomPositionX.value = '';
                elementNextRoomPositionY.value = '';
                loadAndCreateMap(
                    selectedOption.dataset.mapFile,
                    selectedOption.dataset.mapImages,
                    nextRoomMapContainer,
                    (event, data) => {
                        let tileData = calculateTileData(event, data);
                        elementNextRoomPositionX.value = tileData.positionTileX;
                        elementNextRoomPositionY.value = tileData.positionTileY;
                    },
                    false
                );
            });
        }
        if(mapLoadElement){
            loadAndCreateMap(
                entityData.map_filename,
                entityData.scene_images,
                mapLoadElement,
                (event, data) => {
                    let tileData = calculateTileData(event, data);
                    if(elementCurrentRoomChangePointTileIndex){
                        elementCurrentRoomChangePointTileIndex.value = tileData.tileIndex;
                    }
                },
                true
            );
        }
    }

    // maps wizard functions:
    let mapsWizardsOptions = document.querySelectorAll('.maps-wizard-form .map-wizard-option.with-state');
    for(let option of mapsWizardsOptions){
        option.addEventListener('click', (event) => {
            let wizardOptionsContainer = document.querySelectorAll('.wizard-option-container');
            for(let container of wizardOptionsContainer){
                container.classList.remove('active');
            }
            event.currentTarget.parentNode.parentNode.classList.add('active');
        });
    }

    let mapCanvasElements = document.querySelectorAll('.mapCanvas');
    for(let mapCanvas of mapCanvasElements){
        if(!mapCanvas.dataset?.mapJson){
            continue;
        }
        let tileset = new Image();
        // for now, we will only handle 1 image cases:
        tileset.src = mapCanvas.dataset.imageKey;
        tileset.onload = () => {
            fetchMapFileAndDraw(mapCanvas.dataset.mapJson, tileset, mapCanvas);
        };
        tileset.onerror = () => {
            tileset.dataset.loadError = '1';
        };
    }

    // maps import sticky submit container:
    let mapsImportSubmitContainer = document.querySelector('.maps-import-form .submit-container');
    if(mapsImportSubmitContainer){
        let naturalTop = mapsImportSubmitContainer.getBoundingClientRect().top + window.scrollY;
        window.addEventListener('scroll', function(){
            mapsImportSubmitContainer.classList.toggle('is-sticky', window.scrollY > naturalTop);
        }, {passive: true});
    }

    // theme manager functionality:
    let themeSelector = document.querySelector('#selected-theme');
    let executeCommandButtons = document.querySelectorAll('.execute-command');
    let commandDescriptionsData = document.querySelector('#command-descriptions-data');
    let commandDescriptions = {};

    if(commandDescriptionsData){
        try {
            commandDescriptions = JSON.parse(commandDescriptionsData.textContent);
        } catch(error){
            commandDescriptions = {};
        }
    }

    if(executeCommandButtons){
        for(let button of executeCommandButtons){
            button.addEventListener('click', (event) => {
                event.preventDefault();
                if(!themeSelector || !themeSelector.value){
                    return;
                }
                let commandName = button.dataset.command;
                if(!commandName){
                    return;
                }
                let form = button.closest('form');
                if(!form){
                    return;
                }
                let formThemeInput = form.querySelector('input[name="selected-theme"]');
                let formCommandInput = form.querySelector('input[name="command"]');
                if(!formThemeInput || !formCommandInput){
                    return;
                }
                formThemeInput.value = themeSelector.value;
                formCommandInput.value = commandName;
                let commandItem = button.closest('.command-item');
                let loadingImage = commandItem ? commandItem.querySelector('.command-loading') : null;
                showConfirmDialog((confirmed) => {
                    if(confirmed){
                        if(loadingImage){
                            loadingImage.classList.remove('hidden');
                        }
                        form.submit();
                    }
                }, { title: 'Execute Theme Command', message: 'Are you sure you want to execute this command?', confirmText: 'Execute', confirmClass: 'button-primary' });
            });
        }
    }

    let commandTooltips = document.querySelectorAll('.command-item .tooltip-text[data-command]');
    for(let tooltip of commandTooltips){
        let commandName = tooltip.dataset.command;
        let commandInfo = commandDescriptions[commandName];
        if(!commandInfo){
            continue;
        }
        let descriptionElement = tooltip.querySelector('.tooltip-description');
        let detailsElement = tooltip.querySelector('.tooltip-details');
        if(descriptionElement){
            descriptionElement.textContent = commandInfo.description || '';
        }
        if(detailsElement){
            detailsElement.textContent = commandInfo.details || '';
        }
    }

    document.addEventListener('click', function(event) {
        let closeBtn = event.target.closest('.button-close');
        if(!closeBtn){
            return;
        }
        let modal = closeBtn.closest('.modal');
        if(modal) {
            modal.classList.add('hidden');
        }
    });

});
