import React, { FC, useState, useEffect, useRef } from 'react';

import type { ApiPollAnswer, ApiPollResult } from '../../../api/types';

import renderText from '../../common/helpers/renderText';

import './PollOption.scss';
import classNames from 'classnames';

type OwnProps = {
  answer: ApiPollAnswer;
  voteResults?: ApiPollResult[];
  totalVoters?: number;
  maxVotersCount?: number;
  correctResults: string[];
  shouldAnimate: boolean;
};

const PollOption: FC<OwnProps> = ({
  answer,
  voteResults,
  totalVoters,
  maxVotersCount,
  correctResults,
  shouldAnimate,
}) => {
  const result =
    voteResults && voteResults.find((r) => r.option === answer.option);
  const correctAnswer =
    correctResults.length === 0 || correctResults.indexOf(answer.option) !== -1;
  const showIcon =
    (correctResults.length > 0 && correctAnswer) || result?.isChosen;
  const answerPercent = result
    ? getPercentage(result.votersCount, totalVoters || 0)
    : 0;
  const [finalPercent, setFinalPercent] = useState(
    shouldAnimate ? 0 : answerPercent
  );
  // eslint-disable-next-line no-null/no-null
  const lineRef = useRef<HTMLDivElement>(null);
  const lineWidth = result
    ? getPercentage(result.votersCount, maxVotersCount || 0)
    : 0;
  const isAnimationDoesNotStart = finalPercent !== answerPercent;

  useEffect(() => {
    if (shouldAnimate) {
      setFinalPercent(answerPercent);
    }
  }, [shouldAnimate, answerPercent]);

  useEffect(() => {
    const lineEl = lineRef.current;

    if (lineEl && shouldAnimate) {
      const svgEl = lineEl.firstElementChild;

      const style = isAnimationDoesNotStart
        ? ''
        : 'stroke-dasharray: 100% 200%; stroke-dashoffset: -44';
      if (!svgEl) {
        lineEl.innerHTML = `
          <svg class="poll-line" xmlns="http://www.w3.org/2000/svg" style="${style}">
            <path d="M4.47 5.33v13.6a9 9 0 009 9h13"/>
          </svg>`;
      } else {
        svgEl.setAttribute('style', style);
      }
    }
  }, [isAnimationDoesNotStart, shouldAnimate]);

  if (!voteResults || !result) {
    return null;
  }

  const lineStyle = {
    width: `${lineWidth}%`,
    transform: `scaleX(${isAnimationDoesNotStart ? 0 : 1})`,
  };

  return (
    <div className='PollOption' dir='ltr'>
      <div
        className={`poll-option-share ${
          answerPercent === '100' ? 'limit-width' : ''
        }`}
      >
        {answerPercent}%
        {showIcon && (
          <span
            className={classNames('poll-option-chosen', {
              wrong: !correctAnswer,
              animate: shouldAnimate,
            })}
          >
            <i className={correctAnswer ? 'icon-check' : 'icon-close'} />
          </span>
        )}
      </div>
      <div className='poll-option-right'>
        <div className='poll-option-text' dir='auto'>
          {renderText(answer.text)}
        </div>
        <div
          className={classNames('poll-option-answer', {
            wrong: showIcon && !correctAnswer,
          })}
        >
          <div className='poll-option-corner' ref={lineRef} />
          <div className='poll-option-line' style={lineStyle} />
        </div>
      </div>
    </div>
  );
};

function getPercentage(value: number, total: number) {
  return total > 0 ? ((value / total) * 100).toFixed() : 0;
}

export default PollOption;
