import React, { memo, useCallback, useRef } from 'react';
import { getActions, withGlobal } from '../../global';

import type { FC } from 'react';
import type { ApiSticker, ApiStickerSet } from '../../api/types';

import buildClassName from '../../util/buildClassName';

import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import usePrevious from '../../hooks/usePrevious';
import useLang from '../../hooks/useLang';

import Modal from '../ui/Modal';
import StickerSetCard from './StickerSetCard';

import styles from './CustomEmojiSetsModal.module.scss';

export type OwnProps = {
  customEmojiSetIds?: string[];
  onClose: () => void;
};

type StateProps = {
  customEmojiSets?: ApiStickerSet[];
};

const CustomEmojiSetsModal: FC<OwnProps & StateProps> = ({
  customEmojiSets,
  onClose,
}) => {
  const { openStickerSet } = getActions();
  const lang = useLang();
  const customEmojiModalRef = useRef<HTMLDivElement>(null);
  const { observe: observeIntersectionForCovers } = useIntersectionObserver({
    rootRef: customEmojiModalRef,
    isDisabled: !customEmojiSets,
  });

  const prevCustomEmojiSets = usePrevious(customEmojiSets);
  const renderingCustomEmojiSets = customEmojiSets || prevCustomEmojiSets;

  const handleSetClick = useCallback(
    (sticker: ApiSticker) => {
      openStickerSet({
        stickerSetInfo: sticker.stickerSetInfo,
      });
    },
    [openStickerSet]
  );

  return (
    <Modal
      isOpen={Boolean(customEmojiSets)}
      className={styles.root}
      onClose={onClose}
      hasCloseButton
      title={lang('lng_custom_emoji_used_sets')}
    >
      <div
        className={buildClassName(styles.sets, 'custom-scroll')}
        ref={customEmojiModalRef}
        teactFastList
      >
        {renderingCustomEmojiSets?.map((customEmojiSet) => (
          <StickerSetCard
            key={customEmojiSet.id}
            className={styles.setCard}
            stickerSet={customEmojiSet}
            onClick={handleSetClick}
            observeIntersection={observeIntersectionForCovers}
          />
        ))}
      </div>
    </Modal>
  );
};

export default memo(
  withGlobal<OwnProps>((global, { customEmojiSetIds }): StateProps => {
    const customEmojiSets = customEmojiSetIds?.map(
      (id) => global.stickers.setsById[id]
    );

    return {
      customEmojiSets,
    };
  })(CustomEmojiSetsModal)
);
