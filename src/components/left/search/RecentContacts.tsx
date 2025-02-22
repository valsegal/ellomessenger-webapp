import React, { FC, useEffect, useCallback, useRef, memo } from 'react';
import { getActions, withGlobal } from '../../../global';

import type { ApiUser } from '../../../api/types';
import type { AnimationLevel } from '../../../types';

import { getUserFirstOrLastName } from '../../../global/helpers';
import renderText from '../../common/helpers/renderText';
import { throttle } from '../../../util/schedulers';
import useHorizontalScroll from '../../../hooks/useHorizontalScroll';
import useLang from '../../../hooks/useLang';

import Avatar from '../../common/Avatar';
import Button from '../../ui/Button';
import LeftSearchResultChat from './LeftSearchResultChat';

import './RecentContacts.scss';
import { useTranslation } from 'react-i18next';

type OwnProps = {
  onReset: () => void;
};

type StateProps = {
  topUserIds?: string[];
  usersById: Record<string, ApiUser>;
  recentlyFoundChatIds?: string[];
  animationLevel: AnimationLevel;
};

const SEARCH_CLOSE_TIMEOUT_MS = 250;
const NBSP = '\u00A0';

const runThrottled = throttle((cb) => cb(), 60000, true);

const RecentContacts: FC<OwnProps & StateProps> = ({
  topUserIds,
  usersById,
  recentlyFoundChatIds,
  onReset,
}) => {
  const {
    loadTopUsers,
    openChat,
    addRecentlyFoundChatId,
    clearRecentlyFoundChats,
  } = getActions();

  // eslint-disable-next-line no-null/no-null
  const topUsersRef = useRef<HTMLDivElement>(null);

  // Due to the parent Transition, this component never gets unmounted,
  // that's why we use throttled API call on every update.
  useEffect(() => {
    runThrottled(() => {
      loadTopUsers();
    });
  }, [loadTopUsers]);

  useHorizontalScroll(topUsersRef, !topUserIds);

  const handleClick = useCallback(
    (id: string) => {
      openChat({ id, shouldReplaceHistory: true });
      onReset();
      setTimeout(() => {
        addRecentlyFoundChatId({ id });
      }, SEARCH_CLOSE_TIMEOUT_MS);
    },
    [openChat, addRecentlyFoundChatId, onReset]
  );

  const handleClearRecentlyFoundChats = useCallback(() => {
    clearRecentlyFoundChats();
  }, [clearRecentlyFoundChats]);

  const { i18n, t } = useTranslation();
  const isRtl = i18n.dir(i18n.language) === 'rtl';

  return (
    <div className='RecentContacts custom-scroll'>
      {topUserIds && (
        <div className='top-peers-section' dir={isRtl ? 'rtl' : undefined}>
          <div ref={topUsersRef} className='top-peers no-selection'>
            {topUserIds.map((userId) => (
              <div
                className='top-peer-item'
                onClick={() => handleClick(userId)}
                dir={isRtl ? 'rtl' : undefined}
              >
                <Avatar peer={usersById[userId]} withVideo />
                <div className='top-peer-name'>
                  {renderText(
                    getUserFirstOrLastName(usersById[userId]) || NBSP
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {recentlyFoundChatIds && (
        <div className='search-section pt-1'>
          <h3
            className='section-heading mt-0 recent-chats-header'
            dir={isRtl ? 'rtl' : undefined}
          >
            {t('Recent')}

            <Button
              round
              size='smaller'
              color='translucent'
              ariaLabel='Clear recent chats'
              onClick={handleClearRecentlyFoundChats}
              isRtl={isRtl}
            >
              <i className='icon-close' />
            </Button>
          </h3>
          {recentlyFoundChatIds.map((id) => (
            <LeftSearchResultChat chatId={id} onClick={handleClick} />
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(
  withGlobal<OwnProps>((global): StateProps => {
    const { userIds: topUserIds } = global.topPeers;
    const usersById = global.users.byId;
    const { recentlyFoundChatIds } = global;
    const { animationLevel } = global.settings.byKey;

    return {
      topUserIds,
      usersById,
      recentlyFoundChatIds,
      animationLevel,
    };
  })(RecentContacts)
);
