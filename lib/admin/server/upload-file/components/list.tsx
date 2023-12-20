// @ts-ignore
import React, { FC } from 'react';
import { ShowPropertyProps } from 'adminjs';

import File from './file';

const List: FC<ShowPropertyProps> = (props) => (<File width={100} {...props} />);

export default List;
