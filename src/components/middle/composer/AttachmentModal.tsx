import React, {
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getActions, withGlobal } from '../../../global';

import type {
  ApiAttachment,
  ApiChatMember,
  ApiSticker,
} from '../../../api/types';
import type { GlobalState } from '../../../global/types';
import type { Signal } from '../../../util/signals';

import {
  BASE_EMOJI_KEYWORD_LANG,
  EDITABLE_INPUT_MODAL_ID,
  GIF_MIME_TYPE,
  SUPPORTED_AUDIO_CONTENT_TYPES,
  SUPPORTED_IMAGE_CONTENT_TYPES,
  SUPPORTED_VIDEO_CONTENT_TYPES,
} from '../../../config';
import captureEscKeyListener from '../../../util/captureEscKeyListener';
import getFilesFromDataTransferItems from './helpers/getFilesFromDataTransferItems';
import { getHtmlTextLength } from './helpers/getHtmlTextLength';
import { selectChat, selectIsChatWithSelf } from '../../../global/selectors';
import { selectCurrentLimit } from '../../../global/selectors/limits';
import { openSystemFilesDialog } from '../../../util/systemFilesDialog';
import buildClassName from '../../../util/buildClassName';
import { validateFiles } from '../../../util/files';

import usePrevious from '../../../hooks/usePrevious';
import useMentionTooltip from './hooks/useMentionTooltip';
import useEmojiTooltip from './hooks/useEmojiTooltip';
import useFlag from '../../../hooks/useFlag';
import useContextMenuHandlers from '../../../hooks/useContextMenuHandlers';
import useCustomEmojiTooltip from './hooks/useCustomEmojiTooltip';
import useAppLayout from '../../../hooks/useAppLayout';
import useScrolledState from '../../../hooks/useScrolledState';
import useGetSelectionRange from '../../../hooks/useGetSelectionRange';
import useDerivedState from '../../../hooks/useDerivedState';

import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import MessageInput from './MessageInput';
import MentionTooltip from './MentionTooltip';
import EmojiTooltip from './EmojiTooltip.async';
import CustomSendMenu from './CustomSendMenu.async';
import CustomEmojiTooltip from './CustomEmojiTooltip.async';
import AttachmentModalItem from './AttachmentModalItem';
import DropdownMenu from '../../ui/DropdownMenu';
import MenuItem from '../../ui/MenuItem';
import SymbolMenuButton from './SymbolMenuButton';

import styles from './AttachmentModal.module.scss';
import { useTranslation } from 'react-i18next';
import IconSvg from '../../ui/IconSvg';
import { ThreadId } from '../../../types';

export type OwnProps = {
  chatId: string;
  threadId: ThreadId;
  attachments: ApiAttachment[];
  getHtml: Signal<string>;
  canShowCustomSendMenu?: boolean;
  isReady: boolean;
  shouldSchedule?: boolean;
  shouldSuggestCompression?: boolean;
  shouldForceCompression?: boolean;
  shouldForceAsFile?: boolean;
  isForCurrentMessageList?: boolean;
  onCaptionUpdate: (html: string) => void;
  onSend: (sendCompressed: boolean, sendGrouped: boolean) => void;
  onFileAppend: (files: File[], isSpoiler?: boolean) => void;
  onAttachmentsUpdate: (attachments: ApiAttachment[]) => void;
  onClear: NoneToVoidFunction;
  onSendSilent: (sendCompressed: boolean, sendGrouped: boolean) => void;
  onSendScheduled: (sendCompressed: boolean, sendGrouped: boolean) => void;
  onCustomEmojiSelect: (emoji: ApiSticker) => void;
  onRemoveSymbol: VoidFunction;
  onEmojiSelect: (emoji: string) => void;
};

type StateProps = {
  isChatWithSelf?: boolean;
  currentUserId?: string;
  groupChatMembers?: ApiChatMember[];
  recentEmojis: string[];
  baseEmojiKeywords?: Record<string, string[]>;
  emojiKeywords?: Record<string, string[]>;
  shouldSuggestCustomEmoji?: boolean;
  customEmojiForEmoji?: ApiSticker[];
  captionLimit: number;
  attachmentSettings: GlobalState['attachmentSettings'];
};

const ATTACHMENT_MODAL_INPUT_ID = 'caption-input-text';
const DROP_LEAVE_TIMEOUT_MS = 150;
const MAX_LEFT_CHARS_TO_SHOW = 100;

const AttachmentModal: FC<OwnProps & StateProps> = ({
  chatId,
  threadId,
  attachments,
  getHtml,
  canShowCustomSendMenu,
  captionLimit,
  isReady,
  isChatWithSelf,
  currentUserId,
  groupChatMembers,
  recentEmojis,
  baseEmojiKeywords,
  emojiKeywords,
  shouldSchedule,
  shouldSuggestCustomEmoji,
  customEmojiForEmoji,
  attachmentSettings,
  shouldSuggestCompression,
  shouldForceCompression,
  shouldForceAsFile,
  isForCurrentMessageList,
  onAttachmentsUpdate,
  onCaptionUpdate,
  onSend,
  onFileAppend,
  onClear,
  onSendSilent,
  onSendScheduled,
  onCustomEmojiSelect,
  onRemoveSymbol,
  onEmojiSelect,
}) => {
  const { addRecentCustomEmoji, addRecentEmoji, updateAttachmentSettings } =
    getActions();

  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir(i18n.language) === 'rtl';

  const mainButtonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  const hideTimeoutRef = useRef<number>();
  const prevAttachments = usePrevious(attachments);
  const renderingAttachments = attachments.length
    ? attachments
    : prevAttachments;
  const { isMobile } = useAppLayout();

  const [isSymbolMenuOpen, openSymbolMenu, closeSymbolMenu] = useFlag();

  const [shouldSendCompressed, setShouldSendCompressed] = useState(
    shouldSuggestCompression ?? attachmentSettings.shouldCompress
  );
  const isSendingCompressed = Boolean(
    (shouldSendCompressed || shouldForceCompression) && !shouldForceAsFile
  );
  const [shouldSendGrouped, setShouldSendGrouped] = useState(
    attachmentSettings.shouldSendGrouped
  );

  const {
    handleScroll: handleAttachmentsScroll,
    isAtBeginning: areAttachmentsNotScrolled,
    isAtEnd: areAttachmentsScrolledToBottom,
  } = useScrolledState();

  const {
    handleScroll: handleCaptionScroll,
    isAtBeginning: isCaptionNotScrolled,
  } = useScrolledState();

  const isOpen = Boolean(attachments.length);
  const renderingIsOpen = Boolean(renderingAttachments?.length);
  const [isHovered, markHovered, unmarkHovered] = useFlag();

  useEffect(() => {
    if (!isOpen) {
      closeSymbolMenu();
    }
  }, [closeSymbolMenu, isOpen]);

  const [hasMedia, hasOnlyMedia] = useMemo(() => {
    const onlyMedia = Boolean(
      renderingAttachments?.every((a) => a.quick || a.audio)
    );
    if (onlyMedia) return [true, true];
    const oneMedia = Boolean(
      renderingAttachments?.some((a) => a.quick || a.audio)
    );
    return [oneMedia, false];
  }, [renderingAttachments]);

  const [hasSpoiler, isEverySpoiler] = useMemo(() => {
    const areAllSpoilers = Boolean(
      renderingAttachments?.every((a) => a.shouldSendAsSpoiler)
    );
    if (areAllSpoilers) return [true, true];
    const hasOneSpoiler = Boolean(
      renderingAttachments?.some((a) => a.shouldSendAsSpoiler)
    );
    return [hasOneSpoiler, false];
  }, [renderingAttachments]);

  const getSelectionRange = useGetSelectionRange(`#${EDITABLE_INPUT_MODAL_ID}`);

  const {
    isEmojiTooltipOpen,
    filteredEmojis,
    filteredCustomEmojis,
    insertEmoji,
    closeEmojiTooltip,
  } = useEmojiTooltip(
    Boolean(isReady && isForCurrentMessageList && renderingIsOpen),
    getHtml,
    onCaptionUpdate,
    EDITABLE_INPUT_MODAL_ID,
    recentEmojis,
    baseEmojiKeywords,
    emojiKeywords
  );

  const {
    isCustomEmojiTooltipOpen,
    insertCustomEmoji,
    closeCustomEmojiTooltip,
  } = useCustomEmojiTooltip(
    Boolean(
      isReady &&
        isForCurrentMessageList &&
        renderingIsOpen &&
        shouldSuggestCustomEmoji
    ),
    getHtml,
    onCaptionUpdate,
    getSelectionRange,
    inputRef,
    customEmojiForEmoji
  );

  const {
    isMentionTooltipOpen,
    closeMentionTooltip,
    insertMention,
    mentionFilteredUsers,
  } = useMentionTooltip(
    Boolean(isReady && isForCurrentMessageList && renderingIsOpen),
    getHtml,
    onCaptionUpdate,
    getSelectionRange,
    inputRef,
    groupChatMembers,
    undefined,
    currentUserId
  );

  useEffect(
    () => (isOpen ? captureEscKeyListener(onClear) : undefined),
    [isOpen, onClear]
  );

  useEffect(() => {
    if (isOpen) {
      setShouldSendCompressed(
        shouldSuggestCompression ?? attachmentSettings.shouldCompress
      );
      setShouldSendGrouped(attachmentSettings.shouldSendGrouped);
    }
  }, [attachmentSettings, isOpen, shouldSuggestCompression]);

  const {
    isContextMenuOpen: isCustomSendMenuOpen,
    handleContextMenu,
    handleContextMenuClose,
    handleContextMenuHide,
  } = useContextMenuHandlers(mainButtonRef, !canShowCustomSendMenu || !isOpen);

  const sendAttachments = useCallback(
    (isSilent?: boolean, shouldSendScheduled?: boolean) => {
      if (isOpen) {
        const send =
          shouldSchedule || shouldSendScheduled
            ? onSendScheduled
            : isSilent
            ? onSendSilent
            : onSend;
        send(isSendingCompressed, shouldSendGrouped);
        updateAttachmentSettings({
          shouldCompress: isSendingCompressed,
          shouldSendGrouped,
        });
      }
    },
    [
      isOpen,
      shouldSchedule,
      onSendScheduled,
      onSendSilent,
      onSend,
      isSendingCompressed,
      shouldSendGrouped,
      updateAttachmentSettings,
    ]
  );

  const handleSendSilent = useCallback(() => {
    sendAttachments(true);
  }, [sendAttachments]);

  const handleSendClick = useCallback(() => {
    sendAttachments();
  }, [sendAttachments]);

  const handleScheduleClick = useCallback(() => {
    sendAttachments(false, true);
  }, [sendAttachments]);

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    const { relatedTarget: toTarget, target: fromTarget } = e;

    // Esc button pressed during drag event
    if (
      (fromTarget as HTMLDivElement).matches(`.${styles.dropTarget}`) &&
      !toTarget
    ) {
      hideTimeoutRef.current = window.setTimeout(
        unmarkHovered,
        DROP_LEAVE_TIMEOUT_MS
      );
    }

    // Prevent DragLeave event from firing when the pointer moves inside the AttachmentModal drop target
    if (
      fromTarget &&
      (fromTarget as HTMLElement).closest(`.${styles.hovered}`)
    ) {
      return;
    }

    if (toTarget) {
      e.stopPropagation();
    }

    unmarkHovered();
  };

  const handleFilesDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      unmarkHovered();

      const { dataTransfer } = e;

      const files = await getFilesFromDataTransferItems(dataTransfer.items);
      if (files?.length) {
        onFileAppend(files, isEverySpoiler);
      }
    },
    [isEverySpoiler, onFileAppend, unmarkHovered]
  );

  function handleDragOver(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    e.preventDefault();

    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = undefined;
    }
  }

  const handleFileSelect = useCallback(
    (e: Event) => {
      const { files } = e.target as HTMLInputElement;
      const validatedFiles = validateFiles(files);

      if (validatedFiles?.length) {
        onFileAppend(validatedFiles, isEverySpoiler);
      }
    },
    [isEverySpoiler, onFileAppend]
  );

  const handleDocumentSelect = useCallback(() => {
    openSystemFilesDialog('*', (e) => handleFileSelect(e));
  }, [handleFileSelect]);

  const handleDelete = useCallback(
    (index: number) => {
      onAttachmentsUpdate(attachments.filter((a, i) => i !== index));
    },
    [attachments, onAttachmentsUpdate]
  );

  const handleEnableSpoilers = useCallback(() => {
    onAttachmentsUpdate(
      attachments.map((a) => ({
        ...a,
        shouldSendAsSpoiler: a.mimeType !== GIF_MIME_TYPE ? true : undefined,
      }))
    );
  }, [attachments, onAttachmentsUpdate]);

  const handleDisableSpoilers = useCallback(() => {
    onAttachmentsUpdate(
      attachments.map((a) => ({ ...a, shouldSendAsSpoiler: undefined }))
    );
  }, [attachments, onAttachmentsUpdate]);

  const handleToggleSpoiler = useCallback(
    (index: number) => {
      onAttachmentsUpdate(
        attachments.map((attachment, i) => {
          if (i === index) {
            return {
              ...attachment,
              shouldSendAsSpoiler: !attachment.shouldSendAsSpoiler || undefined,
            };
          }

          return attachment;
        })
      );
    },
    [attachments, onAttachmentsUpdate]
  );

  useEffect(() => {
    const mainButton = mainButtonRef.current;
    const input = document.getElementById(ATTACHMENT_MODAL_INPUT_ID);

    if (!mainButton || !input) return;

    const { width } = mainButton.getBoundingClientRect();
    input.style.setProperty('--margin-for-scrollbar', `${width}px`);
  }, [t, isOpen]);

  const MoreMenuButton: FC<{ onTrigger: () => void; isOpen?: boolean }> =
    useMemo(() => {
      return ({ onTrigger, isOpen: isMenuOpen }) => (
        <Button
          round
          ripple={!isMobile}
          size='smaller'
          color='translucent'
          className={isMenuOpen ? 'active' : ''}
          onClick={onTrigger}
          ariaLabel='More actions'
        >
          <i className='icon-svg'>
            <IconSvg name='filled' />
          </i>
        </Button>
      );
    }, [isMobile]);

  const leftChars = useDerivedState(() => {
    if (!renderingIsOpen) return undefined;

    const leftCharsBeforeLimit = captionLimit - getHtmlTextLength(getHtml());
    return leftCharsBeforeLimit <= MAX_LEFT_CHARS_TO_SHOW
      ? leftCharsBeforeLimit
      : undefined;
  }, [captionLimit, getHtml, renderingIsOpen]);

  const isQuickGallery = isSendingCompressed && hasOnlyMedia;

  const [areAllPhotos, areAllVideos, areAllAudios] = useMemo(() => {
    if (!isQuickGallery || !renderingAttachments) return [false, false, false];
    const everyPhoto = renderingAttachments.every((a) =>
      SUPPORTED_IMAGE_CONTENT_TYPES.has(a.mimeType)
    );
    const everyVideo = renderingAttachments.every((a) =>
      SUPPORTED_VIDEO_CONTENT_TYPES.has(a.mimeType)
    );
    const everyAudio = renderingAttachments.every((a) =>
      SUPPORTED_AUDIO_CONTENT_TYPES.has(a.mimeType)
    );
    return [everyPhoto, everyVideo, everyAudio];
  }, [renderingAttachments, isQuickGallery]);

  const hasAnySpoilerable = useMemo(() => {
    if (!renderingAttachments) return false;
    return renderingAttachments.some(
      (a) =>
        a.mimeType !== GIF_MIME_TYPE &&
        !SUPPORTED_AUDIO_CONTENT_TYPES.has(a.mimeType)
    );
  }, [renderingAttachments]);

  if (!renderingAttachments) {
    return null;
  }

  const isMultiple = renderingAttachments.length > 1;

  let title = '';
  if (areAllPhotos) {
    title = t('PreviewSender.SendPhoto', {
      count: renderingAttachments.length,
    });
  } else if (areAllVideos) {
    title = t('PreviewSender.SendVideo', {
      count: renderingAttachments.length,
    });
  } else if (areAllAudios) {
    title = t('PreviewSender.SendAudio', {
      count: renderingAttachments.length,
    });
  } else {
    title = t('PreviewSender.SendFile', { count: renderingAttachments.length });
  }

  function renderHeader() {
    if (!renderingAttachments) {
      return undefined;
    }

    return (
      <div className='modal-header-condensed' dir={isRtl ? 'rtl' : undefined}>
        <div className='modal-title'>{title}</div>
        <DropdownMenu
          className='attachment-modal-more-menu with-menu-transitions'
          trigger={MoreMenuButton}
          positionX='right'
        >
          <MenuItem
            customIcon={<IconSvg name='plus' />}
            onClick={handleDocumentSelect}
          >
            {t('Add')}
          </MenuItem>
          {hasMedia && (
            <>
              {!shouldForceAsFile &&
                !shouldForceCompression &&
                (isSendingCompressed ? (
                  <MenuItem
                    customIcon={<IconSvg name='document' />}
                    onClick={() => setShouldSendCompressed(false)}
                  >
                    {t(isMultiple ? 'Attach.SendAsFiles' : 'Attach.SendAsFile')}
                  </MenuItem>
                ) : (
                  <MenuItem
                    customIcon={<IconSvg name='media' />}
                    onClick={() => setShouldSendCompressed(true)}
                  >
                    {isMultiple ? 'Send All as Media' : 'Send as Media'}
                  </MenuItem>
                ))}
              {/* {isSendingCompressed &&
                hasAnySpoilerable &&
                (hasSpoiler ? (
                  <MenuItem
                    icon='spoiler-disable'
                    onClick={handleDisableSpoilers}
                  >
                    {t('Attachment.DisableSpoiler')}
                  </MenuItem>
                ) : (
                  <MenuItem icon='spoiler' onClick={handleEnableSpoilers}>
                    {t('Attachment.EnableSpoiler')}
                  </MenuItem>
                ))} */}
            </>
          )}
          {isMultiple &&
            (shouldSendGrouped ? (
              <MenuItem
                customIcon={<IconSvg name='ungrouped' />}
                onClick={() => setShouldSendGrouped(false)}
              >
                Ungroup all media
              </MenuItem>
            ) : (
              <MenuItem
                customIcon={<IconSvg name='grouped' />}
                onClick={() => setShouldSendGrouped(true)}
              >
                Group all media
              </MenuItem>
            ))}
        </DropdownMenu>
      </div>
    );
  }

  const isBottomDividerShown =
    !areAttachmentsScrolledToBottom || !isCaptionNotScrolled;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClear}
      centered
      hasCloseButton
      header={renderHeader()}
      className={buildClassName(
        styles.root,
        isHovered && styles.hovered,
        !areAttachmentsNotScrolled && styles.headerBorder,
        isMobile && styles.mobile,
        isSymbolMenuOpen && styles.symbolMenuOpen
      )}
      noBackdropClose
    >
      <div
        className={styles.dropTarget}
        onDragEnter={markHovered}
        onDrop={handleFilesDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={unmarkHovered}
        data-attach-description={t('Preview.Dragging.AddItems', { count: 10 })}
        data-dropzone
      >
        <div
          className={buildClassName(
            styles.attachments,
            'custom-scroll',
            isBottomDividerShown && styles.attachmentsBottomPadding
          )}
          onScroll={handleAttachmentsScroll}
        >
          {renderingAttachments.map((attachment, i) => (
            <AttachmentModalItem
              attachment={attachment}
              shouldDisplayCompressed={isSendingCompressed}
              shouldDisplayGrouped={shouldSendGrouped}
              isSingle={renderingAttachments.length === 1}
              index={i}
              key={attachment.uniqueId || i}
              onDelete={handleDelete}
              onToggleSpoiler={handleToggleSpoiler}
            />
          ))}
        </div>
        <div
          className={buildClassName(
            styles.captionWrapper,
            isBottomDividerShown && styles.captionTopBorder
          )}
        >
          <MentionTooltip
            isOpen={isMentionTooltipOpen}
            filteredUsers={mentionFilteredUsers}
            onInsertUserName={insertMention}
            onClose={closeMentionTooltip}
          />
          <EmojiTooltip
            isOpen={isEmojiTooltipOpen}
            emojis={filteredEmojis}
            customEmojis={filteredCustomEmojis}
            addRecentEmoji={addRecentEmoji}
            addRecentCustomEmoji={addRecentCustomEmoji}
            onEmojiSelect={insertEmoji}
            onCustomEmojiSelect={insertEmoji}
            onClose={closeEmojiTooltip}
          />
          <CustomEmojiTooltip
            chatId={chatId}
            isOpen={isCustomEmojiTooltipOpen}
            addRecentCustomEmoji={addRecentCustomEmoji}
            onCustomEmojiSelect={insertCustomEmoji}
            onClose={closeCustomEmojiTooltip}
          />
          <div className={styles.caption}>
            <SymbolMenuButton
              chatId={chatId}
              threadId={threadId}
              isMobile={isMobile}
              isReady={isReady}
              isSymbolMenuOpen={isSymbolMenuOpen}
              openSymbolMenu={openSymbolMenu}
              closeSymbolMenu={closeSymbolMenu}
              onCustomEmojiSelect={onCustomEmojiSelect}
              onRemoveSymbol={onRemoveSymbol}
              onEmojiSelect={onEmojiSelect}
              canSendPlainText
              className='attachment-modal-symbol-menu with-menu-transitions'
            />
            <MessageInput
              elRef={inputRef}
              id={ATTACHMENT_MODAL_INPUT_ID}
              editableInputId={EDITABLE_INPUT_MODAL_ID}
              chatId={chatId}
              isReady={isReady}
              threadId={threadId}
              isAttachmentModalInput
              isActive={isOpen}
              getHtml={getHtml}
              getHtmlStr={getHtml()}
              placeholder={t('AddCaption')}
              onUpdate={onCaptionUpdate}
              onSend={handleSendClick}
              onScroll={handleCaptionScroll}
              canAutoFocus={Boolean(
                isReady && isForCurrentMessageList && attachments.length
              )}
              captionLimit={leftChars}
              shouldSuppressFocus={isMobile && isSymbolMenuOpen}
              onSuppressedFocus={closeSymbolMenu}
            />
            <div className={styles.sendWrapper}>
              <Button
                elRef={mainButtonRef}
                className={styles.send}
                onClick={handleSendClick}
                // onContextMenu={
                //   canShowCustomSendMenu ? handleContextMenu : undefined
                // }
              >
                {shouldSchedule ? t('Next') : t('Send')}
              </Button>
              {canShowCustomSendMenu && (
                <CustomSendMenu
                  isOpen={isCustomSendMenuOpen}
                  onSendSilent={!isChatWithSelf ? handleSendSilent : undefined}
                  onSendSchedule={handleScheduleClick}
                  onClose={handleContextMenuClose}
                  onCloseAnimationEnd={handleContextMenuHide}
                  isSavedMessages={isChatWithSelf}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default memo(
  withGlobal<OwnProps>((global, { chatId }): StateProps => {
    const { currentUserId, recentEmojis, customEmojis, attachmentSettings } =
      global;

    const chat = selectChat(global, chatId);
    const isChatWithSelf = selectIsChatWithSelf(global, chatId);
    const { language, shouldSuggestCustomEmoji } = global.settings.byKey;
    const baseEmojiKeywords = global.emojiKeywords[BASE_EMOJI_KEYWORD_LANG];
    const emojiKeywords =
      language !== BASE_EMOJI_KEYWORD_LANG
        ? global.emojiKeywords[language]
        : undefined;

    return {
      isChatWithSelf,
      currentUserId,
      groupChatMembers: chat?.fullInfo?.members,
      recentEmojis,
      baseEmojiKeywords: baseEmojiKeywords?.keywords,
      emojiKeywords: emojiKeywords?.keywords,
      shouldSuggestCustomEmoji,
      customEmojiForEmoji: customEmojis.forEmoji.stickers,
      captionLimit: selectCurrentLimit(global, 'captionLength'),
      attachmentSettings,
    };
  })(AttachmentModal)
);
