import React, { FC, memo, useCallback, useMemo, useState } from 'react';
import { getActions } from '../../../global';

import type { IAnchorPosition, ISettings, ThreadId } from '../../../types';
import type { ApiAttachBot } from '../../../api/types';

import useFlag from '../../../hooks/useFlag';

import Portal from '../../ui/Portal';
import Menu from '../../ui/Menu';
import MenuItem from '../../ui/MenuItem';
import AttachBotIcon from './AttachBotIcon';
import { useTranslation } from 'react-i18next';

type OwnProps = {
  bot: ApiAttachBot;
  theme: ISettings['theme'];
  chatId: string;
  threadId?: ThreadId;
  onMenuOpened: VoidFunction;
  onMenuClosed: VoidFunction;
};

const AttachBotItem: FC<OwnProps> = ({
  bot,
  theme,
  chatId,
  threadId,
  onMenuOpened,
  onMenuClosed,
}) => {
  const { callAttachBot, toggleAttachBot } = getActions();

  const { t } = useTranslation();

  const icon = useMemo(() => {
    return bot.icons.find(({ name }) => name === 'default_static')?.document;
  }, [bot.icons]);

  const [isMenuOpen, openMenu, closeMenu] = useFlag();
  const [menuPosition, setMenuPosition] = useState<IAnchorPosition | undefined>(
    undefined
  );

  const handleContextMenu = useCallback(
    (e: React.UIEvent) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPosition({ x: rect.right, y: rect.bottom });
      onMenuOpened();
      openMenu();
    },
    [onMenuOpened, openMenu]
  );

  const handleCloseMenu = useCallback(() => {
    closeMenu();
    onMenuClosed();
  }, [closeMenu, onMenuClosed]);

  const handleCloseAnimationEnd = useCallback(() => {
    setMenuPosition(undefined);
  }, []);

  const handleRemoveBot = useCallback(() => {
    toggleAttachBot({
      botId: bot.id,
      isEnabled: false,
    });
  }, [bot.id, toggleAttachBot]);

  return (
    <MenuItem
      key={bot.id}
      customIcon={icon && <AttachBotIcon icon={icon} theme={theme} />}
      icon={!icon ? 'bots' : undefined}
      // eslint-disable-next-line react/jsx-no-bind
      onClick={() =>
        callAttachBot({
          bot,
          chatId,
          threadId,
        })
      }
      onContextMenu={handleContextMenu}
    >
      {bot.shortName}
      {menuPosition && (
        <Portal>
          <Menu
            isOpen={isMenuOpen}
            positionX='right'
            style={{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }}
            className='bot-attach-context-menu'
            autoClose
            onClose={handleCloseMenu}
            onCloseAnimationEnd={handleCloseAnimationEnd}
          >
            <MenuItem icon='stop' destructive onClick={handleRemoveBot}>
              {t('WebApp.RemoveBot')}
            </MenuItem>
          </Menu>
        </Portal>
      )}
    </MenuItem>
  );
};

export default memo(AttachBotItem);
