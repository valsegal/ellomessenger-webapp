import classNames from 'classnames';
import React, {
  FC,
  ChangeEvent,
  FormEvent,
  RefObject,
  memo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';

type OwnProps = {
  ref?: RefObject<HTMLTextAreaElement>;
  id?: string;
  className?: string;
  value?: string;
  label?: string;
  error?: string;
  success?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  maxLengthIndicator?: string;
  tabIndex?: number;
  as_disabled?: boolean;
  inputMode?:
    | 'text'
    | 'none'
    | 'tel'
    | 'url'
    | 'email'
    | 'numeric'
    | 'decimal'
    | 'search';
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onInput?: (e: FormEvent<HTMLTextAreaElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  noReplaceNewlines?: boolean;
};

const TextArea: FC<OwnProps> = ({
  ref,
  id,
  className,
  value,
  label,
  error,
  success,
  disabled,
  readOnly,
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  maxLengthIndicator,
  tabIndex,
  as_disabled,
  onChange,
  onInput,
  onKeyPress,
  onKeyDown,
  onBlur,
  onPaste,
  noReplaceNewlines,
}) => {
  // eslint-disable-next-line no-null/no-null
  let textareaRef = useRef<HTMLTextAreaElement>(null);
  if (ref) {
    textareaRef = ref;
  }

  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir(i18n.language) === 'rtl';

  const labelText = error || success || label;
  const fullClassName = classNames(
    'input',
    className,
    error ? 'error' : success && 'success',
    { touched: value, disabled: readOnly || disabled, 'with-label': labelText }
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (!noReplaceNewlines) {
        const previousSelectionEnd = e.currentTarget.selectionEnd;
        // TDesktop replaces newlines with spaces as well
        e.currentTarget.value = e.currentTarget.value.replace(/\n/g, ' ');
        e.currentTarget.selectionEnd = previousSelectionEnd;
      }
      e.currentTarget.style.height = '0';
      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
      onChange?.(e);
    },
    [noReplaceNewlines, onChange]
  );

  return (
    <div className={fullClassName} dir={isRtl ? 'rtl' : undefined}>
      <div className='input-wrapper'>
        <textarea
          ref={textareaRef}
          className={classNames('form-control', { 'as-disabled': as_disabled })}
          id={id}
          dir='auto'
          value={value || ''}
          tabIndex={tabIndex}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          readOnly={readOnly}
          onChange={handleChange}
          onInput={onInput}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onPaste={onPaste}
          aria-label={labelText}
        />
        {labelText && <label htmlFor={id}>{labelText}</label>}
        {maxLengthIndicator && (
          <div className='max-length-indicator'>{maxLengthIndicator}</div>
        )}
      </div>
    </div>
  );
};

export default memo(TextArea);
