/**
 * phase-tracker.ts — PostToolUse hook module.
 *
 * Detects pipeline phase transitions by observing Agent/Skill tool calls
 * and mapping agent names to phase numbers.
 */

import type { HookCallback, HookCallbackOutput } from "./types";

export interface PhaseTrackerConfig {
  /** Callback when a phase transition is detected. */
  onPhaseChange?: (phase: number, status: "started" | "completed") => void;
  /** Custom agent-to-phase mapping. Defaults to Specwright's 10-phase pipeline. */
  agentPhaseMap?: Record<string, number>;
}

const DEFAULT_AGENT_PHASE_MAP: Record<string, number> = {
  "input-processor": 3,
  "jira-processor": 3,
  "playwright-test-planner": 4,
  "execution-manager": 5,
  "bdd-generator": 7,
  "code-generator": 7,
  "playwright-test-healer": 8,
};

/** Skill name → phase mapping. */
const SKILL_PHASE_MAP: Record<string, number> = {
  "e2e-process": 3,
  "e2e-plan": 4,
  "e2e-validate": 5,
  "e2e-generate": 7,
  "e2e-heal": 8,
};

export default function phaseTracker(config: PhaseTrackerConfig = {}): HookCallback {
  const agentMap = config.agentPhaseMap ?? DEFAULT_AGENT_PHASE_MAP;
  let currentPhase = 0;

  return async (input, _toolUseId, _opts): Promise<HookCallbackOutput> => {
    const toolName = String(input.tool_name ?? "");
    const toolInput = input.tool_input as Record<string, unknown> | undefined;

    if (toolName !== "Agent" && toolName !== "Skill") {
      return { continue: true };
    }

    // Extract the agent/skill name from tool input
    const name = String(
      toolInput?.skill ?? toolInput?.description ?? toolInput?.prompt ?? ""
    ).toLowerCase();

    let detectedPhase: number | undefined;

    // Check skill names
    for (const [skillName, phase] of Object.entries(SKILL_PHASE_MAP)) {
      if (name.includes(skillName)) {
        detectedPhase = phase;
        break;
      }
    }

    // Check agent names
    if (!detectedPhase) {
      for (const [agentName, phase] of Object.entries(agentMap)) {
        if (name.includes(agentName)) {
          detectedPhase = phase;
          break;
        }
      }
    }

    if (detectedPhase && detectedPhase !== currentPhase) {
      // Complete previous phase
      if (currentPhase > 0) {
        config.onPhaseChange?.(currentPhase, "completed");
      }
      // Start new phase
      currentPhase = detectedPhase;
      config.onPhaseChange?.(detectedPhase, "started");
    }

    return { continue: true };
  };
}
