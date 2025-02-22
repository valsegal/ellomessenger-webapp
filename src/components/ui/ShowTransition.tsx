import React, { FC, memo, useRef } from 'react';

import useShowTransition from '../../hooks/useShowTransition';
import usePrevious from '../../hooks/usePrevious';
import classNames from 'classnames';

type OwnProps = {
  isOpen: boolean;
  isCustom?: boolean;
  isHidden?: boolean;
  id?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  noCloseTransition?: boolean;
  shouldAnimateFirstRender?: boolean;
  children: React.ReactNode;
};

const ShowTransition: FC<OwnProps> = ({
  isOpen,
  isHidden,
  isCustom,
  id,
  className,
  onClick,
  children,
  noCloseTransition,
  shouldAnimateFirstRender,
}) => {
  const prevIsOpen = usePrevious(isOpen);
  const prevChildren = usePrevious(children);
  const fromChildrenRef = useRef<React.ReactNode>();
  const isFirstRender = prevIsOpen === undefined;
  const { shouldRender, transitionClassNames } = useShowTransition(
    isOpen && !isHidden,
    undefined,
    isFirstRender && !shouldAnimateFirstRender,
    isCustom ? false : undefined,
    noCloseTransition
  );

  if (prevIsOpen && !isOpen) {
    fromChildrenRef.current = prevChildren;
  }

  return shouldRender || isHidden ? (
    <div
      id={id}
      className={classNames(className, transitionClassNames)}
      onClick={onClick}
    >
      {isOpen ? children : fromChildrenRef.current!}
    </div>
  ) : null;
};

export default memo(ShowTransition);
