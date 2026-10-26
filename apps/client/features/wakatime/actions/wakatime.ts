"use server";

import type { WakaTimeConnectionResponse } from "@repo/contracts";
import { revalidatePath } from "next/cache";

import { apiFetch, type MutationError, toMutationError } from "@/lib/api";

export type WakaTimeConnectResult =
  { status: "success"; connection: WakaTimeConnectionResponse } | MutationError;

export type WakaTimeDisconnectResult = { status: "success" } | MutationError;

export interface ConnectWakaTimeInput {
  apiKey: string;
  confirmAccountChange?: boolean;
}

const validKey = (value: unknown): value is string =>
  typeof value === "string" && /^\S{1,255}$/.test(value);

export async function connectWakaTime(
  input: ConnectWakaTimeInput,
): Promise<WakaTimeConnectResult> {
  const apiKey = typeof input?.apiKey === "string" ? input.apiKey.trim() : null;
  if (!validKey(apiKey)) {
    return {
      status: "error",
      message: "Dán API key WakaTime (Không có khoảng trắng) rồi thử lại",
    };
  }

  let connection: WakaTimeConnectionResponse;
  try {
    connection = await apiFetch<WakaTimeConnectionResponse>(
      "/integrations/wakatime",
      {
        method: "PUT",
        body: JSON.stringify({
          apiKey,
          confirmAccountChange: input.confirmAccountChange === true,
        }),
      },
    );
  } catch (error) {
    return toMutationError(error);
  }

  revalidatePath("/settings");
  return { status: "success", connection };
}

export async function disconnectWakaTime(): Promise<WakaTimeDisconnectResult> {
  try {
    await apiFetch<void>("/integrations/wakatime", { method: "DELETE" });
  } catch (error) {
    return toMutationError(error);
  }

  revalidatePath("/settings");
  return {
    status: "success",
  };
}
