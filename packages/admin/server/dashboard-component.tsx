/**
 *
 * Reldens - Dashboard Component
 *
 */

import React, { useState, useEffect } from 'react';
import { ApiClient } from 'adminjs';
import styled from 'styled-components';
import { Box, H2, H4, Text, Illustration } from '@adminjs/design-system';
import { useTranslation } from "adminjs/src/frontend/hooks/index";

const api = new ApiClient();

const Card = styled(Box)`
  display: ${({ flex }): string => (flex ? 'flex' : 'block')};
  flex-direction: row;
  color: ${({ theme }): string => theme.colors.grey100};
  text-decoration: none;
  border: 1px solid transparent;
  &:hover {
    border: 1px solid ${({ theme }): string => theme.colors.primary100};
    box-shadow: ${({ theme }): string => theme.shadows.cardHover};
  }
  section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
`;

Card.defaultProps = {
    variant: 'white',
    boxShadow: 'card',
};

const Dashboard = () => {
    const { translateMessage } = useTranslation();
    const [data, setData] = useState({});

    useEffect(() => {
        api.getDashboard().then((response) => {
            setData(response.data);
        })
    }, []);

    if(!data.manager){
        return (
            <div>{translateMessage('reldensLoading')}</div>
        );
    }

    return (
        <Box>
            <Box
                bg="grey100"
                py={30}>
                <Text textAlign="center" color="white">
                    <H2>{translateMessage('reldensTitle')}</H2>
                    <Text opacity={0.8}>{translateMessage('reldensSlogan')}</Text>
                </Text>
            </Box>
            <Box
                my={[18]}
                mx={[0, 0, 0, 'auto']}
                position="relative"
                flex
                flexDirection="row"
                flexWrap="wrap"
                width={[1, 1, 1, 1024]}>
                <Box width={[1, 1, 1 / 2]} p="lg">
                    <Card as="a" flex height={220} target={'_blank'}
                        href="https://discord.gg/HuJMxUY">
                        <Box ml="xl">
                            <H4>{translateMessage('reldensDiscordTitle')}</H4>
                            <Text>{translateMessage('reldensDiscordText')}</Text>
                        </Box>
                    </Card>
                </Box>
                <Box width={[1, 1, 1 / 2]} p="lg">
                    <Card as="a" flex height={220} target={'_blank'}
                        href="https://github.com/damian-pastorini/reldens/issues">
                        <Box flexShrink={0}><Illustration variant="GithubLogo" /></Box>
                        <Box ml="xl">
                            <H4>{translateMessage('reldensGithubTitle')}</H4>
                            <Text>{translateMessage('reldensGithubText')}</Text>
                        </Box>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
};

export default Dashboard;
