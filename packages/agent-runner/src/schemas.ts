/**
 * Zod schemas for structured LLM output.
 *
 * These schemas enforce reliable JSON output from Claude during test generation,
 * eliminating parsing failures and retry loops.
 */

import { z } from "zod";

/** A single exploration step discovered from the app */
export const ExplorationStepSchema = z.object({
  action: z.enum(["navigate", "click", "fill", "assert", "select", "hover"]),
  selector: z.string().describe("CSS selector, data-testid, or ARIA role"),
  value: z.string().optional().describe("Value to fill or assert against"),
  description: z.string().describe("Human-readable description of this step"),
});

/** Seed file structure — output of Phase 4-5 exploration */
export const SeedFileSchema = z.object({
  testName: z.string().describe("Name for the test (e.g., 'HomePage Navigation')"),
  baseUrl: z.string().url().describe("Base URL of the application"),
  selectors: z
    .array(
      z.object({
        name: z.string(),
        selector: z.string(),
        type: z.enum(["testid", "role", "text", "css"]),
      })
    )
    .describe("Discovered selectors from exploration"),
  steps: z.array(ExplorationStepSchema).describe("Ordered test steps"),
});

/** A single BDD scenario */
export const BddScenarioSchema = z.object({
  name: z.string().describe("Scenario name"),
  tags: z.array(z.string()).optional().describe("Scenario-level tags"),
  steps: z.array(
    z.object({
      keyword: z.enum(["Given", "When", "Then", "And", "But"]),
      text: z.string().describe("Step text without the keyword"),
      dataTable: z
        .array(z.array(z.string()))
        .optional()
        .describe("3-column data table: Field Name | Value | Type"),
    })
  ),
});

/** BDD feature file structure — output of Phase 7 generation */
export const BddFeatureSchema = z.object({
  feature: z.string().describe("Feature title"),
  tags: z.array(z.string()).describe("Feature-level tags (e.g., @homepage, @navigation)"),
  background: z
    .array(
      z.object({
        keyword: z.enum(["Given", "And"]),
        text: z.string(),
      })
    )
    .optional()
    .describe("Background steps shared by all scenarios"),
  scenarios: z.array(BddScenarioSchema),
});

/** Quality score breakdown — output of Phase 10 review */
export const QualityScoreSchema = z.object({
  inputProcessing: z.object({
    successful: z.number(),
    total: z.number(),
    score: z.number(),
  }),
  selectorDiscovery: z
    .object({
      validated: z.number(),
      total: z.number(),
      score: z.number(),
    })
    .optional(),
  testExecution: z
    .object({
      passed: z.number(),
      total: z.number(),
      score: z.number(),
      durationMs: z.number().optional(),
    })
    .optional(),
  healing: z
    .object({
      attempts: z.number(),
      autoFixed: z.number(),
      score: z.number(),
    })
    .optional(),
  overall: z.number().describe("Weighted overall score 0-100"),
  rating: z.enum(["Excellent", "Very Good", "Good", "Fair", "Poor"]),
  status: z.string().describe("e.g., READY FOR PRODUCTION"),
});

export type SeedFile = z.infer<typeof SeedFileSchema>;
export type BddFeature = z.infer<typeof BddFeatureSchema>;
export type BddScenario = z.infer<typeof BddScenarioSchema>;
export type QualityScore = z.infer<typeof QualityScoreSchema>;
