import { unplugin, babelPlugin as babel, type Options } from './plugin';

export const vite = unplugin.vite;
export const webpack = unplugin.webpack;
export const rollup = unplugin.rollup;
export const rspack = unplugin.rspack;
export const esbuild = unplugin.esbuild;
export const next = (
  nextConfig: Record<string, any> = {},
  overrideOptions: Options = {},
) => {
  const millionOptions: Options = {
    mode: 'react',
    server: true,
    ...overrideOptions,
  };
  return {
    ...nextConfig,
    webpack(config: Record<string, any>, webpackOptions: Record<string, any>) {
      config.plugins.unshift(
        webpack({
          mute: webpackOptions.isServer,
          ...millionOptions,
        }),
      );

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, webpackOptions);
      }
      return config;
    },
  };
};

export default {
  vite,
  webpack,
  rollup,
  rspack,
  esbuild,
  next,
  unplugin,
  babel,
};
