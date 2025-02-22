import type { FC } from 'react';
import React, { memo } from 'react';
import buildClassName from '../../../util/buildClassName';

import './ChatCallStatus.scss';

type OwnProps = {
  isSelected?: boolean;
  isActive?: boolean;
  isMobile?: boolean;
};

const ChatCallStatus: FC<OwnProps> = ({ isSelected, isActive, isMobile }) => {
  return (
    <div
      className={buildClassName(
        'ChatCallStatus',
        isActive && 'active',
        isSelected && !isMobile && 'selected'
      )}
    >
      <div className='indicator'>
        <div />
        <div />
        <div />
      </div>
    </div>
  );
};

export default memo(ChatCallStatus);
