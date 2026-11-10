# 39: The testing rule

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The rule is written down before any test is cut. `~/.config/opencode/refs/guidelines/testing.md` gains a "What Earns a Test" section: the rule, the cut categories (presentation and DOM structure, config defaults and constants, type-shape duplication), the kept categories (`aria-*` that pins an accessible state, call counts that are the contract, audit output, security status and headers, contract copy), the owner-layer policy, and the replace threshold. The repo `AGENTS.md` gains one guardrail line pointing at the guideline.
