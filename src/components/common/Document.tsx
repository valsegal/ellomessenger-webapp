import React, {
  FC,
  useCallback,
  memo,
  useRef,
  useEffect,
  useState,
} from 'react';
import { getActions } from '../../global';

import type { ApiMessage } from '../../api/types';

import {
  SUPPORTED_IMAGE_CONTENT_TYPES,
  SUPPORTED_VIDEO_CONTENT_TYPES,
} from '../../config';
import {
  getDocumentExtension,
  getDocumentHasPreview,
} from './helpers/documentInfo';
import {
  getMediaTransferState,
  getMessageMediaFormat,
  getMessageMediaHash,
  getMessageMediaThumbDataUri,
  isMessageDocumentVideo,
} from '../../global/helpers';
import type { ObserveFn } from '../../hooks/useIntersectionObserver';
import { useIsIntersecting } from '../../hooks/useIntersectionObserver';
import useMediaWithLoadProgress from '../../hooks/useMediaWithLoadProgress';
import useMedia from '../../hooks/useMedia';
import useFlag from '../../hooks/useFlag';

import File from './File';

type OwnProps = {
  message: ApiMessage;
  observeIntersection?: ObserveFn;
  smaller?: boolean;
  isSelected?: boolean;
  isSelectable?: boolean;
  canAutoLoad?: boolean;
  uploadProgress?: number;
  withDate?: boolean;
  datetime?: number;
  className?: string;
  sender?: string;
  autoLoadFileMaxSizeMb?: number;
  isDownloading?: boolean;
  onCancelUpload?: () => void;
  onMediaClick?: () => void;
  onDateClick?: (messageId: number, chatId: string) => void;
};

const BYTES_PER_MB = 1024 * 1024;

const Document: FC<OwnProps> = ({
  message,
  observeIntersection,
  smaller,
  canAutoLoad,
  autoLoadFileMaxSizeMb,
  uploadProgress,
  withDate,
  datetime,
  className,
  sender,
  isSelected,
  isSelectable,
  onCancelUpload,
  onMediaClick,
  onDateClick,
  isDownloading,
}) => {
  const dispatch = getActions();

  const ref = useRef<HTMLDivElement>(null);

  const document = message.content.document!;
  const { fileName, size, timestamp } = document;
  const extension = getDocumentExtension(document) || '';

  const isIntersecting = useIsIntersecting(ref, observeIntersection);
  const [wasIntersected, markIntersected] = useFlag();
  useEffect(() => {
    if (isIntersecting) {
      markIntersected();
    }
  }, [isIntersecting, markIntersected]);

  // Auto-loading does not use global download manager because requires additional click to save files locally
  const [isLoadAllowed, setIsLoadAllowed] = useState(
    canAutoLoad &&
      (!autoLoadFileMaxSizeMb || size <= autoLoadFileMaxSizeMb * BYTES_PER_MB)
  );

  const shouldDownload = Boolean(
    isDownloading || (isLoadAllowed && wasIntersected)
  );

  const documentHash = getMessageMediaHash(message, 'download');
  const { loadProgress: downloadProgress, mediaData } =
    useMediaWithLoadProgress(
      documentHash,
      !shouldDownload,
      getMessageMediaFormat(message, 'download'),
      undefined,
      undefined,
      true
    );
  const isLoaded = Boolean(mediaData);

  const { isUploading, isTransferring, transferProgress } =
    getMediaTransferState(
      message,
      uploadProgress || downloadProgress,
      shouldDownload && !isLoaded
    );

  const hasPreview = getDocumentHasPreview(document);
  const thumbDataUri = hasPreview
    ? getMessageMediaThumbDataUri(message)
    : undefined;
  const localBlobUrl = hasPreview ? document.previewBlobUrl : undefined;
  const previewData = useMedia(
    getMessageMediaHash(message, 'pictogram'),
    !isIntersecting
  );

  const withMediaViewer =
    onMediaClick &&
    Boolean(document.mediaType) &&
    (SUPPORTED_VIDEO_CONTENT_TYPES.has(document.mimeType) ||
      SUPPORTED_IMAGE_CONTENT_TYPES.has(document.mimeType));

  const handleClick = useCallback(() => {
    if (isUploading) {
      if (onCancelUpload) {
        onCancelUpload();
      }
      return;
    }

    if (isDownloading) {
      dispatch.cancelMessageMediaDownload({ message });
      return;
    }

    if (isTransferring) {
      setIsLoadAllowed(false);
      return;
    }

    if (withMediaViewer) {
      onMediaClick!();
    } else {
      dispatch.downloadMessageMedia({ message });
    }
  }, [
    isUploading,
    isDownloading,
    isTransferring,
    withMediaViewer,
    onCancelUpload,
    dispatch,
    message,
    onMediaClick,
  ]);

  const handleDateClick = useCallback(() => {
    onDateClick!(message.id, message.chatId);
  }, [onDateClick, message.id, message.chatId]);

  return (
    <File
      elRef={ref}
      name={fileName}
      extension={extension}
      size={size}
      timestamp={withDate ? datetime || timestamp : undefined}
      thumbnailDataUri={thumbDataUri}
      previewData={localBlobUrl || previewData}
      smaller={smaller}
      isTransferring={isTransferring}
      isUploading={isUploading}
      transferProgress={transferProgress}
      className={className}
      sender={sender}
      isSelectable={isSelectable}
      isSelected={isSelected}
      actionIcon={
        withMediaViewer
          ? isMessageDocumentVideo(message)
            ? 'icon-play'
            : 'icon-eye'
          : 'icon-download'
      }
      onClick={handleClick}
      onDateClick={onDateClick ? handleDateClick : undefined}
    />
  );
};

export default memo(Document);
