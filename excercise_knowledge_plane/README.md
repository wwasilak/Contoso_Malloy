
Mini project #3  : trying to apply Knowledge Plane concepts using Malloy. The concepts come from Juha Korpela substack articles. (folder: excercise_knowledge_plane)

Articles:

- https://commonsensedata.substack.com/p/the-quest-for-semantic-architecture
- https://commonsensedata.substack.com/p/semantic-linking-the-aboutness-of
- https://commonsensedata.substack.com/p/semantic-linking-managing-mappings
- https://commonsensedata.substack.com/p/building-semantics-with-conceptual


Idea behing this excercise: checking if a Malloy semantic model can be used to create Knowledge and Data Planes as described by Juha Korpela. Knowledge Plane is a layer where business concepts, definitions and relationships are described. It should be separate from the Data Plane. Knowledge Plane is implemented as a MOTLY file. Malloy model only links to concepts through # concept annotations, so meaning lives in one place and is never duplicated across models. An exporter reads both, validates that every linked concept actually exists in the Knowledge Plane, and generates two outputs: an RDF graph and a Markdown glossary for use with AI agents. The result is an executable model that also serves as its own conceptual documentation.


Some comments:
- done mostly by talking with Claude
- uses MOTLY language for knowledge_plane - it is used in Malloy models for annotations so we have single language in both places
- in real life it would be a Malloy Publisher feature probably
- in the current iteration Malloy models were created from a single base model to check if agent can quicker decide which model to query

--=====================--
current iteration:

- knowledge_plane.motly - the canonical Knowledge Plane: concepts, definitions and relationships, manual maintenance.
- Malloy models - the Data Plane, as several Malloy models that all link to the same Knowledge Plane concepts:
  - models/base.malloy - the shared foundation (`# model = "base"`). Defines the data-plane sources (customer, product, store, order, order line, calendar date, currency), the in-context sources (order_line_in_context, customer_order_in_context) and the core order fact `sales_order` with the universal measures. All plumbing lives here, once.
  - models/sales.malloy, models/operations.malloy, models/finance.malloy, models/merchandising.malloy - thin department models. Each does `import "base.malloy"` and EXTENDS the base sources (e.g. `sales_order extend { ... }`) to add only its own department-specific dimensions/measures. They never redefine the plumbing. This is what makes a concept like kp:TotalSales or kp:Order genuinely shared across models instead of re-declared.
- exporter.js - reads the KP and compiles every model in models/ (loading by URL so `import` resolves), validates that every linked concept exists in the KP and that each preferred_source resolves to a real (model, source), then generates the output. Concepts are attributed to the model whose file actually defines the annotated source/field, so the "Shared concepts (>1 model)" report stays meaningful. Run it with `npm run build`.
- knowledge_map.json - the generated output: a meaning + routing map for an AI agent (concepts, definitions, stewards, which models touch each concept, and relationships). It deliberately carries NO field inventory - fields live in the Malloy models, which are the source of truth (compile the named source to see them).

--=====================--
initial version: Dropped as agent was loosing a lot of time on using knowledge_map.malloy file. 

- knowledge_plane.motly - the canonical Knowledge Plane: concepts, definitions and relationships, manual maintenance
- sales.malloy - a Malloy model following Korpela's naming conventions; sources and fields are linked to concepts via # concept annotations.
- exporter.js - reads the KP and the model, validates that every linked concept exists, and generates the outputs.
- knowledge_map.ttl / knowledge_map.md - generated outputs: an RDF graph and a glossary (for AI agent). Markdown file for simple project. TTL file for more complex ones.
- knowledge_map.malloy - Malloy model which allows AI agent to query ttl file (or parquets derived from ttl file) and understand how the Knowledge Plane links to the Data Plane. 


