import React, { FC, memo, useCallback, useEffect, useRef } from 'react';
import { getActions, withGlobal } from '../../../global';

import type { ApiSticker } from '../../../api/types';
import type { GlobalActions } from '../../../global';

import { COMPOSER_EMOJI_SIZE_PICKER } from '../../../config';
import {
  selectIsChatWithSelf,
  selectIsCurrentUserPremium,
} from '../../../global/selectors';
import captureEscKeyListener from '../../../util/captureEscKeyListener';

import { useIntersectionObserver } from '../../../hooks/useIntersectionObserver';
import useShowTransition from '../../../hooks/useShowTransition';
import usePrevious from '../../../hooks/usePrevious';
import useHorizontalScroll from '../../../hooks/useHorizontalScroll';

import Loading from '../../ui/Loading';
import StickerButton from '../../common/StickerButton';

import styles from './CustomEmojiTooltip.module.scss';
import classNames from 'classnames';

export type OwnProps = {
  chatId: string;
  isOpen: boolean;
  addRecentCustomEmoji: GlobalActions['addRecentCustomEmoji'];
  onCustomEmojiSelect: (customEmoji: ApiSticker) => void;
  onClose: NoneToVoidFunction;
};

type StateProps = {
  customEmoji?: ApiSticker[];
  isSavedMessages?: boolean;
  isCurrentUserPremium?: boolean;
};

const INTERSECTION_THROTTLE = 200;

const CustomEmojiTooltip: FC<OwnProps & StateProps> = ({
  isOpen,
  addRecentCustomEmoji,
  onCustomEmojiSelect,
  onClose,
  customEmoji,
  isSavedMessages,
  isCurrentUserPremium,
}) => {
  const { clearCustomEmojiForEmoji } = getActions();

  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldRender, transitionClassNames } = useShowTransition(
    isOpen,
    undefined,
    undefined,
    false
  );
  const prevStickers = usePrevious(customEmoji, true);
  const displayedStickers = customEmoji || prevStickers;

  useHorizontalScroll(containerRef);

  const { observe: observeIntersection } = useIntersectionObserver({
    rootRef: containerRef,
    throttleMs: INTERSECTION_THROTTLE,
    isDisabled: !isOpen,
  });

  useEffect(
    () => (isOpen ? captureEscKeyListener(onClose) : undefined),
    [isOpen, onClose]
  );

  const handleCustomEmojiSelect = useCallback(
    (arg: ApiSticker) => {
      if (!isOpen) return;
      onCustomEmojiSelect(arg);
      addRecentCustomEmoji({
        documentId: arg.id,
      });
      clearCustomEmojiForEmoji();
    },
    [
      addRecentCustomEmoji,
      clearCustomEmojiForEmoji,
      isOpen,
      onCustomEmojiSelect,
    ]
  );

  const className = classNames(
    styles.root,
    'composer-tooltip custom-scroll-x',
    transitionClassNames,
    !displayedStickers?.length && styles.hidden
  );

  return (
    <div ref={containerRef} className={className}>
      {shouldRender && displayedStickers ? (
        displayedStickers.map((sticker) => (
          <StickerButton
            key={sticker.id}
            sticker={sticker}
            className={styles.emojiButton}
            size={COMPOSER_EMOJI_SIZE_PICKER}
            observeIntersection={observeIntersection}
            onClick={handleCustomEmojiSelect}
            clickArg={sticker}
            isSavedMessages={isSavedMessages}
            canViewSet
            isCurrentUserPremium={isCurrentUserPremium}
          />
        ))
      ) : shouldRender ? (
        <Loading />
      ) : undefined}
    </div>
  );
};

export default memo(
  withGlobal<OwnProps>((global, { chatId }): StateProps => {
    const { stickers: customEmoji } = global.customEmojis.forEmoji;
    const isSavedMessages = selectIsChatWithSelf(global, chatId);
    const isCurrentUserPremium = selectIsCurrentUserPremium(global);

    return { customEmoji, isSavedMessages, isCurrentUserPremium };
  })(CustomEmojiTooltip)
);
