/**
 *
 * Reldens - Admin Client JS
 *
 */

if(window.trustedTypes?.createPolicy){
    trustedTypes.createPolicy('default', {
        createHTML: s => s,
        createScriptURL: s => s
    });
}

window.addEventListener('DOMContentLoaded', () => {

    // helpers:
    let location = window.location;
    let currentPath = location.pathname;
    let queryString = location.search;
    let urlParams = new URLSearchParams(queryString);

    // error codes messages map (CMS base + Reldens extensions):
    let errorMessages = {
        // CMS base messages:
        saveBadPatchData: 'Bad patch data on update.',
        saveEntityStorageError: 'Entity storage error.',
        saveEntityError: 'Entity could not be saved.',
        shutdownError: 'Server could not be shutdown, missing "shutdownTime".',
        errorView: 'Could not render view page.',
        errorEdit: 'Could not render edit page.',
        errorId: 'Missing entity ID on POST.',
        // Reldens-specific messages:
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
    };

    // activate expand/collapse elements and modals (from functions.js):
    activateExpandCollapse();

    activateModalElements();

    // login errors:
    if('true' === urlParams.get('login-error')){
        let loginErrorBox = document.querySelector('form.login-form .response-error');
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
            form.addEventListener('submit', (event) => {
                let submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
                submitButton.disabled = true;
                let loadingImage = document.querySelector('.submit-container .loading');
                if(loadingImage){
                    loadingImage.classList.remove('hidden');
                }
                if(form.classList.contains('form-delete') || form.classList.contains('confirmation-required')){
                    event.preventDefault();
                    showConfirmDialog((confirmed) => {
                        if(confirmed){
                            form.submit();
                        }
                        if(!confirmed){
                            submitButton.disabled = false;
                            if(loadingImage){
                                loadingImage.classList.add('hidden');
                            }
                        }
                    });
                }
            });
        }
    }

    // sidebar headers click behavior:
    let sideBarHeaders = document.querySelectorAll('.with-sub-items h3');
    if(sideBarHeaders){
        for(let header of sideBarHeaders){
            header.addEventListener('click', (event) => {
                event.currentTarget.parentNode.classList.toggle('active');
            });
        }
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
                    let newUrl = url.pathname + '?' + params;
                    window.location.href = newUrl;
                    return false;
                })
            }
        }
    }

    // list "select all" option:
    let listSelect = document.querySelector('.list-select');
    if(listSelect){
        listSelect.addEventListener('click', (event) => {
            let checkboxes = document.querySelectorAll('.ids-checkbox');
            for(let checkbox of checkboxes){
                checkbox.checked = 1 === Number(event.currentTarget.dataset.checked);
            }
            event.currentTarget.dataset.checked = 1 === Number(event.currentTarget.dataset.checked) ? 0 : 1;
        });
    }

    // list delete selection:
    let listDeleteSelection = document.querySelector('.list-delete-selection');
    let deleteSelectionForm = document.getElementById('delete-selection-form');
    let hiddenInput = document.querySelector('.hidden-ids-input');
    if(listDeleteSelection && deleteSelectionForm && hiddenInput){
        listDeleteSelection.addEventListener('click', (event) => {
            event.preventDefault();
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
            });
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
                    }
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
                }
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
            console.error('Error loading tileset image');
        };
    }

});
