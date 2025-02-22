import type { FC } from 'react';
import React, { memo } from 'react';
import { Bundles } from '../../util/moduleLoader';

import useModuleLoader from '../../hooks/useModuleLoader';
import Loading from '../ui/Loading';

const AuthCodeAsync: FC = () => {
  const AuthCode = useModuleLoader(Bundles.Auth, 'AuthCode');

  return AuthCode ? <AuthCode /> : <Loading />;
};

export default memo(AuthCodeAsync);
