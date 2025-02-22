import { useMemo } from 'react';
import { getActions } from '../global';

import type { ApiSendMessageAction } from '../api/types';

import { SEND_MESSAGE_ACTION_INTERVAL } from '../config';
import { throttle } from '../util/schedulers';
import { ThreadId } from '../types';

const useSendMessageAction = (chatId?: string, threadId?: ThreadId) => {
  return useMemo(() => {
    return throttle((action: ApiSendMessageAction) => {
      if (!chatId || !threadId) return;
      getActions().sendMessageAction({ chatId, threadId, action });
    }, SEND_MESSAGE_ACTION_INTERVAL);
  }, [chatId, threadId]);
};

export default useSendMessageAction;
