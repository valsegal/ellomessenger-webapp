import React, { memo, useCallback, useEffect } from 'react';
import { getActions } from '../../global';

import type { FC } from 'react';
import type { TabState } from '../../global/types';

import useLang from '../../hooks/useLang';
import useFlag from '../../hooks/useFlag';

import RecipientPicker from '../common/RecipientPicker';

export type OwnProps = {
  requestedAttachBotInChat?: TabState['requestedAttachBotInChat'];
};

const AttachBotRecipientPicker: FC<OwnProps> = ({
  requestedAttachBotInChat,
}) => {
  const { cancelAttachBotInChat, callAttachBot } = getActions();
  const lang = useLang();

  const isOpen = Boolean(requestedAttachBotInChat);
  const [isShown, markIsShown, unmarkIsShown] = useFlag();
  useEffect(() => {
    if (isOpen) {
      markIsShown();
    }
  }, [isOpen, markIsShown]);

  const { bot, filter, startParam } = requestedAttachBotInChat || {};

  const handlePeerRecipient = useCallback(
    (recipientId: string) => {
      callAttachBot({ bot: bot!, chatId: recipientId, startParam });
      cancelAttachBotInChat();
    },
    [bot, callAttachBot, cancelAttachBotInChat, startParam]
  );

  if (!isOpen && !isShown) {
    return undefined;
  }

  return (
    <RecipientPicker
      isOpen={isOpen}
      searchPlaceholder={lang('Search')}
      filter={filter}
      onSelectRecipient={handlePeerRecipient}
      onClose={cancelAttachBotInChat}
      onCloseAnimationEnd={unmarkIsShown}
    />
  );
};

export default memo(AttachBotRecipientPicker);
