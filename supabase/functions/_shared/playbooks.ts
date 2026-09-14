// Task playbooks distilled from the Egreed coding analysis dataset
// (egreed_coding_analysis_dataset_v1.jsonl — 755 rows, 16 task families).
// The dataset is used here as routing + prompting behaviour, not as stored text.

export type TaskKind =
  | "code_generation" | "debugging" | "root_cause_analysis" | "refactoring"
  | "testing" | "security" | "performance" | "code_review" | "architecture"
  | "api_design" | "documentation" | "requirements_analysis" | "sql_analysis"
  | "data_analysis" | "repository_analysis" | "text_generation";

export const PLAYBOOKS: Record<TaskKind, { label: string; steps: string[] }> = {
  code_generation: {
    label: "Code generation",
    steps: [
      "Restate the requirement and state assumptions only where information is genuinely missing.",
      "Give a production-oriented structure (files, modules, responsibilities).",
      "Write complete, runnable code with input validation, explicit error handling and clear naming.",
      "Add a concise test example that proves the happy path and one edge case.",
    ],
  },
  debugging: {
    label: "Debugging",
    steps: [
      "Trace the failing value through the code and name the exact root cause.",
      "Explain the causal chain in plain words — why it happens, not just where.",
      "Give the minimal corrected code, not a rewrite.",
      "Add a regression test that fails before the fix and passes after.",
    ],
  },
  root_cause_analysis: {
    label: "Root-cause analysis",
    steps: [
      "Separate symptoms from causes.",
      "Form testable hypotheses and name the evidence needed for each.",
      "Rank likely causes by probability and impact.",
      "Propose corrective and preventive actions.",
    ],
  },
  refactoring: {
    label: "Refactoring",
    steps: [
      "Separate concerns and reduce duplication.",
      "Preserve the existing public behaviour and compatibility.",
      "Show the refactored code in full.",
      "Explain the important trade-offs you accepted.",
    ],
  },
  testing: {
    label: "Testing",
    steps: [
      "Cover happy paths.",
      "Cover boundary cases and invalid input.",
      "Cover failure behaviour (timeouts, rejects, permission errors).",
      "Name the regression risks the suite protects.",
    ],
  },
  security: {
    label: "Security review",
    steps: [
      "Look for injection, broken authorization, unsafe input handling, secret exposure, insecure defaults and data leakage.",
      "Flag insecure direct object reference risk: authorization context must come from the authenticated identity, enforced server-side.",
      "Rank findings by severity with concrete exploit paths.",
      "Give the corrected code or policy for each finding.",
    ],
  },
  performance: {
    label: "Performance",
    steps: [
      "Identify the actual bottleneck before changing anything.",
      "Explain the complexity or query cost.",
      "Propose the smallest safe optimization.",
      "Define how the improvement will be measured.",
    ],
  },
  code_review: {
    label: "Code review",
    steps: [
      "Check correctness, security, performance, maintainability, error handling and test coverage.",
      "Prioritize findings by severity.",
      "Give a concrete diff or replacement for each high-severity finding.",
    ],
  },
  architecture: {
    label: "Architecture",
    steps: [
      "Define components and their responsibilities.",
      "Define data flow and interfaces between them.",
      "Define failure boundaries and the testing strategy.",
      "Cover scaling considerations and the trade-offs chosen.",
    ],
  },
  api_design: {
    label: "API design",
    steps: [
      "Define endpoints and contracts (request/response shapes).",
      "Define validation, authentication and authorization per endpoint.",
      "Define status codes and a single consistent error format.",
      "Cover pagination and idempotency where relevant, plus tests.",
    ],
  },
  documentation: {
    label: "Documentation",
    steps: [
      "Document purpose, inputs, outputs and errors.",
      "Document setup and runnable examples.",
      "State assumptions and operational notes.",
    ],
  },
  requirements_analysis: {
    label: "Requirements analysis",
    steps: [
      "Extract functional and non-functional requirements.",
      "Name ambiguities and dependencies.",
      "Define acceptance criteria and risks.",
      "Give a practical implementation plan.",
    ],
  },
  sql_analysis: {
    label: "SQL analysis",
    steps: [
      "Explain what the current query actually returns, including why a join multiplies rows.",
      "Use appropriate aggregation/grouping or a pre-aggregation strategy.",
      "Give the corrected query and how to verify the row counts.",
    ],
  },
  data_analysis: {
    label: "Data analysis",
    steps: [
      "Profile the schema first; quantify missingness and duplicates.",
      "Decide whether duplicates are valid — never silently delete records.",
      "Define cleaning rules, then calculate the relevant metrics.",
      "Identify patterns/anomalies, state limitations, avoid unsupported conclusions.",
    ],
  },
  repository_analysis: {
    label: "Repository analysis",
    steps: [
      "Identify the entry point and the related types/interfaces.",
      "Identify tests, configuration, dependency usage and callers.",
      "Never invent filenames — work only from what exists.",
    ],
  },
  text_generation: {
    label: "Writing",
    steps: [
      "Match the requested language, audience and register.",
      "Lead with the point, then support it.",
      "Keep the structure the user asked for.",
    ],
  },
};

export const QUALITY_REQUIREMENTS = [
  "do not invent facts, files, APIs, libraries or documentation",
  "handle edge cases",
  "state assumptions when necessary",
  "include validation/tests when applicable",
  "never claim code was executed or tested unless it actually was",
  "treat user and external data as untrusted; never expose secrets",
];

const RULES: [TaskKind, RegExp][] = [
  ["debugging", /\b(debug|bug|error|exception|traceback|stack trace|not working|fails?|broken|crash|undefined is not|nullpointer|segfault)\b/i],
  ["root_cause_analysis", /\b(root cause|why (does|is) .* fail|postmortem|incident|intermittent|flaky)\b/i],
  ["security", /\b(security|vulnerab|exploit|injection|sql ?injection|xss|csrf|auth(oriz|entic)ation flaw|rls|secret leak|pentest|owasp)\b/i],
  ["performance", /\b(slow|performance|optimi[sz]e|latency|memory leak|n\+1|bottleneck|speed ?up|scal(e|ing) issue)\b/i],
  ["testing", /\b(test|unit test|integration test|vitest|jest|pytest|coverage|test suite|tdd)\b/i],
  ["refactoring", /\b(refactor|clean ?up|restructure|extract (a )?(function|component|module)|reduce duplication|dry)\b/i],
  ["code_review", /\b(review (my|this) code|code review|critique|audit (my|this) code)\b/i],
  ["api_design", /\b(api design|rest api|endpoint|graphql|openapi|swagger|route(s)? for|webhook)\b/i],
  ["sql_analysis", /\b(sql|query|postgres|join|group by|index|migration|schema)\b/i],
  ["architecture", /\b(architect|system design|design (a|the) system|microservice|scalab|high level design|folder structure)\b/i],
  ["documentation", /\b(document|readme|docstring|api docs|write docs|changelog)\b/i],
  ["requirements_analysis", /\b(requirements?|user stor(y|ies)|acceptance criteria|spec(ification)?|scope)\b/i],
  ["data_analysis", /\b(dataset|data analysis|csv|pandas|dataframe|analy[sz]e (the )?data|statistics)\b/i],
  ["repository_analysis", /\b(this repo|codebase|repository|which file|where is .* defined|project structure)\b/i],
  ["code_generation", /\b(build|create|implement|generate|write|make|develop|add)\b.*\b(app|api|function|component|class|script|endpoint|feature|module|page|crud|website|program)\b|```/i],
];

const TEXT_HINT = /\b(email|essay|article|blog|proposal|report|summar(y|ise|ize)|translate|rewrite|marketing|caption|speech|letter|presentation)\b/i;

export function detectTask(text: string): TaskKind {
  const t = text || "";
  if (TEXT_HINT.test(t) && !/```/.test(t)) return "text_generation";
  for (const [kind, re] of RULES) if (re.test(t)) return kind;
  return "text_generation";
}

const CODE_HINT = /\b(code|coding|program|function|class|api|endpoint|database|schema|sql|bug|error|test|refactor|deploy|typescript|javascript|python|java|kotlin|swift|rust|golang|go lang|c\+\+|c#|php|dart|flutter|react|node|next\.js|django|flask|spring|docker|kubernetes|git|regex|algorithm|architecture|security|migration)\b|```/i;

export function isEngineeringTask(text: string, kind: TaskKind): boolean {
  return kind !== "text_generation" || CODE_HINT.test(text || "");
}

/** The system-prompt block that turns a detected task into real behaviour. */
export function playbookPrompt(kind: TaskKind): string {
  const pb = PLAYBOOKS[kind];
  return [
    `TASK FAMILY: ${pb.label}`,
    "Work through these steps in order and show the result of each one that carries information:",
    ...pb.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "QUALITY REQUIREMENTS (non-negotiable):",
    ...QUALITY_REQUIREMENTS.map((q) => `- ${q}`),
    "",
    "WORK-FIRST: if the user asks you to build, create, implement, fix or make something, do the work — produce the actual code/schema/tests. Never answer with a tutorial when an implementation is possible.",
    "Always finish with a short VALIDATION section: what you verified by reading the code, what still needs to be run locally, and the exact commands to run it.",
  ].join("\n");
}
