export type PinType =
  | 'power_in'
  | 'power_out'
  | 'ground'
  | 'passive'
  | 'input'
  | 'output'
  | 'bidir'
  | 'nc';

export interface Pin {
  num: string;
  name: string;
  type: PinType;
}

export interface Part {
  mpn: string;
  lcsc_id: string;
  category: string;
  package: string;
  description: string;
  manufacturer: string;
  value: string;
  price: number;
  stock: number;
  voltage_max: number | null;
  footprint_ref: string;
  pins: Pin[];
  score: number | null;
  octopart_url: string;
}

export interface SourcingEntry {
  ref: string;
  role?: string;
  mpn: string | null;
  lcsc_id?: string;
  footprint_ref?: string;
  source:
    | 'local_exact'
    | 'local_search'
    | 'octopart'
    | 'local_fallback'
    | 'preset'
    | 'not_found';
  price?: number;
  stock?: number;
  octopart_url?: string;
  query?: string;
}

export interface NetlistComponentRef {
  ref: string;
  mpn: string;
  lcsc_id: string;
  value: string;
  footprint_ref: string;
  package: string;
}

export interface Netlist {
  nets: Record<string, [ref: string, pinNum: string][]>;
  net_classes: Record<string, 'power' | 'signal' | 'diff_pair' | string>;
  components?: NetlistComponentRef[];
}

export interface Placement {
  ref: string;
  x: number;
  y: number;
  rotation: number;
}

export interface LayoutRules {
  edge_components: string[];
  clusters: string[][];
}

export interface PlacementMetrics {
  hpwl_mm: number;
  overlaps: number;
  cost: number;
  rules: LayoutRules;
}

export interface DrcViolation {
  type: string;
  severity: 'error' | 'warning' | string;
  description: string;
  items?: unknown[];
}

export interface DrcReport {
  engine: 'kicad-cli' | 'builtin';
  kicad_version?: string;
  passed: boolean;
  error_count: number;
  warning_count: number;
  unconnected_count: number;
  violations: DrcViolation[];
  unconnected_items?: unknown[];
}

export interface RoutingResult {
  output_path: string;
  engine: 'pcbworld' | 'astar' | 'mock';
  final_metrics: Record<string, number | string | boolean>;
}

export interface ExportsMap {
  kicad_pcb: string;
  kicad_sch: string;
  schematic_svg: string;
  pcb_svg: string;
  bom: string;
  gerber: string;
  drc: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RootMetaResponse {
  service: string;
  version: string;
  mode: string;
  docs: string;
  redoc: string;
  openapi: string;
  health: string;
  auth_config: string;
}

export interface HealthResponse {
  ok: boolean;
  parts: number;
  database: {
    backend: 'postgres' | 'sqlite' | string;
    connected: boolean;
    pooled?: boolean;
    branch?: string;
    branch_id?: string;
    database?: string;
    postgres_version?: string;
  };
  auth: {
    enabled: boolean;
    required: boolean;
    provider: string;
    jwks_configured: boolean;
  };
  llm: boolean;
  octopart: boolean;
  worker: string;
  worker_health: {
    ok: boolean;
    kicad_cli: boolean;
    kicad_version?: string;
    pcbworld?: Record<string, boolean>;
    active_router?: string;
    checkpoints?: number;
  } | null;
  router_engine: string;
  active_router: 'pcbworld' | 'astar' | 'mock' | string;
  kicad_cli: boolean;
}

export interface AuthConfigResponse {
  enabled: boolean;
  required: boolean;
  proxy_base_url: string;
  neon_auth_base_url: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  email_verified?: boolean;
}

export interface MeResponse {
  authenticated: boolean;
  auth_enabled: boolean;
  user: AuthUser | null;
}

export interface DesignReq {
  prompt: string;
  project_id?: string | null;
  board_width_mm?: number | null;
  board_height_mm?: number | null;
  auto_route?: boolean;
  prefer_octopart?: boolean;
  iterations?: number;
  checkpoint?: string;
  max_steps?: number;
  seed?: number;
}

export interface DesignResponse {
  project_id: string;
  board_name: string;
  summary: string;
  review: string | null;
  board_mm: { width: number; height: number };
  components: SourcingEntry[];
  bom_unit_cost_usd: number;
  netlist: Netlist;
  erc_status: string;
  erc_warnings: string[];
  placements: Placement[];
  placement_metrics: PlacementMetrics;
  routing: RoutingResult | null;
  drc: DrcReport | null;
  schematic_svg: string | null;
  pcb_svg: string | null;
  bom_csv: string | null;
  exports: ExportsMap;
}

export interface ChatReq {
  message: string;
  auto_route?: boolean;
  iterations?: number;
  max_steps?: number;
  checkpoint?: string;
}

export type ChatAction =
  | 'answer_only'
  | 'update_board_size'
  | 're_place'
  | 'add_or_swap_parts'
  | 'full_redesign'
  | 'new_design';

export interface ChatResponse {
  project_id: string;
  action: ChatAction;
  reply: string;
  design: DesignResponse | null;
}

export interface ProjectSummary {
  project_id: string;
  owner_user_id: string | null;
  board_name: string;
  prompt: string;
  component_count: number;
  has_board: boolean;
  has_schematic: boolean;
  drc_passed: boolean | null;
  updated_at: string;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
}

export interface DesignBrief {
  prompt?: string;
  board_name?: string;
  summary?: string;
  board_width_mm?: number;
  board_height_mm?: number;
  power_rails?: string[];
  interfaces?: string[];
  part_specs?: unknown[];
  [key: string]: unknown;
}

export interface ProjectDetail {
  project_id: string;
  owner_user_id: string | null;
  design_brief: DesignBrief | null;
  components: SourcingEntry[] | Record<string, Part> | null;
  parts: Record<string, Part> | null;
  netlist: Netlist | null;
  placements: Placement[] | null;
  drc: DrcReport | null;
  review: string | null;
  chat_history: ChatMessage[];
  exports: ExportsMap;
}

export interface DeleteProjectResponse {
  deleted: boolean;
  project_id: string;
}

export interface PartSearchFilters {
  in_stock?: boolean;
  v_in_min?: number;
  package?: string | string[];
  category?: string;
  value?: string;
}

export interface PartSearchReq {
  query: string;
  filters?: PartSearchFilters;
  k?: number;
  engine?: 'auto' | 'local' | 'octopart' | 'nexar';
}

export interface PartSearchResponse {
  results: Part[];
  engine: 'local' | 'octopart' | 'octopart_fallback' | string;
}

export interface NetlistPartOverride {
  ref: string;
  mpn: string;
}

export interface NetlistReq {
  prompt: string;
  parts?: NetlistPartOverride[] | null;
}

export interface NetlistResponse {
  netlist_id: string;
  netlist: Netlist;
  erc_status: string;
  warnings: string[];
  schematic_svg: string;
}

export interface PlaceResponse {
  mode: 'netlist' | 'scraped';
  board_file_url: string;
  placements: Placement[];
  hpwl_mm: number;
  overlaps: number;
  layout_rules: LayoutRules;
  zones_preserved: number;
  svg: string;
}

export interface RouteReq {
  board_file?: string | null;
  checkpoint?: string;
  max_steps?: number;
}

export interface RouteResponse {
  job_id: string;
}

export interface FinishResponse {
  output_path: string;
}

export interface RoutingStepEvent {
  type: 'routing_step' | 'step';
  step: number;
  connected_nets: number;
  total_nets: number;
  unrouted_count?: number;
  vias?: number;
  drc_violations?: number;
  ratsnest_reduction?: number;
  engine?: string;
  svg_snapshot?: string;
}

export interface DesignStreamEvent {
  type: 'stage' | 'routing_step' | 'done' | 'error';
  stage?:
    | 'requirements'
    | 'components'
    | 'netlist'
    | 'schematic'
    | 'placement'
    | 'routing'
    | 'drc';
  status?: 'running' | 'done';
  project_id?: string;
  brief?: DesignBrief;
  count?: number;
  components?: SourcingEntry[];
  erc_status?: string;
  erc_warnings?: string[];
  net_count?: number;
  schematic_svg?: string;
  board_mm?: [number, number];
  hpwl_mm?: number;
  overlaps?: number;
  pcb_svg?: string;
  routing?: RoutingResult;
  drc?: DrcReport;
  result?: DesignResponse;
  step?: number;
  connected_nets?: number;
  total_nets?: number;
  unrouted_count?: number;
  vias?: number;
  drc_violations?: number;
  ratsnest_reduction?: number;
  engine?: string;
  svg_snapshot?: string;
  error?: string;
  message?: string;
}

export interface RoutingJobStreamEvent {
  type: 'step' | 'done' | 'error';
  step?: number;
  connected_nets?: number;
  total_nets?: number;
  unrouted_count?: number;
  vias?: number;
  drc_violations?: number;
  ratsnest_reduction?: number;
  engine?: string;
  svg_snapshot?: string;
  output_path?: string;
  final_metrics?: Record<string, number | string | boolean>;
  message?: string;
  error?: string;
  trace?: string;
}

export type ExportFormat =
  | 'kicad_pcb'
  | 'kicad_sch'
  | 'schematic_svg'
  | 'svg'
  | 'bom'
  | 'gerber';

export interface ApiTraceEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number | null;
  durationMs: number;
  ok: boolean;
  preview: string;
}
