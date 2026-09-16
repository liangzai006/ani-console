import { showMessage } from "@/lib/feedback";

type ValidatableForm<TValues> = {
  validate: () => Promise<TValues>;
};

export async function validateForm<TValues>(form: ValidatableForm<TValues>): Promise<TValues> {
  try {
    return await form.validate();
  } catch (error) {
    showMessage({ type: "error", content: "请检查并修正表单中的错误项" });
    throw error;
  }
}
