
Mini project #3  : trying to apply Knowledge Plane concepts using Malloy. The concepts come from Juha Korpela substack articles. 

Articles:

- https://commonsensedata.substack.com/p/the-quest-for-semantic-architecture
- https://commonsensedata.substack.com/p/semantic-linking-the-aboutness-of
- https://commonsensedata.substack.com/p/semantic-linking-managing-mappings
- https://commonsensedata.substack.com/p/building-semantics-with-conceptual


Idea behing this excercise: checking if a Malloy semantic model can be used to create Knowledge and Data Planes as described by Juha Korpela. Knowledge Plane is a layer where business concepts, definitions and relationships are described. It should be separate from the Data Plane. Knowledge Plane is implemented as a MOTLY file. Malloy model only links to concepts through # concept annotations, so meaning lives in one place and is never duplicated across models. An exporter reads both, validates that every linked concept actually exists in the Knowledge Plane, and generates two outputs: an RDF graph and a Markdown glossary for use with AI agents. The result is an executable model that also serves as its own conceptual documentation.


Folder: excercise_knowledge_plane

- knowledge_plane.motly - the canonical Knowledge Plane: concepts, definitions and relationships, manual maintenance
- sales.malloy - a Malloy model following Korpela's naming conventions; sources and fields are linked to concepts via # concept annotations.
- exporter.js - reads the KP and the model, validates that every linked concept exists, and generates the outputs.
- knowledge_map.ttl / knowledge_map.md - generated outputs: an RDF graph and a glossary (for AI agent). Markdown file for simple project. TTL file for more complex ones.

So Claude suggested to use knowledge_map.md for small project and knowledge_map.ttl in case scale goes up. But with .ttl file he mentioned to use RDF database + MCP Server for AI Agent. This seems complex to me. I've checked and there is a DuckDb extension to read ttl files: https://duckdb.org/community_extensions/extensions/rdf . With this extension ttl file can be turned into Malloy source and AI agent could query it with Malloy/Publisher MCP server (this needs to be tested). Asked Claude to create a proper Malloy model and after fixing few errors it is working fine. 

- knowledge_map.malloy - Malloy model which allows AI agent to query ttl file and understand how the Knowledge Plane links to the Data Plane. 


Some comments:
- done mostly by talking with Claude
- uses MOTLY language for knowledge_plane - it is used in Malloy models for annotations so we have single language in both places
- in real life it would be a Malloy Publisher feature probably
- the solution hasn't been tested with AI agent - TO DO

