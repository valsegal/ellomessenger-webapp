import React, { FC, useState, useRef, useCallback, useMemo } from 'react';

import Menu from './Menu';
import Button from './Button';

import './DropdownMenu.scss';
import IconSvg from './IconSvg';

type OwnProps = {
  className?: string;
  trigger?: FC<{ onTrigger: () => void; isOpen?: boolean }>;
  positionX?: 'left' | 'right';
  positionY?: 'top' | 'bottom';
  footer?: string;
  forceOpen?: boolean;
  customIcon?: React.ReactNode;
  onOpen?: NoneToVoidFunction;
  onClose?: NoneToVoidFunction;
  onHide?: NoneToVoidFunction;
  onTransitionEnd?: NoneToVoidFunction;
  onMouseEnterBackdrop?: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => void;
  children: React.ReactNode;
};

const DropdownMenu: FC<OwnProps> = ({
  trigger,
  className,
  children,
  positionX = 'left',
  positionY = 'top',
  footer,
  forceOpen,
  onOpen,
  onClose,
  onTransitionEnd,
  onMouseEnterBackdrop,
  onHide,
  customIcon,
}) => {
  // eslint-disable-next-line no-null/no-null
  const menuRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const toggleIsOpen = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      onClose?.();
    } else {
      onOpen?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    const menu = menuRef.current;

    if (!isOpen || e.keyCode !== 40 || !menu) {
      return;
    }

    const focusedElement = document.activeElement;
    const elementChildren = Array.from(menu.children);

    if (!focusedElement || elementChildren.indexOf(focusedElement) === -1) {
      (elementChildren[0] as HTMLElement).focus();
    }
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const triggerComponent: FC<{ onTrigger: () => void; isOpen?: boolean }> =
    useMemo(() => {
      if (trigger) return trigger;

      return ({
        onTrigger,
        isOpen: isMenuOpen,
      }: {
        onTrigger: () => void;
        isOpen?: boolean;
      }) =>
        customIcon ? (
          <div onClick={onTrigger} className={isMenuOpen ? 'active' : ''}>
            {customIcon}
          </div>
        ) : (
          <Button
            round
            shouldStopPropagation
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
    }, [trigger]);

  return (
    <div
      ref={dropdownRef}
      className={`DropdownMenu ${className || ''}`}
      onKeyDown={handleKeyDown}
      onTransitionEnd={onTransitionEnd}
    >
      {triggerComponent({ onTrigger: toggleIsOpen, isOpen })}

      <Menu
        elRef={menuRef}
        containerRef={dropdownRef}
        isOpen={isOpen || Boolean(forceOpen)}
        //className={className || ''}
        positionX={positionX}
        positionY={positionY}
        notice={footer}
        autoClose
        onClose={handleClose}
        shouldSkipTransition={forceOpen}
        onCloseAnimationEnd={onHide}
        onMouseEnterBackdrop={onMouseEnterBackdrop}
      >
        {children}
      </Menu>
    </div>
  );
};

export default DropdownMenu;
