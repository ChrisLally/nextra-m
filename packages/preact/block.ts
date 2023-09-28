import { Fragment, h } from 'preact';
import { useCallback, useMemo, useRef } from 'preact/hooks';
import {
  block as createBlock,
  mount$,
  patch as patchBlock,
} from '../million/block';
import { Map$, MapGet$, MapHas$, MapSet$ } from '../million/constants';
import { queueMicrotask$ } from '../million/dom';
import { Effect, RENDER_SCOPE } from './constants';
import { unwrap, processProps } from './utils';
import type { MillionProps, Options } from '../types';
import type { VNode } from 'preact';

export const REGISTRY = new Map$<
  (props: MillionProps) => VNode,
  ReturnType<typeof createBlock>
>();

export const block = <P extends MillionProps>(
  fn: ((p?: P) => JSX.Element) | null,
  options: Options = {},
) => {
  const block = MapHas$.call(REGISTRY, fn)
    ? MapGet$.call(REGISTRY, fn)
    : fn
    ? createBlock(fn as any, unwrap as any, options.shouldUpdate)
    : options.block;

  function MillionBlock<P extends MillionProps>(props: P) {
    const ref = useRef<HTMLElement>(null);
    const patch = useRef<((props: P) => void) | null>(null);
    processProps(props);

    patch.current?.(props);

    const effect = useCallback(() => {
      const currentBlock = block(props, props.key, options.shouldUpdate);
      if (ref.current && patch.current === null) {
        queueMicrotask$(() => {
          mount$.call(currentBlock, ref.current!, null);
        });
        patch.current = (props: P) => {
          queueMicrotask$(() => {
            patchBlock(currentBlock, block(props));
          });
        };
      }
    }, []);

    const marker = useMemo(() => {
      return h(RENDER_SCOPE, { ref });
    }, []);

    const vnode = h<P>(Fragment, null, marker, h(Effect, { effect }));

    return vnode;
  }

  if (!MapHas$.call(REGISTRY, MillionBlock)) {
    MapSet$.call(REGISTRY, MillionBlock, block);
  }

  return MillionBlock<P>;
};
