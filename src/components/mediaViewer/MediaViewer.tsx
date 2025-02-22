import React, {
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ApiChat, ApiMessage, ApiUser } from '../../api/types';
import type { AnimationLevel } from '../../types';
import { MediaViewerOrigin } from '../../types';

import { getActions, withGlobal } from '../../global';
import {
  getChatMediaMessageIds,
  isChatAdmin,
  isUserId,
} from '../../global/helpers';
import {
  selectChat,
  selectChatMessage,
  selectChatMessages,
  selectChatScheduledMessages,
  selectCurrentMediaSearch,
  selectTabState,
  selectIsChatWithSelf,
  selectListedIds,
  selectScheduledMessage,
  selectUser,
  selectOutlyingListByMessageId,
} from '../../global/selectors';
import { stopCurrentAudio } from '../../util/audioPlayer';
import captureEscKeyListener from '../../util/captureEscKeyListener';
import { IS_TOUCH_ENV } from '../../util/windowEnvironment';
import { ANIMATION_END_DELAY } from '../../config';
import { MEDIA_VIEWER_MEDIA_QUERY } from '../common/helpers/mediaDimensions';
import {
  disableDirectTextInput,
  enableDirectTextInput,
} from '../../util/directInputManager';
import { animateClosing, animateOpening } from './helpers/ghostAnimation';
import { renderMessageText } from '../common/helpers/renderMessageText';

import useFlag from '../../hooks/useFlag';
import useForceUpdate from '../../hooks/useForceUpdate';
import { dispatchHeavyAnimationEvent } from '../../hooks/useHeavyAnimationCheck';
import { exitPictureInPictureIfNeeded } from '../../hooks/usePictureInPicture';
import usePrevious from '../../hooks/usePrevious';
import { useMediaProps } from './hooks/useMediaProps';
import useAppLayout from '../../hooks/useAppLayout';

import ReportModal from '../common/ReportModal';
import Button from '../ui/Button';
import ShowTransition from '../ui/ShowTransition';
import Transition from '../ui/Transition';
import MediaViewerActions from './MediaViewerActions';
import MediaViewerSlides from './MediaViewerSlides';
import SenderInfo from './SenderInfo';

import './MediaViewer.scss';
import { useTranslation } from 'react-i18next';
import IconSvg from '../ui/IconSvg';

type StateProps = {
  chatId?: string;
  threadId?: number;
  mediaId?: number;
  senderId?: string;
  isChatWithSelf?: boolean;
  canUpdateMedia?: boolean;
  origin?: MediaViewerOrigin;
  avatarOwner?: ApiChat | ApiUser;
  message?: ApiMessage;
  chatMessages?: Record<number, ApiMessage>;
  collectionIds?: number[];
  isHidden?: boolean;
  animationLevel: AnimationLevel;
  shouldSkipHistoryAnimations?: boolean;
};

const ANIMATION_DURATION = 350;

const MediaViewer: FC<StateProps> = ({
  chatId,
  threadId,
  mediaId,
  senderId,
  isChatWithSelf,
  canUpdateMedia,
  origin,
  avatarOwner,
  message,
  chatMessages,
  collectionIds,
  animationLevel,
  isHidden,
  shouldSkipHistoryAnimations,
}) => {
  const {
    openMediaViewer,
    closeMediaViewer,
    openForwardMenu,
    focusMessage,
    toggleChatInfo,
  } = getActions();

  const isOpen = Boolean(avatarOwner || mediaId);
  const { isMobile } = useAppLayout();

  /* Animation */
  const animationKey = useRef<number>();
  const prevSenderId = usePrevious<string | undefined>(senderId);
  const headerAnimation = animationLevel === 2 ? 'slide-fade' : 'none';
  const isGhostAnimation = animationLevel === 2 && !shouldSkipHistoryAnimations;

  /* Controls */
  const [isReportModalOpen, openReportModal, closeReportModal] = useFlag();
  const [zoomLevelChange, setZoomLevelChange] = useState<number>(1);

  const {
    webPagePhoto,
    webPageVideo,
    isVideo,
    actionPhoto,
    isPhoto,
    bestImageData,
    bestData,
    dimensions,
    isGif,
    isFromSharedMedia,
    avatarPhoto,
    fileName,
  } = useMediaProps({
    message,
    avatarOwner,
    mediaId,
    origin,
    delay: isGhostAnimation && ANIMATION_DURATION,
  });

  const canReport = !!avatarPhoto && !isChatWithSelf;
  const isVisible = !isHidden && isOpen;

  /* Navigation */
  const singleMediaId =
    webPagePhoto || webPageVideo || actionPhoto ? mediaId : undefined;

  const mediaIds = useMemo(() => {
    if (singleMediaId) {
      return [singleMediaId];
    } else if (avatarOwner) {
      return avatarOwner.photos?.map((p, i) => i) || [];
    } else {
      return getChatMediaMessageIds(
        chatMessages || {},
        collectionIds || [],
        isFromSharedMedia
      );
    }
  }, [
    singleMediaId,
    avatarOwner,
    chatMessages,
    collectionIds,
    isFromSharedMedia,
  ]);

  const selectedMediaIndex = mediaId ? mediaIds.indexOf(mediaId) : -1;

  if (
    isOpen &&
    (!prevSenderId || prevSenderId !== senderId || !animationKey.current)
  ) {
    animationKey.current = selectedMediaIndex;
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    disableDirectTextInput();

    return enableDirectTextInput;
  }, [isOpen]);

  useEffect(() => {
    if (isVisible) {
      exitPictureInPictureIfNeeded();
    }
  }, [isVisible]);

  useEffect(() => {
    if (isMobile) {
      document.body.classList.toggle('is-media-viewer-open', isOpen);
    }
    // Disable user selection if media viewer is open, to prevent accidental text selection
    if (IS_TOUCH_ENV) {
      document.body.classList.toggle('no-selection', isOpen);
    }
  }, [isMobile, isOpen]);

  const forceUpdate = useForceUpdate();
  useEffect(() => {
    const mql = window.matchMedia(MEDIA_VIEWER_MEDIA_QUERY);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', forceUpdate);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(forceUpdate);
    }

    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', forceUpdate);
      } else if (typeof mql.removeListener === 'function') {
        mql.removeListener(forceUpdate);
      }
    };
  }, [forceUpdate]);

  const prevMessage = usePrevious<ApiMessage | undefined>(message);
  const prevIsHidden = usePrevious<boolean | undefined>(isHidden);
  const prevOrigin = usePrevious(origin);
  const prevMediaId = usePrevious(mediaId);
  const prevAvatarOwner = usePrevious<ApiChat | ApiUser | undefined>(
    avatarOwner
  );
  const prevBestImageData = usePrevious(bestImageData);
  const textParts = message ? renderMessageText(message) : undefined;
  const hasFooter = Boolean(textParts);
  const shouldAnimateOpening = prevIsHidden && prevMediaId !== mediaId;

  useEffect(() => {
    if (
      isGhostAnimation &&
      isOpen &&
      (!prevMessage || shouldAnimateOpening) &&
      !prevAvatarOwner
    ) {
      dispatchHeavyAnimationEvent(ANIMATION_DURATION + ANIMATION_END_DELAY);
      animateOpening(
        hasFooter,
        origin!,
        bestImageData!,
        dimensions,
        isVideo,
        message
      );
    }

    if (isGhostAnimation && !isOpen && (prevMessage || prevAvatarOwner)) {
      dispatchHeavyAnimationEvent(ANIMATION_DURATION + ANIMATION_END_DELAY);
      animateClosing(prevOrigin!, prevBestImageData!, prevMessage || undefined);
    }
  }, [
    isGhostAnimation,
    isOpen,
    shouldAnimateOpening,
    origin,
    prevOrigin,
    message,
    prevMessage,
    prevAvatarOwner,
    bestImageData,
    prevBestImageData,
    dimensions,
    isVideo,
    hasFooter,
  ]);

  const handleClose = useCallback(() => closeMediaViewer(), [closeMediaViewer]);

  const handleFooterClick = useCallback(() => {
    handleClose();

    if (!chatId || !mediaId) return;

    if (isMobile) {
      setTimeout(() => {
        toggleChatInfo({ force: false }, { forceSyncOnIOs: true });
        focusMessage({ chatId, threadId, messageId: mediaId });
      }, ANIMATION_DURATION);
    } else {
      focusMessage({ chatId, threadId, messageId: mediaId });
    }
  }, [
    handleClose,
    isMobile,
    chatId,
    threadId,
    focusMessage,
    toggleChatInfo,
    mediaId,
  ]);

  const handleForward = useCallback(() => {
    openForwardMenu({
      fromChatId: chatId!,
      messageIds: [mediaId!],
    });
  }, [openForwardMenu, chatId, mediaId]);

  const selectMedia = useCallback(
    (id?: number) => {
      openMediaViewer(
        {
          chatId,
          threadId,
          mediaId: id,
          avatarOwnerId: avatarOwner?.id,
          origin: origin!,
        },
        {
          forceOnHeavyAnimation: true,
        }
      );
    },
    [avatarOwner?.id, chatId, openMediaViewer, origin, threadId]
  );

  useEffect(
    () =>
      isOpen
        ? captureEscKeyListener(() => {
            handleClose();
          })
        : undefined,
    [handleClose, isOpen]
  );

  useEffect(() => {
    if (isVideo && !isGif) {
      stopCurrentAudio();
    }
  }, [isGif, isVideo]);

  const getMediaId = useCallback(
    (fromId?: number, direction?: number): number | undefined => {
      if (fromId === undefined) return undefined;
      const index = mediaIds.indexOf(fromId);
      if (
        (direction === -1 && index > 0) ||
        (direction === 1 && index < mediaIds.length - 1)
      ) {
        return mediaIds[index + direction];
      }
      return undefined;
    },
    [mediaIds]
  );

  const handleBeforeDelete = useCallback(() => {
    if (mediaIds.length <= 1) {
      handleClose();
      return;
    }
    let index = mediaId ? mediaIds.indexOf(mediaId) : -1;
    // Before deleting, select previous media or the first one
    index = index > 0 ? index - 1 : 0;
    selectMedia(mediaIds[index]);
  }, [handleClose, mediaId, mediaIds, selectMedia]);

  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir(i18n.language) === 'rtl';

  function renderSenderInfo() {
    return (
      <div className='media-viewer-head-left'>
        <Button
          round
          size='smaller'
          color='translucent'
          onClick={handleClose}
          ariaLabel={String(t('Back'))}
        >
          <IconSvg name='arrow-left' />
        </Button>
        {/* {avatarOwner ? (
          <SenderInfo
            key={mediaId}
            chatId={avatarOwner.id}
            isAvatar
            isFallbackAvatar={
              isUserId(avatarOwner.id) &&
              (avatarOwner as ApiUser).photos?.[mediaId!].id ===
                (avatarOwner as ApiUser).fullInfo?.fallbackPhoto?.id
            }
          />
        ) : (
          <SenderInfo key={mediaId} chatId={chatId} messageId={mediaId} />
        )} */}
      </div>
    );
  }

  return (
    <ShowTransition
      id='MediaViewer'
      isOpen={isOpen}
      isHidden={isHidden}
      shouldAnimateFirstRender
      noCloseTransition={shouldSkipHistoryAnimations}
    >
      <div className='media-viewer-head' dir={isRtl ? 'rtl' : undefined}>
        {isMobile && (
          <Button
            className='media-viewer-close'
            round
            size='smaller'
            color='translucent-white'
            ariaLabel={t('Close')}
            onClick={handleClose}
          >
            <i className='icon-close' />
          </Button>
        )}
        <Transition activeKey={animationKey.current!} name={headerAnimation}>
          {renderSenderInfo()}
        </Transition>
        <MediaViewerActions
          mediaData={bestData}
          isVideo={isVideo}
          message={message}
          canUpdateMedia={canUpdateMedia}
          avatarPhoto={avatarPhoto}
          avatarOwner={avatarOwner}
          fileName={fileName}
          canReport={canReport}
          selectMedia={selectMedia}
          onBeforeDelete={handleBeforeDelete}
          onReport={openReportModal}
          onCloseMediaViewer={handleClose}
          onForward={handleForward}
          zoomLevelChange={zoomLevelChange}
          setZoomLevelChange={setZoomLevelChange}
        />
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={closeReportModal}
          subject='media'
          photo={avatarPhoto}
          chatId={avatarOwner?.id}
        />
      </div>
      <MediaViewerSlides
        mediaId={mediaId}
        getMediaId={getMediaId}
        chatId={chatId}
        isPhoto={isPhoto}
        isGif={isGif}
        threadId={threadId}
        avatarOwnerId={avatarOwner?.id}
        origin={origin}
        isOpen={isOpen}
        hasFooter={hasFooter}
        zoomLevelChange={zoomLevelChange}
        isVideo={isVideo}
        animationLevel={animationLevel}
        onClose={handleClose}
        selectMedia={selectMedia}
        isHidden={isHidden}
        onFooterClick={handleFooterClick}
      />
    </ShowTransition>
  );
};

export default memo(
  withGlobal((global): StateProps => {
    const { mediaViewer, shouldSkipHistoryAnimations } = selectTabState(global);
    const { chatId, threadId, mediaId, avatarOwnerId, origin, isHidden } =
      mediaViewer;
    const { animationLevel } = global.settings.byKey;

    const { currentUserId } = global;
    let isChatWithSelf = !!chatId && selectIsChatWithSelf(global, chatId);

    if (origin === MediaViewerOrigin.SearchResult) {
      if (!(chatId && mediaId)) {
        return { animationLevel, shouldSkipHistoryAnimations };
      }

      const message = selectChatMessage(global, chatId, mediaId);
      if (!message) {
        return { animationLevel, shouldSkipHistoryAnimations };
      }

      return {
        chatId,
        mediaId,
        senderId: message.senderId,
        isChatWithSelf,
        origin,
        message,
        animationLevel,
        isHidden,
        shouldSkipHistoryAnimations,
      };
    }

    if (avatarOwnerId) {
      const user = selectUser(global, avatarOwnerId);
      const chat = selectChat(global, avatarOwnerId);
      let canUpdateMedia = false;
      if (user) {
        canUpdateMedia = avatarOwnerId === currentUserId;
      } else if (chat) {
        canUpdateMedia = isChatAdmin(chat);
      }

      isChatWithSelf = selectIsChatWithSelf(global, avatarOwnerId);

      return {
        mediaId,
        senderId: avatarOwnerId,
        avatarOwner: user || chat,
        isChatWithSelf,
        canUpdateMedia,
        animationLevel,
        origin,
        shouldSkipHistoryAnimations,
        isHidden,
      };
    }

    if (!(chatId && threadId && mediaId)) {
      return { animationLevel, shouldSkipHistoryAnimations };
    }

    let message: ApiMessage | undefined;
    if (
      origin &&
      [
        MediaViewerOrigin.ScheduledAlbum,
        MediaViewerOrigin.ScheduledInline,
      ].includes(origin)
    ) {
      message = selectScheduledMessage(global, chatId, mediaId);
    } else {
      message = selectChatMessage(global, chatId, mediaId);
    }

    if (!message) {
      return { animationLevel, shouldSkipHistoryAnimations };
    }

    let chatMessages: Record<number, ApiMessage> | undefined;

    if (
      origin &&
      [
        MediaViewerOrigin.ScheduledAlbum,
        MediaViewerOrigin.ScheduledInline,
      ].includes(origin)
    ) {
      chatMessages = selectChatScheduledMessages(global, chatId);
    } else {
      chatMessages = selectChatMessages(global, chatId);
    }
    let collectionIds: number[] | undefined;

    if (
      origin === MediaViewerOrigin.Inline ||
      origin === MediaViewerOrigin.Album
    ) {
      collectionIds =
        selectOutlyingListByMessageId(global, chatId, threadId, message.id) ||
        selectListedIds(global, chatId, threadId);
    } else if (origin === MediaViewerOrigin.SharedMedia) {
      const currentSearch = selectCurrentMediaSearch(global);
      const { foundIds } =
        (currentSearch &&
          currentSearch.resultsByType &&
          currentSearch.resultsByType.media) ||
        {};
      collectionIds = foundIds;
    }

    return {
      chatId,
      threadId,
      mediaId,
      senderId: message.senderId,
      isChatWithSelf,
      origin,
      message,
      chatMessages,
      collectionIds,
      animationLevel,
      isHidden,
      shouldSkipHistoryAnimations,
    };
  })(MediaViewer)
);
