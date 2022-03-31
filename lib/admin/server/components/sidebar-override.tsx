// @ts-ignore
import React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { Box, cssClass, themeGet } from '@adminjs/design-system';
import { BrandingOptions } from 'adminjs/src/adminjs-options.interface';
import { ResourceJSON, PageJSON } from 'adminjs/src/frontend/interfaces';
import SidebarBranding from 'adminjs/src/frontend/components/app/sidebar/sidebar-branding';
import SidebarPages from './sidebar-pages';
import { ReduxState } from 'adminjs/src/frontend/store/store';
import SidebarFooter from 'adminjs/src/frontend/components/app/sidebar//sidebar-footer';

import SidebarResourceSection from 'adminjs/src/frontend/components/app/sidebar//sidebar-resource-section';

type Props = {
    isVisible: boolean;
};

const StyledSidebar = styled(Box)`
  transition: left 0.3s;
  top: 0;
  bottom: 0;
  flex-shrink: 0;
  overflow-y: auto;

  &.hidden {
    left: -${themeGet('sizes', 'sidebarWidth')};
  }

  &.visible {
    left: 0;
  }
`;

StyledSidebar.defaultProps = {
    position: ['absolute', 'absolute', 'absolute', 'absolute', 'inherit'],
    width: 'sidebarWidth',
    borderRight: 'default',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    bg: 'white',
};

const SidebarOverride: React.FC<Props> = (props) => {
    const {isVisible} = props;
    const [branding, resources, pages]: [
        BrandingOptions,
        ResourceJSON[],
        PageJSON[]
    ] = useSelector((state: ReduxState) => [
        state.branding,
        state.resources,
        state.pages,
    ]);

    // @ts-ignore
    return (
        <StyledSidebar className={isVisible ? 'visible' : 'hidden'}>
            <SidebarBranding branding={branding}/>
            <Box flexGrow={1} className={cssClass('Resources')}>
                <SidebarResourceSection resources={resources}/>
                <SidebarPages pages={pages}/>
            </Box>
            {branding?.softwareBrothers && <SidebarFooter/>}
        </StyledSidebar>
    );
};

export {SidebarOverride};
export default SidebarOverride;
