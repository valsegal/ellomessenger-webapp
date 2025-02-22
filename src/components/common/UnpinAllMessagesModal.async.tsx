import type { FC } from 'react';
import React, { memo } from 'react';
import type { OwnProps } from './UnpinAllMessagesModal';
import { Bundles } from '../../util/moduleLoader';

import useModuleLoader from '../../hooks/useModuleLoader';

const UnpinAllMessagesModalAsync: FC<OwnProps> = (props) => {
  const { isOpen } = props;
  const UnpinAllMessagesModal = useModuleLoader(
    Bundles.Extra,
    'UnpinAllMessagesModal',
    !isOpen
  );

  // eslint-disable-next-line react/jsx-props-no-spreading
  return UnpinAllMessagesModal ? (
    <UnpinAllMessagesModal {...props} />
  ) : undefined;
};

export default memo(UnpinAllMessagesModalAsync);
