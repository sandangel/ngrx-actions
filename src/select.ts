import { Injectable } from '@angular/core';
import { Store, Selector } from '@ngrx/store';

@Injectable()
export class NgrxSelect {
  static store: Store<any> | undefined = undefined;
  connect(store: Store<any>) {
    NgrxSelect.store = store;
  }
}

export function Select<TState = any, TValue = any>(
  selector: Selector<TState, TValue>
): (target: any, name: string) => void;
export function Select<TState = any, TValue = any>(
  selectorOrFeature?: string,
  ...paths: string[]
): (target: any, name: string) => void;
export function Select<TState = any, TValue = any>(
  selectorOrFeature?: string | Selector<TState, TValue>,
  ...paths: string[]
) {
  return function(target: any, name: string): void {
    let fn: Selector<TState, TValue>;
    // Nothing here? Use propery name as selector
    if (!selectorOrFeature) {
      selectorOrFeature = name;
    }
    // Handle string vs Selector<TState, TValue>
    if (typeof selectorOrFeature === 'string') {
      const propsArray = paths.length ? [selectorOrFeature, ...paths] : selectorOrFeature.split('.');
      fn = fastPropGetter(propsArray);
    } else {
      fn = selectorOrFeature;
    }
    // Redefine property
    if (delete target[name]) {
      Object.defineProperty(target, name, {
        get: () => {
          // get connected store
          const store = NgrxSelect.store;
          if (!store) {
            throw new Error('NgrxSelect not connected to store!');
          }
          return store.select(fn);
        },
        enumerable: true,
        configurable: true
      });
    }
  };
}

/**
 * The generated function is faster than:
 * - pluck (Observable operator)
 * - memoize (old ngrx-actions implementation)
 * - MemoizedSelector (ngrx)
 * @param path
 */
export function fastPropGetter(paths: string[]): (x: any) => any {
  const segments = paths;
  let seg = 'store.' + segments[0],
    i = 0;
  const l = segments.length;
  let expr = seg;
  while (++i < l) {
    expr = expr + ' && ' + (seg = seg + '.' + segments[i]);
  }
  const fn = new Function('store', 'return ' + expr + ';');
  return <(x: any) => any>fn;
}
