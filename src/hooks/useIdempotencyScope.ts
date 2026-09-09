import { useRef } from "react";
import {
  createIdempotencyScope,
  type IdempotencyDependencyList,
  type IdempotencyScope,
} from "@/lib/idempotency";

type HookScopeState = {
  primaryKey: string;
  dependencies: IdempotencyDependencyList;
  scope: IdempotencyScope;
};

function dependenciesEqual(
  left: IdempotencyDependencyList,
  right: IdempotencyDependencyList,
): boolean {
  return (
    left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  );
}

export function useIdempotencyScope(
  primaryKey: string,
  dependencies: IdempotencyDependencyList,
): IdempotencyScope {
  const stateRef = useRef<HookScopeState | undefined>(undefined);
  const state = stateRef.current;
  if (
    !state ||
    state.primaryKey !== primaryKey ||
    !dependenciesEqual(state.dependencies, dependencies)
  ) {
    stateRef.current = {
      primaryKey,
      dependencies: [...dependencies],
      scope: createIdempotencyScope(primaryKey, dependencies),
    };
  }
  return stateRef.current!.scope;
}
