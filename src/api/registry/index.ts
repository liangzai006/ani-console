import { coreRequest } from "@/api/request";
import type {
  RegistryImageListParams,
  RegistryImageListResponse,
  RegistryArtifactListResponse,
  RegistryRepositoryListResponse,
  RegistryProjectListResponse,
  RegistryPushInstructions,
  RegistryTagDeleteResult,
} from "./types";

const projectPath = (project: string) => `/registry/projects/${encodeURIComponent(project)}`;

export function listRegistryProjects(
  params: { limit?: number; cursor?: string } = {},
): Promise<RegistryProjectListResponse> {
  return coreRequest<RegistryProjectListResponse>("/registry/projects", {
    method: "GET",
    params,
  });
}

export function listRegistryImages(
  params: RegistryImageListParams = {},
): Promise<RegistryImageListResponse> {
  return coreRequest<RegistryImageListResponse>("/registry/images", { method: "GET", params });
}

export function listRegistryRepositories(
  project: string,
  params: { limit?: number; cursor?: string } = {},
): Promise<RegistryRepositoryListResponse> {
  return coreRequest<RegistryRepositoryListResponse>(`${projectPath(project)}/repositories`, {
    method: "GET",
    params,
  });
}

export function listRegistryArtifacts(
  project: string,
  repository: string,
  params: { limit?: number; cursor?: string } = {},
): Promise<RegistryArtifactListResponse> {
  return coreRequest<RegistryArtifactListResponse>(
    `${projectPath(project)}/repositories/${encodeURIComponent(repository)}/artifacts`,
    { method: "GET", params },
  );
}

export function getRegistryPushInstructions(
  project: string,
  repository: string,
): Promise<RegistryPushInstructions> {
  return coreRequest<RegistryPushInstructions>(`${projectPath(project)}/push-instructions`, {
    method: "GET",
    params: { repository },
  });
}

export function deleteRegistryTag(
  project: string,
  repository: string,
  tag: string,
): Promise<RegistryTagDeleteResult> {
  return coreRequest<RegistryTagDeleteResult>(
    `${projectPath(project)}/repositories/${encodeURIComponent(repository)}/tags/${encodeURIComponent(tag)}`,
    { method: "DELETE" },
  );
}

export type {
  RegistryArtifact,
  RegistryArtifactListResponse,
  RegistryImage,
  RegistryImageListParams,
  RegistryImageListResponse,
  RegistryProject,
  RegistryProjectListResponse,
  RegistryRepository,
  RegistryRepositoryListResponse,
  RegistryPurpose,
  RegistryPushInstructions,
  RegistryScanResult,
  RegistryScanState,
  RegistryTagDeleteResult,
} from "./types";
