import type { FC } from 'react';
import React, { memo } from 'react';
import type { OwnProps } from './SendAsMenu';
import { Bundles } from '../../../util/moduleLoader';

import useModuleLoader from '../../../hooks/useModuleLoader';

const SendAsMenuAsync: FC<OwnProps> = (props) => {
  const { isOpen } = props;
  const SendAsMenu = useModuleLoader(Bundles.Extra, 'SendAsMenu', !isOpen);

  // eslint-disable-next-line react/jsx-props-no-spreading
  return SendAsMenu ? <SendAsMenu {...props} /> : undefined;
};

export default memo(SendAsMenuAsync);
