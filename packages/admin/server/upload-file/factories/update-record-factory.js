/**
 *
 * Reldens - updateRecordFactory
 *
 */

const AdminJS = require('adminjs');
const { buildRemotePath } = require('@adminjs/upload/build/features/upload-file/utils/build-remote-path');
const { DB_PROPERTIES } = require('@adminjs/upload/build/features/upload-file/constants');
const { getNamespaceFromContext } = require('@adminjs/upload/build/features/upload-file/factories/strip-payload-factory');

module.exports.updateRecordFactory = (uploadOptionsWithDefault, provider, propertiesDefinition) => {
    const { properties, uploadPath, multiple } = uploadOptionsWithDefault;
    return async (response, request, context) => {
        let _a;
        const { record } = context;
        const { [properties.file]: files, [properties.filesToDelete]: filesToDelete } = getNamespaceFromContext(context);
        const { method } = request;
        if (method !== 'post') {
            return response;
        }
        if(record && record.isValid()){
            let deleteEmpty = false;
            if(multiple && filesToDelete && filesToDelete.length){
                const filesData = filesToDelete.map((index) => ({
                    key: record.get(properties.key)[index],
                    bucket: record.get(properties.bucket)[index],
                }));
                await Promise.all(filesData.map(async (fileData) => (
                    provider.delete(fileData.key, fileData.bucket || provider.bucket, context))
                ));
                const newParams = DB_PROPERTIES.reduce((params, propertyName) => {
                    if (properties[propertyName]) {
                        const filtered = record.get(properties[propertyName]).split(',').filter((el, i) => (
                            !filesToDelete.includes(i.toString())
                        ));
                        return AdminJS.flat.set(params, properties[propertyName], filtered);
                    }
                    return params;
                }, {});
                if(0 === newParams[properties.key].length && !propertiesDefinition[properties.key].isRequired){
                    newParams[properties.key] = '';
                }
                if(0 < newParams[properties.key].length || !propertiesDefinition[properties.key].isRequired){
                    // response.notice.message = 'ERROR';
                    // response.notice.type = 'error';
                    await record.update(newParams);
                }
                deleteEmpty = true;
            }
            if(multiple && files && files.length){
                const uploadedFiles = files;
                const keys = await Promise.all(uploadedFiles.map(async (uploadedFile) => {
                    const key = buildRemotePath(record, uploadedFile, uploadPath);
                    await provider.upload(uploadedFile, key, context);
                    return key;
                }));
                // original:
                // ...(record.get(properties.key) || []),
                // fixed:
                // ...([record.get(properties.key)] || []),
                let recordData = false === deleteEmpty ? ([record.get(properties.key)] || []) : [];
                let params = AdminJS.flat.set({}, properties.key, [
                    ...(recordData),
                    ...keys,
                ]);
                if (properties.bucket) {
                    params = AdminJS.flat.set(params, properties.bucket, [
                        ...(record.get(properties.bucket) || []),
                        ...uploadedFiles.map(() => provider.bucket),
                    ]);
                }
                if (properties.size) {
                    params = AdminJS.flat.set(params, properties.size, [
                        ...(record.get(properties.size) || []),
                        ...uploadedFiles.map((file) => file.size),
                    ]);
                }
                if (properties.mimeType) {
                    params = AdminJS.flat.set(params, properties.mimeType, [
                        ...(record.get(properties.mimeType) || []),
                        ...uploadedFiles.map((file) => file.type),
                    ]);
                }
                if (properties.filename) {
                    params = AdminJS.flat.set(params, properties.filename, [
                        ...(record.get(properties.filename) || []),
                        ...uploadedFiles.map((file) => file.name),
                    ]);
                }
                await record.update(params);
                return Object.assign(Object.assign({}, response), { record: record.toJSON(context.currentAdmin) });
            }
            if (!multiple && files && files.length) {
                const uploadedFile = files[0];
                const oldRecordParams = Object.assign({}, record.params);
                const key = buildRemotePath(record, uploadedFile, uploadPath);
                await provider.upload(uploadedFile, key, context);
                const params = Object.assign(
                    Object.assign(
                        Object.assign(
                            Object.assign(
                                { [properties.key]: key },
                                properties.bucket && { [properties.bucket]: provider.bucket }
                            ),
                            properties.size && {
                                [properties.size]: (_a = uploadedFile.size) === null || _a === void 0
                                    ? void 0
                                    : _a.toString()
                            }
                        ),
                        properties.mimeType && { [properties.mimeType]: uploadedFile.type }
                    ),
                    properties.filename && { [properties.filename]: uploadedFile.name }
                );
                await record.update(params);
                const oldKey = oldRecordParams[properties.key] && oldRecordParams[properties.key];
                const oldBucket = (properties.bucket && oldRecordParams[properties.bucket]) || provider.bucket;
                if (oldKey && oldBucket && (oldKey !== key || oldBucket !== provider.bucket)) {
                    await provider.delete(oldKey, oldBucket, context);
                }
                return Object.assign(Object.assign({}, response), { record: record.toJSON(context.currentAdmin) });
            }
            // someone wants to remove one file
            if(!multiple && files === null){
                const bucket = (properties.bucket && record.get(properties.bucket)) || provider.bucket;
                const key = record.get(properties.key);
                // and file exists
                if (key && bucket) {
                    const params = Object.assign(
                        Object.assign(
                            Object.assign(
                                Object.assign(
                                    { [properties.key]: null },
                                    properties.bucket && { [properties.bucket]: null }
                                ),
                                properties.size && { [properties.size]: null }
                            ),
                            properties.mimeType && { [properties.mimeType]: null }
                        ),
                        properties.filename && { [properties.filename]: null }
                    );
                    await record.update(params);
                    await provider.delete(key, bucket, context);
                    return Object.assign(Object.assign({}, response), { record: record.toJSON(context.currentAdmin) });
                }
            }
        }
        return response;
    };
};
