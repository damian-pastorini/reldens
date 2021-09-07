import React, {FC} from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import {Icon, Button, Box} from '@adminjs/design-system';
import {ShowPropertyProps, flat} from 'adminjs';
import {ImageMimeTypes, AudioMimeTypes} from '@adminjs/upload/src/features/upload-file/types/mime-types.type';
import PropertyCustom from '@adminjs/upload/src/features/upload-file//types/property-custom.type';

type Props = ShowPropertyProps & {
    width?: number | string;
};

type SingleFileProps = {
    name: string,
    path?: string,
    mimeType?: string,
    width?: number | string;
}

const SingleFile: FC<SingleFileProps> = (props) => {
    const {name, path, mimeType, width} = props;
    if (path && path.length) {
        if (mimeType && ImageMimeTypes.includes(mimeType as any)) {
            return (<img src={path} style={{maxHeight: width, maxWidth: width}} alt={name}/>);
        }
        if (mimeType && AudioMimeTypes.includes(mimeType as any)) {
            return (
                <Box>
                    {name}<br/>
                    <audio controls src={path}>
                        Your browser does not support the
                        <code>audio</code>
                        <track kind="captions"/>
                    </audio>
                </Box>
            );
        }
    }
    return (
        <Box>
            <Button as="a" href={path} ml="default" size="sm" rounded target="_blank">
                <Icon icon="DocumentDownload" color="white" mr="default"/>
                {name}
            </Button>
        </Box>
    );
};

const File: FC<Props> = ({width, record, property}) => {
    const {custom} = property as unknown as { custom: PropertyCustom };
    const path = flat.get(record?.params, custom.filePathProperty);
    if (!path) {
        return null;
    }
    const name = flat.get(
        record?.params,
        custom.fileNameProperty ? custom.fileNameProperty : custom.keyProperty,
    );
    if (!property.custom.multiple) {
        return <SingleFile
            path={record.params.bucketPath + name}
            name={name}
            width={width}
            mimeType={record.params.mimeType}
        />
    }
    return (
        <>
            {path.map((singlePath, index) => {
                return (
                    <SingleFile
                        key={singlePath}
                        path={record.params.bucketPath + name[index]}
                        name={name[index]}
                        width={width}
                        mimeType={record.params['mimeType.'+index]}
                    />
                )
            })}
        </>
    );
};

export default File;
