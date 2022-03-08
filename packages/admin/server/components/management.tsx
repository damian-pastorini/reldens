/**
 *
 * Reldens - Server Status Component
 *
 */

// @ts-ignore
import React, { useEffect, useState } from 'react';
import {Box, H3, Button,  } from '@adminjs/design-system';
import { ApiClient, useNotice} from 'adminjs';

const api = new ApiClient();

const Management = () => {
    const [result, setData] = useState({});
    const addNotice = useNotice();
    const handleBuild = () => {
        api.getPage({pageName: 'management', params: {buildClient: true}}).then(res => {
            setData(result);
            if(res.data.buildClient){
                addNotice({message: 'Client Build Finished!', type: 'success'});
                return;
            }
        });
    };

    const handleShootDown = () => {
        if(confirm('Are you sure? This page will not respond anymore after this action.')){
            api.getPage({pageName: 'management', params: {shootDownServer: true}}).catch(()=>{
                addNotice({message: 'Server is down.', type: 'error'}); // you will never reach this.
            });
        }
    };

    useEffect(() => {
        api.getPage({ pageName: 'management' }).then(res => {
            setData(result);
        });
    });

    // @TODO - BETA - Refactor and include more features.
    return (
        <Box variant="grey">
            <Box variant="card" mb="xl">
                <H3>Client Management</H3>
                <Box mb="xl">
                    <Button onClick={handleBuild}>Re-Build Client</Button>
                </Box>
                <Box>
                    <p>This will regenerate the entire /dist folder with all the associated assets coming from the active theme.</p>
                    <p>Note: if you did server configuration or contents changes you will need to reset the server manually.</p>
                </Box>
            </Box>
            <Box variant="card">
                <H3>Server Management</H3>
                <Box mb="xl">
                    <Button variant="danger" onClick={handleShootDown}>ShootDown Server!</Button>
                </Box>
                <Box>
                    <p style={{fontWeight: 'bold', color: 'red'}}>IMPORTANT: this will END/DESTROY the Node process, even for this Administration Panel.</p>
                </Box>
            </Box>
        </Box>
    );
};

export default Management;
