import React, { memo, useRef, FC } from 'react';

import type { ApiMessage } from '../../../api/types';
import type { ISettings } from '../../../types';

import {
  CUSTOM_APPENDIX_ATTRIBUTE,
  MESSAGE_CONTENT_SELECTOR,
} from '../../../config';
import { getMessageInvoice, getWebDocumentHash } from '../../../global/helpers';
import { formatCurrency } from '../../../util/formatCurrency';
import renderText from '../../common/helpers/renderText';
import getCustomAppendixBg from './helpers/getCustomAppendixBg';

import useLayoutEffectWithPrevDeps from '../../../hooks/useLayoutEffectWithPrevDeps';
import useLang from '../../../hooks/useLang';
import useMedia from '../../../hooks/useMedia';
import useBlurredMediaThumbRef from './hooks/useBlurredMediaThumbRef';

import Skeleton from '../../ui/Skeleton';

import './Invoice.scss';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';

type OwnProps = {
  message: ApiMessage;
  shouldAffectAppendix?: boolean;
  isInSelectMode?: boolean;
  isSelected?: boolean;
  theme: ISettings['theme'];
  forcedWidth?: number;
};

const Invoice: FC<OwnProps> = ({
  message,
  shouldAffectAppendix,
  isInSelectMode,
  isSelected,
  theme,
  forcedWidth,
}) => {
  // eslint-disable-next-line no-null/no-null
  const ref = useRef<HTMLDivElement>(null);

  const { t } = useTranslation();
  const invoice = getMessageInvoice(message);

  const { title, text, amount, currency, isTest, photo } = invoice!;

  const photoUrl = useMedia(getWebDocumentHash(photo));
  const withBlurredBackground = Boolean(forcedWidth);
  const blurredBackgroundRef = useBlurredMediaThumbRef(
    message,
    !withBlurredBackground,
    photoUrl
  );

  useLayoutEffectWithPrevDeps(
    ([prevShouldAffectAppendix]) => {
      if (!shouldAffectAppendix) {
        if (prevShouldAffectAppendix) {
          ref
            .current!.closest<HTMLDivElement>(MESSAGE_CONTENT_SELECTOR)!
            .removeAttribute(CUSTOM_APPENDIX_ATTRIBUTE);
        }
        return;
      }

      if (photoUrl) {
        const contentEl = ref.current!.closest<HTMLDivElement>(
          MESSAGE_CONTENT_SELECTOR
        )!;
        getCustomAppendixBg(
          photoUrl,
          false,
          isInSelectMode,
          isSelected,
          theme
        ).then((appendixBg) => {
          contentEl.style.setProperty('--appendix-bg', appendixBg);
          contentEl.setAttribute(CUSTOM_APPENDIX_ATTRIBUTE, '');
        });
      }
    },
    [shouldAffectAppendix, photoUrl, isInSelectMode, isSelected, theme]
  );

  return (
    <div ref={ref} className='Invoice'>
      {title && <p className='title'>{renderText(title)}</p>}
      {text && <div>{renderText(text, ['emoji', 'br'])}</div>}
      <div className={`description ${photo ? 'has-image' : ''}`}>
        {Boolean(photo) && (
          <div className='invoice-image-container'>
            {withBlurredBackground && (
              <canvas
                ref={blurredBackgroundRef}
                className='thumbnail blurred-bg'
              />
            )}
            {photoUrl && (
              <img
                className='invoice-image'
                src={photoUrl}
                alt=''
                style={{ width: forcedWidth ? `${forcedWidth}px` : `auto` }}
                crossOrigin='anonymous'
              />
            )}
            {!photoUrl && photo && (
              <Skeleton
                width={forcedWidth || photo.dimensions?.width}
                height={photo.dimensions?.height}
                forceAspectRatio
              />
            )}
          </div>
        )}
        <p className='description-text'>
          {formatCurrency(amount, currency, i18next.language)}
          {isTest && <span>{t('PaymentTestInvoice')}</span>}
        </p>
      </div>
    </div>
  );
};

export default memo(Invoice);
