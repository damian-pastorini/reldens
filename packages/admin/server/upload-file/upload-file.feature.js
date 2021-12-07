/**
 *
 * Reldens - uploadFileFeature
 *
 */

const { updateRecordFactory } = require('./factories/update-record-factory');
const AdminJS = require('adminjs');
const { getProvider } = require('@adminjs/upload/build/features/upload-file/utils/get-provider');
const { deleteFileFactory } = require('@adminjs/upload/build/features/upload-file/factories/delete-file-factory');
const { deleteFilesFactory } = require('@adminjs/upload/build/features/upload-file/factories/delete-files-factory');
const { stripPayloadFactory } = require('@adminjs/upload/build/features/upload-file/factories/strip-payload-factory');
const { lookup } = require('mime-types');
const { sc } = require('@reldens/utils');
const DEFAULT_FILE_PROPERTY = 'file';
const DEFAULT_FILE_PATH_PROPERTY = 'filePath';
const DEFAULT_FILES_TO_DELETE_PROPERTY = 'filesToDelete';

const lookupForMimeTypes = (params, properties) => {
    let mimeParams = {};
    for(let i of Object.keys(params)){
        // key or key. are the only valid strings
        if(i.indexOf(properties.key) !== 0 || (i.indexOf(properties.key) === 0 && i.indexOf(properties.key+'.') === -1)){
            continue
        }
        let param = params[i];
        let mimeKey = i.replace(properties.key, 'mimeType');
        mimeParams[mimeKey] = lookup(params.bucketPath + param);
    }
    return Object.assign(params, mimeParams);
};

const fillRecordWithPath = async (record, context, uploadOptions) => {
    const { properties } = uploadOptions;
    const key = AdminJS.flat.get(record === null || record === void 0 ? void 0 : record.params, properties.key);
    let params = AdminJS.flat.set(record.params, properties.filePath, key);
    params.bucketPath = context.resource.rawConfig.bucketPath;
    lookupForMimeTypes(params, properties);
    return Object.assign(Object.assign({}, record), {params});
};

const uploadFileFeature = (config) => {
    const { provider: providerOptions, validation, multiple, propertiesDefinition } = config;
    const configWithDefault = Object.assign(Object.assign({}, config), {
        properties: Object.assign(Object.assign({}, config.properties), {
            file: sc.getDef(config.properties, 'file', DEFAULT_FILE_PROPERTY),
            filePath: sc.getDef(config.properties, 'filePath', DEFAULT_FILE_PATH_PROPERTY),
            filesToDelete: sc.getDef(config.properties, 'filesToDelete', DEFAULT_FILES_TO_DELETE_PROPERTY),
        })
    });
    const { properties } = configWithDefault;
    const { provider, name: providerName } = getProvider(providerOptions);
    if (!properties.key) {
        throw new Error('ERROR NO_KEY_PROPERTY');
    }
    const stripFileFromPayload = stripPayloadFactory(configWithDefault);
    const updateRecord = updateRecordFactory(configWithDefault, provider, propertiesDefinition);
    const deleteFile = deleteFileFactory(configWithDefault, provider);
    const deleteFiles = deleteFilesFactory(configWithDefault, provider);
    const fillPath = async (response, request, context) => {
        const { record } = response;
        return Object.assign(Object.assign({}, response), {
            record: await fillRecordWithPath(record, context, configWithDefault)
        });
    };
    const fillPaths = async (response, request, context) => {
        const { records } = response;
        return Object.assign(Object.assign({}, response), {
            records: await Promise.all(records.map(
                (record) => (fillRecordWithPath(record, context, configWithDefault))
            ))
        });
    };
    const custom = {
        fileProperty: properties.file,
        filePathProperty: properties.filePath,
        filesToDeleteProperty: properties.filesToDelete,
        provider: providerName,
        keyProperty: properties.key,
        bucketProperty: properties.bucket,
        mimeTypeProperty: properties.mimeType,
        defaultBucket: provider.bucket,
        mimeTypes: validation === null || validation === void 0 ? void 0 : validation.mimeTypes,
        maxSize: validation === null || validation === void 0 ? void 0 : validation.maxSize,
        multiple: !!multiple,
    };
    return AdminJS.buildFeature({
        properties: {
            [properties.file]: {
                custom,
                isVisible: { show: true, edit: true, list: true, filter: false },
                components: {
                    edit: AdminJS.bundle('./components/edit'),
                    list: AdminJS.bundle('./components/list'),
                    show: AdminJS.bundle('./components/show'),
                },
            },
        },
        actions: {
            show: {
                after: fillPath,
            },
            new: {
                before: stripFileFromPayload,
                after: [updateRecord, fillPath]
            },
            edit: {
                before: [stripFileFromPayload],
                after: [updateRecord, fillPath],
            },
            delete: {
                after: deleteFile,
            },
            list: {
                after: fillPaths,
            },
            bulkDelete: {
                after: deleteFiles,
            },
        },
    });
};

module.exports.uploadFileFeature = uploadFileFeature;
