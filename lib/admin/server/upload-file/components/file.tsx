// @ts-ignore
import React, { FC } from 'react';
import { Icon, Button, Box } from '@adminjs/design-system';
import { ShowPropertyProps, flat } from 'adminjs';
import {
    ImageMimeTypes,
    AudioMimeTypes,
    TextMimeTypes
} from '@adminjs/upload/src/features/upload-file/types/mime-types.type';
import PropertyCustom from '@adminjs/upload/src/features/upload-file//types/property-custom.type';

type Props = ShowPropertyProps & {
    width?: number | string;
};

type SingleFileProps = {
    name: string,
    path?: string,
    mimeType?: string,
    width?: number | string;
    upKeyProperty?: string;
}

const SingleFile: FC<SingleFileProps> = (props) => {
    const {name, path, mimeType, width, upKeyProperty} = props;
    if(path && path.length){
        if(mimeType && ImageMimeTypes.includes(mimeType as any)){
            return (
                <Box>
                    <span className="image-file-name" data-key-property={upKeyProperty}>{name}</span>
                    <br/>
                    <img src={path} style={{maxHeight: width, maxWidth: width}} alt={name}/>
                </Box>
            );
        }
        if(mimeType && AudioMimeTypes.includes(mimeType as any)){
            return (
                <Box>
                    <span className="audio-file-name" data-key-property={upKeyProperty}>{name}</span>
                    <br/>
                    <audio controls src={path}>
                        Your browser does not support the
                        <code>audio</code>
                        <track kind="captions"/>
                    </audio>
                </Box>
            );
        }
        if(mimeType && TextMimeTypes.includes(mimeType as any)){
            return (
                <Box>
                    <span className="file-name" data-key-property={upKeyProperty}>
                        <a href={path} target="_blank">{name}</a>
                    </span>
                </Box>
            );
        }
    }
    return (
        <Box>
            <Button as="a" href={path} ml="default" size="sm" rounded target="_blank" data-key-property={upKeyProperty}>
                <Icon icon="DocumentDownload" color="white" mr="default"/>
                {name}
            </Button>
        </Box>
    );
};

const File: FC<Props> = ({width, record, property}) => {
    const {custom} = property as unknown as { custom: PropertyCustom };
    const path = flat.get(record?.params, custom.filePathProperty);
    if(!path){
        return null;
    }
    const name = flat.get(
        record?.params,
        custom.fileNameProperty ? custom.fileNameProperty : custom.keyProperty,
    );
    if(!property.custom.multiple){
        return <SingleFile
            path={record.params.bucketPath + name}
            name={name}
            width={width}
            // @TODO - BETA - Fix multiple images upload.
            // mimeTypeKey is accessed here:
            // mimeType={record.params[custom.keyProperty+'_mimeType']}
            mimeType={record.params['mimeType_'+custom.keyProperty]}
            upKeyProperty={custom.keyProperty}
        />
    }
    return (
        <>
            {path.map((singlePath, index) => {
                let mimeTypeKey = 'mimeType.'+index+'_'+custom.keyProperty+'.'+index;
                return (
                    <SingleFile
                        key={singlePath}
                        path={record.params.bucketPath + name[index]}
                        name={name[index]}
                        width={width}
                        // @TODO - BETA - Fix multiple images upload.
                        // mimeTypeKey is accessed here:
                        // mimeType={record.params[custom.keyProperty+'.'+index+'_mimeType.'+index]}
                        mimeType={record.params[mimeTypeKey]}
                        upKeyProperty={custom.keyProperty}
                    />
                )
            })}
        </>
    );
};

export default File;
