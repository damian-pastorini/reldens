/**
 *
 * Reldens - RoomsFileUploadRenderer
 *
 */

const { sc } = require('@reldens/utils');

class RoomsFileUploadRenderer
{

    async renderFileUploadField(eventData)
    {
        let propertyKey = eventData.propertyKey;
        if('scene_images' !== propertyKey){
            return;
        }
        let protectedFiles = sc.get(eventData.renderedEditProperties, 'tilesetImages', []);
        if(0 === protectedFiles.length){
            return;
        }
        if(!sc.get(eventData.renderedEditProperties, 'overrideSceneImagesEnabled', false)){
            return;
        }
        let editTemplates = eventData?.adminFilesContents?.fields?.edit;
        let fileItemTemplate = sc.get(editTemplates, 'tileset-file-item', false);
        if(!fileItemTemplate){
            return;
        }
        let alertWrapperTemplate = sc.get(editTemplates, 'tileset-alert-wrapper', false);
        if(!alertWrapperTemplate){
            return;
        }
        let filesArray = sc.get(eventData.templateData, 'filesArray', []);
        let renderedFileItems = [];
        for(let file of filesArray){
            let filename = file.filename || file;
            renderedFileItems.push(await eventData.adminContentsRender(fileItemTemplate, {
                fieldName: propertyKey,
                filename,
                isProtected: -1 !== protectedFiles.indexOf(filename)
            }));
        }
        eventData.templateData.renderedFiles = await eventData.adminContentsRender(
            alertWrapperTemplate,
            {renderedFileItems: renderedFileItems.join('')}
        );
        eventData.templateData.renderedAlert = '';
    }

}

module.exports.RoomsFileUploadRenderer = RoomsFileUploadRenderer;
