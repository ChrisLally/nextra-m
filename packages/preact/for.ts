import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { arrayMount$, arrayPatch$ } from '../million/array';
import { mapArray, block as createBlock } from '../million';
import { MapSet$, MapHas$, MapGet$ } from '../million/constants';
import { queueMicrotask$ } from '../million/dom';
import { REGISTRY } from './block';
import { renderPreactScope } from './utils';
import { RENDER_SCOPE } from './constants';
import type { Block } from '../million';
import type { ArrayCache, MillionArrayProps, MillionProps } from '../types';

export const For = <T>({ each, children }: MillionArrayProps<T>) => {
  const ref = useRef<HTMLElement>(null);
  const fragmentRef = useRef<ReturnType<typeof mapArray> | null>(null);
  const cache = useRef<ArrayCache<T>>({
    each: null,
    children: null,
    mounted: false,
  });
  if (fragmentRef.current && each !== cache.current.each) {
    queueMicrotask$(() => {
      const newChildren = createChildren<T>(each, children, cache);
      arrayPatch$.call(fragmentRef.current, mapArray(newChildren));
    });
  }
  useEffect(() => {
    if (fragmentRef.current) return;
    queueMicrotask$(() => {
      const newChildren = createChildren<T>(each, children, cache);
      fragmentRef.current = mapArray(newChildren);
      arrayMount$.call(fragmentRef.current, ref.current!);
    });
  }, []);

  return h(RENDER_SCOPE, { ref });
};

const createChildren = <T>(
  each: T[],
  getComponent: (value: T, i: number) => JSX.Element,
  cache: { current: ArrayCache<T> },
): Block[] => {
  const children = Array(each.length);
  const currentCache = cache.current;
  for (let i = 0, l = each.length; i < l; ++i) {
    if (currentCache.each && currentCache.each[i] === each[i]) {
      children[i] = currentCache.children?.[i];
      continue;
    }
    const vnode = getComponent(each[i]!, i);

    if (MapHas$.call(REGISTRY, vnode.type)) {
      if (!currentCache.block) {
        currentCache.block = MapGet$.call(REGISTRY, vnode.type)!;
      }
      if (cache.current.block) {
        children[i] = cache.current.block(vnode.props);
      }
    } else {
      const block = createBlock((props?: MillionProps) => {
        return {
          type: RENDER_SCOPE,
          props: { children: [props?.__scope] },
        };
      });
      const currentBlock = (props: MillionProps) => {
        return block({
          props,
          __scope: renderPreactScope(h(vnode.type, props)),
        });
      };

      MapSet$.call(REGISTRY, vnode.type, currentBlock);
      currentCache.block = currentBlock as ReturnType<typeof createBlock>;
      children[i] = currentBlock(vnode.props);
    }
  }
  currentCache.each = each;
  currentCache.children = children;
  return children;
};
