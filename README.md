Mini project #2  : learning Malloy language using Contoso 1M dataset created by SQLBI Team.


Contoso dataset was downloaded from https://github.com/sql-bi/Contoso-Data-Generator-V2-Data/releases/tag/ready-to-use-data .

Article explaining the whole concept behind dataset: https://www.sqlbi.com/blog/marco/2024/07/25/announcing-contoso-data-generator-v2/ .


Malloy docs:
https://malloydata.github.io/documentation/


--------------------------------------------------------

Mini project #3  : trying to apply Knowledge Plane concepts using Malloy. The concepts come from Juha Korpela substack articles. 

Articles:

- https://commonsensedata.substack.com/p/the-quest-for-semantic-architecture
- https://commonsensedata.substack.com/p/semantic-linking-the-aboutness-of
- https://commonsensedata.substack.com/p/semantic-linking-managing-mappings
- https://commonsensedata.substack.com/p/building-semantics-with-conceptual


Idea behing this excercise: checking if a Malloy semantic model can be used to create Knowledge and Data Planes as described by Juha Korpela. Knowledge Plane is a layer where business concepts, definitions and relationships are described. It should be separate from the Data Plane. Knowledge Plane is implemented as a MOTLY file. Malloy model only links to concepts through # concept annotations, so meaning lives in one place and is never duplicated across models. An exporter reads both, validates that every linked concept actually exists in the Knowledge Plane, and generates two outputs: an RDF graph and a Markdown glossary for use with AI agents. The result is an executable model that also serves as its own conceptual documentation.


Folder: excercise_knowledge_plane

knowledge_plane.motly — the canonical Knowledge Plane: concepts, definitions and relationships, manual maintenance
sales.malloy — a Malloy model following Korpela's naming conventions; sources and fields are linked to concepts via # concept annotations.
exporter.js — reads the KP and the model, validates that every linked concept exists, and generates the outputs.
knowledge_plane.ttl / knowledge_plane.md — generated outputs: an RDF graph and a glossary (for AI agent)


Some comments:
- done mostly by talking with Claude
- uses MOTLY language for knowledge_plane - it is used in Malloy models for annotations so we have single language in both places
- in real life it would be a Malloy Publisher feature probably
- the solution hasn't been tested with AI agent - TO DO

