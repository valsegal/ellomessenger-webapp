import type { FC } from 'react';
import React, { memo } from 'react';

import type { OwnProps } from './RatePhoneCallModal';
import { Bundles } from '../../../util/moduleLoader';

import useModuleLoader from '../../../hooks/useModuleLoader';

const RatePhoneCallModalAsync: FC<OwnProps> = (props) => {
  const { isOpen } = props;
  const RatePhoneCallModal = useModuleLoader(
    Bundles.Calls,
    'RatePhoneCallModal',
    !isOpen
  );

  // eslint-disable-next-line react/jsx-props-no-spreading
  return RatePhoneCallModal ? <RatePhoneCallModal {...props} /> : undefined;
};

export default memo(RatePhoneCallModalAsync);
