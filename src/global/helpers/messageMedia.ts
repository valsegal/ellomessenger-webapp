import type {
  ApiAudio,
  ApiDimensions,
  ApiDocument,
  ApiGame,
  ApiLocation,
  ApiMessage,
  ApiMessageSearchType,
  ApiPhoto,
  ApiVideo,
  ApiWebDocument,
} from '../../api/types';
import { ApiMediaFormat } from '../../api/types';

import {
  IS_OPFS_SUPPORTED,
  IS_OPUS_SUPPORTED,
  IS_PROGRESSIVE_SUPPORTED,
  IS_SAFARI,
  MAX_BUFFER_SIZE,
} from '../../util/windowEnvironment';
import {
  getMessageKey,
  isMessageLocal,
  matchLinkInMessageText,
} from './messages';
import { getDocumentHasPreview } from '../../components/common/helpers/documentInfo';

type Target =
  | 'micro'
  | 'pictogram'
  | 'inline'
  | 'preview'
  | 'full'
  | 'download';

export function getMessageContent(message: ApiMessage) {
  return message.content;
}

export function hasMessageMedia(message: ApiMessage) {
  return Boolean(
    getMessagePhoto(message) ||
      getMessageVideo(message) ||
      getMessageDocument(message) ||
      getMessageSticker(message) ||
      getMessageContact(message) ||
      getMessagePoll(message) ||
      getMessageAction(message) ||
      getMessageAudio(message) ||
      getMessageVoice(message)
  );
}

export function getMessagePhoto(message: ApiMessage) {
  return message.content.photo;
}

export function getMessageActionPhoto(message: ApiMessage) {
  return message.content.action?.type === 'suggestProfilePhoto'
    ? message.content.action.photo
    : undefined;
}

export function getMessageVideo(message: ApiMessage) {
  return message.content.video;
}

export function getMessageRoundVideo(message: ApiMessage) {
  const { video } = message.content;

  return video?.isRound ? video : undefined;
}

export function getMessageAction(message: ApiMessage) {
  return message.content.action;
}

export function getMessageAudio(message: ApiMessage) {
  return message.content.audio;
}

export function getMessageVoice(message: ApiMessage) {
  return message.content.voice;
}

export function getMessageSticker(message: ApiMessage) {
  return message.content.sticker;
}

export function getMessageDocument(message: ApiMessage) {
  return message.content.document;
}

export function isMessageDocumentPhoto(message: ApiMessage) {
  const document = getMessageDocument(message);
  return document ? document.mediaType === 'photo' : undefined;
}

export function isMessageDocumentVideo(message: ApiMessage) {
  const document = getMessageDocument(message);
  return document ? document.mediaType === 'video' : undefined;
}

export function getMessageContact(message: ApiMessage) {
  return message.content.contact;
}

export function getMessagePoll(message: ApiMessage) {
  return message.content.poll;
}

export function getMessageInvoice(message: ApiMessage) {
  return message.content.invoice;
}

export function getMessageLocation(message: ApiMessage) {
  return message.content.location;
}

export function getMessageWebPage(message: ApiMessage) {
  return message.content.webPage;
}

export function getMessageWebPagePhoto(message: ApiMessage) {
  return getMessageWebPage(message)?.photo;
}

export function getMessageDocumentPhoto(message: ApiMessage) {
  return isMessageDocumentPhoto(message)
    ? getMessageDocument(message)
    : undefined;
}

export function getMessageWebPageVideo(message: ApiMessage) {
  return getMessageWebPage(message)?.video;
}

export function getMessageDocumentVideo(message: ApiMessage) {
  return isMessageDocumentVideo(message)
    ? getMessageDocument(message)
    : undefined;
}

export function getMessageMediaThumbnail(message: ApiMessage) {
  const media =
    getMessagePhoto(message) ||
    getMessageVideo(message) ||
    getMessageDocument(message) ||
    getMessageSticker(message) ||
    getMessageWebPagePhoto(message) ||
    getMessageWebPageVideo(message) ||
    getMessageInvoice(message)?.extendedMedia;

  if (!media) {
    return undefined;
  }

  return media.thumbnail;
}

export function getMessageMediaThumbDataUri(message: ApiMessage) {
  return getMessageMediaThumbnail(message)?.dataUri;
}

export function getMessageIsSpoiler(message: ApiMessage) {
  const media = getMessagePhoto(message) || getMessageVideo(message);

  const invoiceMedia = getMessageInvoice(message)?.extendedMedia;
  return Boolean(invoiceMedia || media?.isSpoiler);
}

export function getDocumentMediaHash(document: ApiDocument) {
  return `document${document.id}`;
}

export function buildStaticMapHash(
  geo: ApiLocation['geo'],
  width: number,
  height: number,
  zoom: number,
  scale: number
) {
  const { long, lat, accessHash, accuracyRadius } = geo;

  // eslint-disable-next-line max-len
  return `staticMap:${accessHash}?lat=${lat}&long=${long}&w=${width}&h=${height}&zoom=${zoom}&scale=${scale}&accuracyRadius=${accuracyRadius}`;
}

export function getMessageMediaHash(message: ApiMessage, target: Target) {
  const { video, sticker, audio, voice, document } = message.content;

  const messagePhoto =
    getMessagePhoto(message) ||
    getMessageWebPagePhoto(message) ||
    getMessageDocumentPhoto(message);
  const actionPhoto = getMessageActionPhoto(message);
  const messageVideo =
    video ||
    getMessageWebPageVideo(message) ||
    getMessageDocumentVideo(message);

  const content =
    actionPhoto ||
    messagePhoto ||
    messageVideo ||
    sticker ||
    audio ||
    voice ||
    document;
  if (!content) {
    return undefined;
  }

  const mediaId = content.id;
  const base = `${getMessageKey(message)}${mediaId ? `:${mediaId}` : ''}`;

  if (messageVideo) {
    switch (target) {
      case 'micro':
      case 'pictogram':
        return `${base}?size=m`;
      case 'inline':
        return !hasMessageLocalBlobUrl(message)
          ? getVideoOrAudioBaseHash(messageVideo, base)
          : undefined;
      case 'preview':
        return `${base}?size=x`;
      case 'full':
        return getVideoOrAudioBaseHash(messageVideo, base);
      case 'download':
        return `${base}?download`;
    }
  }

  if (messagePhoto || actionPhoto) {
    switch (target) {
      case 'micro':
      case 'pictogram':
        return `${base}?size=${actionPhoto ? 'a' : 'm'}`;
      case 'inline':
        return !hasMessageLocalBlobUrl(message)
          ? `${base}?size=${actionPhoto ? 'b' : 'x'}`
          : undefined;
      case 'preview':
        return `${base}?size=${actionPhoto ? 'b' : 'x'}`;
      case 'full':
      case 'download':
        return document ? base : `${base}?size=${actionPhoto ? 'c' : 'z'}`;
    }
  }

  if (document) {
    switch (target) {
      case 'micro':
      case 'pictogram':
      case 'inline':
      case 'preview':
        if (
          !getDocumentHasPreview(document) ||
          hasMessageLocalBlobUrl(message)
        ) {
          return undefined;
        }

        return `${base}?size=m`;
      case 'full':
      case 'download':
        return base;
    }
  }

  if (sticker) {
    switch (target) {
      case 'micro':
        return undefined;
      case 'pictogram':
        return `${base}?size=m`;
      case 'inline':
        return base;
      case 'download':
        return `${base}?download`;
    }
  }

  if (audio) {
    switch (target) {
      case 'micro':
      case 'pictogram':
        return getAudioHasCover(audio) ? `${base}?size=m` : undefined;
      case 'inline':
        return getVideoOrAudioBaseHash(audio, base);
      case 'download':
        return `${base}?download`;
    }
  }

  if (voice) {
    switch (target) {
      case 'micro':
      case 'pictogram':
        return undefined;
      case 'inline':
        return base;
      case 'download':
        return `${base}?download`;
    }
  }

  return undefined;
}

export function getWebDocumentHash(webDocument?: ApiWebDocument) {
  if (!webDocument) return undefined;
  return `webDocument:${webDocument.url}`;
}

export function getGamePreviewPhotoHash(game: ApiGame) {
  const { photo } = game;

  if (photo) {
    return `photo${photo.id}?size=x`;
  }

  return undefined;
}

export function getGamePreviewVideoHash(game: ApiGame) {
  const { document } = game;

  if (document) {
    return `document${document.id}`;
  }

  return undefined;
}

function getVideoOrAudioBaseHash(
  media: ApiAudio | ApiVideo | ApiDocument,
  base: string
) {
  if (IS_PROGRESSIVE_SUPPORTED && IS_SAFARI) {
    return `${base}?fileSize=${media.size}&mimeType=${media.mimeType}`;
  }

  return base;
}

export function getAudioHasCover(media: ApiAudio) {
  return media.thumbnailSizes && media.thumbnailSizes.length > 0;
}

export function getMessageMediaFormat(
  message: ApiMessage,
  target: Target
): ApiMediaFormat {
  const { video, audio, voice, document } = message.content;
  const isVideo = Boolean(
    video || getMessageWebPageVideo(message) || isMessageDocumentVideo(message)
  );
  const size = (video || audio || document)?.size!;
  if (target === 'download') {
    if (
      IS_PROGRESSIVE_SUPPORTED &&
      size > MAX_BUFFER_SIZE &&
      !IS_OPFS_SUPPORTED
    ) {
      return ApiMediaFormat.DownloadUrl;
    }
    return ApiMediaFormat.BlobUrl;
  }

  if (
    isVideo &&
    IS_PROGRESSIVE_SUPPORTED &&
    (target === 'full' || target === 'inline')
  ) {
    return ApiMediaFormat.Progressive;
  }

  if (audio || voice) {
    // Safari
    if (voice && !IS_OPUS_SUPPORTED) {
      return ApiMediaFormat.BlobUrl;
    }

    return ApiMediaFormat.Progressive;
  }

  return ApiMediaFormat.BlobUrl;
}

export function getMessageFileName(message: ApiMessage) {
  const { photo, video, document } = message.content;
  const webPagePhoto = getMessageWebPagePhoto(message);
  const webPageVideo = getMessageWebPageVideo(message);

  if (photo || webPagePhoto) {
    return `photo${message.date}.jpeg`;
  }

  const { fileName } = video || webPageVideo || document || {};

  return fileName;
}

export function getMessageFileSize(message: ApiMessage) {
  const { video, document } = message.content;
  const webPageVideo = getMessageWebPageVideo(message);
  const { size } = video || webPageVideo || document || {};

  return size;
}

export function hasMessageLocalBlobUrl(message: ApiMessage) {
  const { photo, video, document } = message.content;

  return photo?.blobUrl || video?.blobUrl || document?.previewBlobUrl;
}

export function getChatMediaMessageIds(
  messages: Record<number, ApiMessage>,
  listedIds: number[],
  isFromSharedMedia = false
) {
  return getMessageContentIds(
    messages,
    listedIds,
    isFromSharedMedia ? 'media' : 'inlineMedia'
  );
}

export function getPhotoFullDimensions(
  photo: Pick<ApiPhoto, 'sizes' | 'thumbnail'>
): ApiDimensions | undefined {
  return (
    photo.sizes.find((size) => size.type === 'z') ||
    photo.sizes.find((size) => size.type === 'y') ||
    getPhotoInlineDimensions(photo)
  );
}

export function getPhotoInlineDimensions(
  photo: Pick<ApiPhoto, 'sizes' | 'thumbnail'>
): ApiDimensions | undefined {
  return (
    photo.sizes.find((size) => size.type === 'x') ||
    photo.sizes.find((size) => size.type === 'm') ||
    photo.sizes.find((size) => size.type === 's') ||
    photo.thumbnail
  );
}

export function getVideoDimensions(video: ApiVideo): ApiDimensions | undefined {
  if (video && video.width && video.height) {
    return video as ApiDimensions;
  }

  return undefined;
}

export function getMediaTransferState(
  message: ApiMessage,
  progress?: number,
  isLoadNeeded = false
) {
  const isUploading = isMessageLocal(message);
  const isTransferring = isUploading || isLoadNeeded;
  const transferProgress = Number(progress);

  return {
    isUploading,
    isTransferring,
    transferProgress,
  };
}

export function getMessageContentIds(
  messages: Record<number, ApiMessage>,
  messageIds: number[],
  contentType: ApiMessageSearchType | 'inlineMedia'
) {
  let validator: Function;

  switch (contentType) {
    case 'media':
      validator = (message: ApiMessage) => {
        const video = getMessageVideo(message);
        return (
          getMessagePhoto(message) || (video && !video.isRound && !video.isGif)
        );
      };
      break;

    case 'documents':
      validator = getMessageDocument;
      break;

    case 'links':
      validator = (message: ApiMessage) =>
        getMessageWebPage(message) || matchLinkInMessageText(message);
      break;

    case 'audio':
      validator = getMessageAudio;
      break;

    case 'voice':
      validator = (message: ApiMessage) => {
        const video = getMessageVideo(message);
        return getMessageVoice(message) || (video && video.isRound);
      };
      break;

    case 'inlineMedia':
      validator = (message: ApiMessage) => {
        const video = getMessageVideo(message);
        return (
          getMessagePhoto(message) ||
          (video && !video.isRound && !video.isGif) ||
          isMessageDocumentPhoto(message) ||
          isMessageDocumentVideo(message)
        );
      };
      break;

    default:
      return [] as Array<number>;
  }

  return messageIds.reduce((result, messageId) => {
    if (messages[messageId] && validator(messages[messageId])) {
      result.push(messageId);
    }

    return result;
  }, [] as Array<number>);
}

export function getMediaDuration(message: ApiMessage) {
  const { audio, voice, video } = getMessageContent(message);
  const media = audio || voice || video || getMessageWebPageVideo(message);
  if (!media) {
    return undefined;
  }

  return media.duration;
}
