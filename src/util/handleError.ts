import { DEBUG_ALERT_MSG } from '../config';
import { throttle } from './schedulers';
import { getAllMultitabTokens } from './establishMultitabRole';
import { IS_MULTITAB_SUPPORTED } from './windowEnvironment';

window.addEventListener('error', handleErrorEvent);
window.addEventListener('unhandledrejection', handleErrorEvent);

// eslint-disable-next-line prefer-destructuring
const APP_ENV = process.env.APP_ENV;

function handleErrorEvent(e: ErrorEvent | PromiseRejectionEvent) {
  // https://stackoverflow.com/questions/49384120/resizeobserver-loop-limit-exceeded
  if (
    e instanceof ErrorEvent &&
    e.message === 'ResizeObserver loop limit exceeded'
  ) {
    return;
  }

  e.preventDefault();

  handleError(e instanceof ErrorEvent ? e.error || e.message : e.reason);
}

const throttledAlert = throttle((message: string) => {
  if (IS_MULTITAB_SUPPORTED && getAllMultitabTokens().length > 1) {
    return;
  }
  // eslint-disable-next-line no-alert
  window.alert(message);
}, 1000);

export function handleError(err: Error) {
  // eslint-disable-next-line no-console
  console.error(err);

  throttledAlert(`${DEBUG_ALERT_MSG}\n\n${err?.message || err}\n${err?.stack}`);
}
