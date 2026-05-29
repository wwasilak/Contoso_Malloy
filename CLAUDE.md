# Working with the Knowledge Plane + Malloy models

## What you have

- **`knowledge_map.json` — meaning + routing.** Read it whole (it's small). Every
  concept (`uri`, `kind`, `label`, `synonyms`, `definition`, `steward`,
  `membership_rule`, `preferred_source`, `models`) and every relationship
  (`verb`, `domain`, `range`). This tells you what exists, what it means, and
  where to get it.
- **The Malloy models — the source of truth for fields.** The map deliberately
  lists NO fields. `compile` the named source to see field names, types, and
  which are measures vs dimensions, then compose.

## Routing: question -> model

1. Resolve the question to concept URIs using `label`, `synonyms`, and `definition`.
2. Use `preferred_source` as the **default** source for a concept. Use `models[]`
   as the candidate set when you need a domain-specific measure that isn't on the
   preferred source.
3. If the concepts you need live in **disjoint models**, this is a cross-domain
   query — use a pre-built cross-domain view. Do NOT invent a join across models.
4. For a `defined_class` (e.g. `ActiveCustomer`), apply its `membership_rule`
   **verbatim**. Never improvise your own filter for it, or two answers won't agree.
5. Relationships (`domain`/`range`/`verb`) tell you how entities connect — use them
   to pick joins that already exist, not to fabricate new ones.

## When a term is NOT in the map

The map is the governed surface. If a term has no concept:

- You **MAY** explore with small inline queries to confirm a column exists, list
  dimension values, or find filter values.
- You **MUST** label any figure derived from raw columns as *ungoverned /
  exploratory*. Never present it as a defined metric.
- You **MUST NOT** compute a new measure from raw columns and pass it off as
  official. If the metric isn't governed, say so — don't improvise it.

## Execution rules

- Use the `mcp__malloy__*` tools for ALL Malloy work. Never `malloy-cli` via bash.
- `compile` first (cheap, no warehouse hit) -> validate. `run` only after a clean compile.
- `run`/`compile` take a `source`: inline Malloy ending in `run:`. To query a
  model, `import` it and set `base_uri` to its `file://` URI.
- Always set a low `row_limit`. Always aggregate/filter. Never `select *`.

## Malloy dialect gotchas

- `is not null` (not `!= null`)
- `count(x)` for a distinct count (not `count(distinct x)`)
- filter measures via `having:`, dimensions via `where:`
- unsure of syntax -> call `language_help`
