import { useEffect } from "react";
import {
  BundleModules,
  Bundles,
  getModuleFromMemory,
  loadModule,
  addLoadListener,
} from "../util/moduleLoader";

import useForceUpdate from "./useForceUpdate";

const useModuleLoader = <B extends Bundles, M extends BundleModules<B>>(
  bundleName: B,
  moduleName: M,
  noLoad = false,
  autoUpdate = false
) => {
  const module = getModuleFromMemory(bundleName, moduleName);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    if (!autoUpdate) {
      return undefined;
    }

    return addLoadListener(forceUpdate);
  }, [autoUpdate, forceUpdate]);

  useEffect(() => {
    if (!noLoad && !module) {
      loadModule(bundleName).then(forceUpdate);
    }
  }, [bundleName, forceUpdate, module, moduleName, noLoad]);

  return module;
};

export default useModuleLoader;
