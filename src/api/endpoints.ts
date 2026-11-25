import {
  apiRawFetch,
  apiRequest,
  downloadAuthenticatedExport,
  getStoredJwt,
  isCookieAuthMode,
  resolveApiUrl,
} from './client';
import { streamSse } from './sse';
import {
  AuthConfigResponse,
  ChatReq,
  ChatResponse,
  DeleteProjectResponse,
  DesignReq,
  DesignResponse,
  DesignStreamEvent,
  DrcReport,
  ExportFormat,
  FinishResponse,
  HealthResponse,
  MeResponse,
  NetlistReq,
  NetlistResponse,
  Part,
  PartSearchReq,
  PartSearchResponse,
  PlaceResponse,
  ProjectDetail,
  ProjectListResponse,
  RootMetaResponse,
  RouteReq,
  RouteResponse,
  RoutingJobStreamEvent,
} from './types';

export const api = {
  getRoot: () => apiRequest<RootMetaResponse>('/'),
  getHealth: () => apiRequest<HealthResponse>('/health'),

  // Auth
  getAuthConfig: () => apiRequest<AuthConfigResponse>('/api/auth/config'),
  getMe: () => apiRequest<MeResponse>('/api/v1/me'),
  getAuthSession: () => apiRequest<Record<string, unknown>>('/api/auth/get-session'),
  getAuthToken: () => apiRequest<{ token?: string; jwt?: string }>('/api/auth/token'),
  signInEmail: (email: string, password: string) =>
    apiRequest<Record<string, unknown>>('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  signUpEmail: (name: string, email: string, password: string) =>
    apiRequest<Record<string, unknown>>('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  signOut: () =>
    apiRequest<Record<string, unknown>>('/api/auth/sign-out', {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  // Projects
  listProjects: () => apiRequest<ProjectListResponse>('/api/v1/projects'),
  getProject: (pid: string) =>
    apiRequest<ProjectDetail>(`/api/v1/projects/${encodeURIComponent(pid)}`),
  deleteProject: (pid: string) =>
    apiRequest<DeleteProjectResponse>(`/api/v1/projects/${encodeURIComponent(pid)}`, {
      method: 'DELETE',
    }),

  // End-to-End AI Design & Chat
  runDesign: (req: DesignReq) =>
    apiRequest<DesignResponse>('/api/v1/design', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  streamDesign: async (
    req: DesignReq,
    onEvent: (eventName: string, data: DesignStreamEvent) => void,
    signal?: AbortSignal,
  ) => {
    const jwt = getStoredJwt();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (jwt) headers.Authorization = `Bearer ${jwt}`;

    await streamSse<DesignStreamEvent>(
      resolveApiUrl('/api/v1/design/stream'),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(req),
        credentials: jwt ? 'omit' : isCookieAuthMode() ? 'include' : 'same-origin',
      },
      onEvent,
      signal,
    );
  },

  chatProject: (pid: string, req: ChatReq) =>
    apiRequest<ChatResponse>(`/api/v1/projects/${encodeURIComponent(pid)}/chat`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  // Parts & Octopart
  searchParts: (req: PartSearchReq) =>
    apiRequest<PartSearchResponse>('/api/v1/parts/search', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  searchOctopart: (req: PartSearchReq) =>
    apiRequest<PartSearchResponse>('/api/v1/parts/octopart/search', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  lookupOctopartMpn: (mpn: string) =>
    apiRequest<Part>(`/api/v1/parts/octopart/${encodeURIComponent(mpn)}`),

  // Granular 5-Stage Pipeline
  runNetlist: (pid: string, req: NetlistReq) =>
    apiRequest<NetlistResponse>(`/api/v1/projects/${encodeURIComponent(pid)}/netlist`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  placeBoard: (pid: string, formData: FormData) =>
    apiRequest<PlaceResponse>(`/api/v1/projects/${encodeURIComponent(pid)}/place`, {
      method: 'POST',
      body: formData,
      skipJsonContentType: true,
    }),

  startRoute: (pid: string, req: RouteReq) =>
    apiRequest<RouteResponse>(`/api/v1/projects/${encodeURIComponent(pid)}/route`, {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  streamRouteJob: async (
    jid: string,
    onEvent: (eventName: string, data: RoutingJobStreamEvent) => void,
    signal?: AbortSignal,
  ) => {
    const jwt = getStoredJwt();
    const headers: Record<string, string> = {};
    if (jwt) headers.Authorization = `Bearer ${jwt}`;

    await streamSse<RoutingJobStreamEvent>(
      resolveApiUrl(`/api/v1/jobs/${encodeURIComponent(jid)}/stream`),
      {
        method: 'GET',
        headers,
        credentials: jwt ? 'omit' : isCookieAuthMode() ? 'include' : 'same-origin',
      },
      onEvent,
      signal,
    );
  },

  finishRouting: (pid: string) =>
    apiRequest<FinishResponse>(`/api/v1/projects/${encodeURIComponent(pid)}/finish`, {
      method: 'POST',
    }),

  // Stage 5 Exports & DRC
  exportProjectText: async (pid: string, format: Exclude<ExportFormat, 'gerber'>): Promise<string> => {
    const res = await apiRawFetch(
      `/api/v1/projects/${encodeURIComponent(pid)}/export?format=${encodeURIComponent(format)}`,
    );
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || `Export ${format} failed (${res.status})`);
    }
    return text;
  },

  downloadProjectExport: (pid: string, format: ExportFormat) => {
    const extMap: Record<ExportFormat, string> = {
      kicad_pcb: `${pid}.kicad_pcb`,
      kicad_sch: `${pid}.kicad_sch`,
      schematic_svg: `${pid}_schematic.svg`,
      svg: `${pid}_pcb.svg`,
      bom: `${pid}_bom.csv`,
      gerber: `${pid}_fab.zip`,
    };
    return downloadAuthenticatedExport(
      `/api/v1/projects/${encodeURIComponent(pid)}/export?format=${encodeURIComponent(format)}`,
      extMap[format],
    );
  },

  runDrc: (pid: string) =>
    apiRequest<DrcReport>(`/api/v1/projects/${encodeURIComponent(pid)}/drc`),
};
