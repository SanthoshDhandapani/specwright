"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../ui/cn";

const EXAMPLES = {
  "Show-Buff": {
    feature: `@Lists @ListWorkflow
Feature: List Management Workflow

  @cross-feature-data
  Scenario: Create a named list
    Given I am authenticated
    And I navigate to the "Lists" page
    When I fill the create list form with:
      | Field       | Value           | Type |
      | Name        | <gen_test_data> | Fill |
      | Description | <gen_test_data> | Fill |
    And I click the "Create List" button
    Then the list card appears with the correct name
    And I save "listName" as predata under "listworkflow"

  Scenario: Delete a list
    Given I load predata from "listworkflow"
    When I click the delete icon on the list card
    And I confirm the deletion dialog
    Then the list card is no longer visible`,
    steps: `import { createBdd } from "playwright-bdd";
import { test, expect } from "../../../playwright/fixtures.js";
import {
  FIELD_TYPES,
  processDataTable,
} from "../../../utils/stepHelpers.js";

const { Given, When, Then } = createBdd(test);

When(
  "I fill the create list form with:",
  async ({ page }, dataTable) => {
    await processDataTable(page, dataTable, {
      fieldConfig: {
        Name: { type: FIELD_TYPES.FILL, testID: "list-name-input" },
        Description: { type: FIELD_TYPES.FILL, testID: "list-desc-input" },
      },
    });
  }
);

Then(
  "the list card appears with the correct name",
  async ({ page, testData }) => {
    const name = testData.get("Name");
    await expect(
      page.getByTestId("list-card").filter({ hasText: name })
    ).toBeVisible();
  }
);`,
  },
  "Todo App": {
    feature: `@TodoApp @TodoWorkflow
Feature: Todo Management

  Scenario Outline: Create todo with priority
    Given I am on the todos page
    When I create a todo with:
      | Field    | Value           | Type     |
      | Title    | <gen_test_data> | Fill     |
      | Priority | High            | Dropdown |
    Then the todo appears in the active list
    And the priority badge shows "High"`,
    steps: `import { createBdd } from "playwright-bdd";
import { test, expect } from "../../../playwright/fixtures.js";
import {
  FIELD_TYPES,
  processDataTable,
  selectDropDownByTestId,
} from "../../../utils/stepHelpers.js";

const { Given, When, Then } = createBdd(test);

When(
  "I create a todo with:",
  async ({ page }, dataTable) => {
    await processDataTable(page, dataTable, {
      fieldConfig: {
        Title: { type: FIELD_TYPES.FILL, testID: "todo-title" },
        Priority: {
          type: FIELD_TYPES.DROPDOWN,
          testID: "priority-select",
        },
      },
    });
    await page.getByTestId("create-todo-btn").click();
  }
);`,
  },
};

type ExampleKey = keyof typeof EXAMPLES;

function CodePanel({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-slate-700/60 bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/60 bg-slate-800/60">
        <span className="text-xs font-mono text-slate-400">{language}</span>
        <button
          onClick={copy}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-xs text-slate-300 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function CodeShowcaseSection() {
  const [active, setActive] = useState<ExampleKey>("Show-Buff");
  const example = EXAMPLES[active];

  return (
    <section className="py-24 px-4 bg-slate-950">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-semibold text-emerald-400 uppercase tracking-widest mb-3">Real output</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            What Specwright generates
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Production-grade Gherkin feature files and type-safe step definitions.
            100% real output — not fabricated examples.
          </p>
        </motion.div>

        {/* Tab selector */}
        <div className="flex justify-center gap-2 mb-8">
          {(Object.keys(EXAMPLES) as ExampleKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                active === key
                  ? "bg-emerald-600/20 border border-emerald-500/50 text-emerald-300"
                  : "border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              )}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Code panes */}
        <motion.div
          key={active}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col lg:flex-row gap-4"
        >
          <CodePanel code={example.feature} language="Feature File (Gherkin)" />
          <CodePanel code={example.steps} language="Step Definitions (JavaScript)" />
        </motion.div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Generated by Specwright from a plain English test instruction · No manual writing required
        </p>
      </div>
    </section>
  );
}
