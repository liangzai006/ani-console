import axios from "axios";
import type {
  IdempotencyBody,
  IdempotencyDependencyList,
  IdempotencyScope,
} from "@/lib/idempotency";

export async function runIdempotentRequest<TSubmit extends object, TResult>(
  scope: IdempotencyScope,
  submitData: TSubmit,
  request: (body: TSubmit & { idempotency_key: string }) => Promise<TResult>,
  runtimeDependencies: IdempotencyDependencyList = [],
): Promise<TResult> {
  const body = scope.withKey(submitData as IdempotencyBody, runtimeDependencies) as TSubmit & {
    idempotency_key: string;
  };
  try {
    const result = await request(body);
    scope.reset(runtimeDependencies);
    return result;
  } catch (error) {
    if (axios.isCancel(error)) scope.reset(runtimeDependencies);
    throw error;
  }
}
