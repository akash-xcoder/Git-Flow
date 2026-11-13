export interface CategoryStyleConfig {
  category: string;
  label: string;
  borderClass: string;
  selectedBorderClass: string;
  hoverBorderClass: string;
  accentTextClass: string;
  handleBgClass: string;
  borderHex: string;
}

const DEFAULT_STYLE: CategoryStyleConfig = {
  category: "default",
  label: "",
  borderClass: "border-gray-700",
  selectedBorderClass:
    "border-[#00f3ff] shadow-[0_0_18px_rgba(0,243,255,0.35)]",
  hoverBorderClass:
    "hover:border-[#00f3ff] hover:shadow-[0_0_15px_rgba(0,243,255,0.3)]",
  accentTextClass: "text-[#00f3ff]/85",
  handleBgClass: "!bg-[#00f3ff]",
  borderHex: "#374151",
};

const CATEGORY_STYLES: Record<string, CategoryStyleConfig> = {
  api: {
    category: "api",
    label: "api",
    borderClass: "border-cyan-400/80",
    selectedBorderClass:
      "border-[#00f3ff] shadow-[0_0_18px_rgba(0,243,255,0.4)]",
    hoverBorderClass:
      "hover:border-[#00f3ff] hover:shadow-[0_0_15px_rgba(0,243,255,0.3)]",
    accentTextClass: "text-cyan-300",
    handleBgClass: "!bg-[#00f3ff]",
    borderHex: "#22d3ee",
  },
  database: {
    category: "database",
    label: "database",
    borderClass: "border-purple-400/80",
    selectedBorderClass:
      "border-purple-400 shadow-[0_0_18px_rgba(192,132,252,0.4)]",
    hoverBorderClass:
      "hover:border-purple-300 hover:shadow-[0_0_15px_rgba(192,132,252,0.3)]",
    accentTextClass: "text-purple-300",
    handleBgClass: "!bg-purple-400",
    borderHex: "#c084fc",
  },
  service: {
    category: "service",
    label: "service",
    borderClass: "border-yellow-400/80",
    selectedBorderClass:
      "border-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.4)]",
    hoverBorderClass:
      "hover:border-yellow-300 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]",
    accentTextClass: "text-yellow-300",
    handleBgClass: "!bg-yellow-400",
    borderHex: "#facc15",
  },
  source: {
    category: "source",
    label: "source",
    borderClass: "border-emerald-400/75",
    selectedBorderClass:
      "border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.38)]",
    hoverBorderClass:
      "hover:border-emerald-300 hover:shadow-[0_0_15px_rgba(52,211,153,0.28)]",
    accentTextClass: "text-emerald-300",
    handleBgClass: "!bg-emerald-400",
    borderHex: "#34d399",
  },
  pipeline: {
    category: "pipeline",
    label: "pipeline",
    borderClass: "border-indigo-400/75",
    selectedBorderClass:
      "border-indigo-400 shadow-[0_0_18px_rgba(129,140,248,0.38)]",
    hoverBorderClass:
      "hover:border-indigo-300 hover:shadow-[0_0_15px_rgba(129,140,248,0.28)]",
    accentTextClass: "text-indigo-300",
    handleBgClass: "!bg-indigo-400",
    borderHex: "#818cf8",
  },
  artifact: {
    category: "artifact",
    label: "artifact",
    borderClass: "border-rose-400/75",
    selectedBorderClass:
      "border-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.38)]",
    hoverBorderClass:
      "hover:border-rose-300 hover:shadow-[0_0_15px_rgba(251,113,133,0.28)]",
    accentTextClass: "text-rose-300",
    handleBgClass: "!bg-rose-400",
    borderHex: "#fb7185",
  },
  deployment: {
    category: "deployment",
    label: "deployment",
    borderClass: "border-blue-400/75",
    selectedBorderClass:
      "border-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.38)]",
    hoverBorderClass:
      "hover:border-blue-300 hover:shadow-[0_0_15px_rgba(96,165,250,0.28)]",
    accentTextClass: "text-blue-300",
    handleBgClass: "!bg-blue-400",
    borderHex: "#60a5fa",
  },
  ui: {
    category: "ui",
    label: "ui",
    borderClass: "border-sky-400/75",
    selectedBorderClass:
      "border-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.38)]",
    hoverBorderClass:
      "hover:border-sky-300 hover:shadow-[0_0_15px_rgba(56,189,248,0.28)]",
    accentTextClass: "text-sky-300",
    handleBgClass: "!bg-sky-400",
    borderHex: "#38bdf8",
  },
  security: {
    category: "security",
    label: "security",
    borderClass: "border-orange-400/75",
    selectedBorderClass:
      "border-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.38)]",
    hoverBorderClass:
      "hover:border-orange-300 hover:shadow-[0_0_15px_rgba(251,146,60,0.28)]",
    accentTextClass: "text-orange-300",
    handleBgClass: "!bg-orange-400",
    borderHex: "#fb923c",
  },
  config: {
    category: "config",
    label: "config",
    borderClass: "border-slate-400/75",
    selectedBorderClass:
      "border-slate-300 shadow-[0_0_18px_rgba(148,163,184,0.35)]",
    hoverBorderClass:
      "hover:border-slate-300 hover:shadow-[0_0_15px_rgba(148,163,184,0.25)]",
    accentTextClass: "text-slate-300",
    handleBgClass: "!bg-slate-400",
    borderHex: "#94a3b8",
  },
  testing: {
    category: "testing",
    label: "testing",
    borderClass: "border-lime-400/75",
    selectedBorderClass:
      "border-lime-400 shadow-[0_0_18px_rgba(163,230,53,0.35)]",
    hoverBorderClass:
      "hover:border-lime-300 hover:shadow-[0_0_15px_rgba(163,230,53,0.25)]",
    accentTextClass: "text-lime-300",
    handleBgClass: "!bg-lime-400",
    borderHex: "#a3e635",
  },
};

const CATEGORY_ALIASES: Record<string, string> = {
  db: "database",
  postgres: "database",
  sql: "database",
  store: "database",
  storage: "database",
  endpoint: "api",
  rest: "api",
  graphql: "api",
  route: "api",
  worker: "service",
  backend: "service",
  microservice: "service",
  frontend: "ui",
  component: "ui",
  test: "testing",
  tests: "testing",
  qa: "testing",
  auth: "security",
  repo: "source",
  ci: "pipeline",
  cd: "pipeline",
  workflow: "pipeline",
  deploy: "deployment",
  infra: "deployment",
};

export function resolveNodeCategory(
  propCategory?: string | null,
  dataCategory?: string | null
): string | undefined {
  const raw =
    typeof propCategory === "string" && propCategory.trim()
      ? propCategory
      : typeof dataCategory === "string" && dataCategory.trim()
      ? dataCategory
      : undefined;

  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  return CATEGORY_ALIASES[normalized] ?? normalized;
}

export function getNodeCategoryStyle(
  category?: string | null
): CategoryStyleConfig {
  const resolved = resolveNodeCategory(category);
  if (!resolved) return DEFAULT_STYLE;
  if (CATEGORY_STYLES[resolved]) return CATEGORY_STYLES[resolved];

  return {
    ...DEFAULT_STYLE,
    category: resolved,
    label: resolved,
  };
}
