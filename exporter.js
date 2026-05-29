#!/usr/bin/env node
// =============================================================================
// Exporter v2 — Knowledge Plane (MOTLY) + Malloy models -> ONE JSON file.
//
//   knowledge_map.json = meaning + routing ONLY (no field inventory).
//   Models are COMPILED (not regex-scanned). Annotations are read via the
//   new Annotations view: entity.annotations.parseAsTag().
//
//   HARD-FAILS if a model references a URI absent from the canonical KP, or
//   if a KP preferred_source doesn't resolve to a real (model, source).
// =============================================================================
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const motly = require('@malloydata/motly-ts-parser');
const malloy = require('@malloydata/malloy');
const { DuckDBConnection } = require('@malloydata/db-duckdb');

const KP_FILE    = process.env.KP_FILE    || 'knowledge_plane.motly';
const MODELS_DIR = process.env.MODELS_DIR || 'models';
const OUT_FILE   = process.env.OUT_FILE   || 'knowledge_map.json';
const WORKDIR    = process.env.WORKDIR    || process.cwd();

// ---- helpers: pull tag values via the new Annotations view ------------------
function tagValue(entity, prop) {
  if (!entity || !entity.annotations || typeof entity.annotations.parseAsTag !== 'function') return null;
  const tag = entity.annotations.parseAsTag().tag;
  const p = tag && tag.properties && tag.properties[prop];
  return p && p.eq ? p.eq : null;
}
const conceptOf = e => tagValue(e, 'concept');
const roleOf    = e => tagValue(e, 'is_about_role');

function modelTagOf(model) {
  if (!model || typeof model.tagParse !== 'function') return null;
  const t = model.tagParse().tag;
  const p = t && t.properties && t.properties.model;
  return p && p.eq ? p.eq : null;
}

// ---- 1. parse canonical KP --------------------------------------------------
function loadKP() {
  const session = new motly.MOTLYSession();
  const pr = session.parse(fs.readFileSync(KP_FILE, 'utf8'));
  if (pr.errors && pr.errors.length) {
    console.error('MOTLY parse error in ' + KP_FILE + ':');
    console.error(JSON.stringify(pr.errors, null, 1));
    process.exit(1);
  }
  const root = session.finish().value;
  const NS = root.properties.namespace.eq;
  const canon = {};
  for (const [uri, node] of Object.entries(root.properties.concepts.properties)) {
    const p = node.properties || {};
    canon[uri] = {
      kind: node.eq,
      label: p.label ? p.label.eq : null,
      definition: p.definition ? p.definition.eq : null,
      synonyms: p.synonyms && Array.isArray(p.synonyms.eq) ? p.synonyms.eq.map(x => x.eq)
              : p.synonyms && p.synonyms.array ? p.synonyms.array.map(x => x.eq)
              : [],
      steward: p.steward ? p.steward.eq : null,
      subtype_of: p.subtype_of ? p.subtype_of.eq : null,
      membership_rule: p.membership_rule ? p.membership_rule.eq : null,
      preferred_source: p.preferred_source ? p.preferred_source.eq : null,
    };
  }
  const rels = {};
  for (const [uri, node] of Object.entries(root.properties.relationships.properties)) {
    const p = node.properties || {};
    rels[uri] = { label: node.eq, domain: p.domain ? p.domain.eq : null,
                  range: p.range ? p.range.eq : null };
  }
  return { NS, canon, rels };
}

// A filesystem reader so `import "other.malloy"` statements resolve.
const urlReader = { readURL: async (url) => fs.readFileSync(url, 'utf8') };

// ---- 2. compile a Malloy model and pull annotations -------------------------
// Models are loaded by URL (not as raw strings) so relative imports resolve.
// Concepts/roles are attributed ONLY to the model whose FILE locally defines the
// source/field — sources & fields inherited from an imported base carry the
// base file's location and are counted when that base file is processed. This
// keeps the cross-model "usage" / shared-concept view honest.
async function compileModel(filePath) {
  const conn = new DuckDBConnection('duckdb', undefined, WORKDIR);
  const runtime = new malloy.SingleConnectionRuntime({ connection: conn, urlReader });
  const selfUrl = pathToFileURL(path.resolve(filePath)).href;
  const model = await runtime.loadModel(new URL(selfUrl)).getModel();
  const modelName = modelTagOf(model) || path.basename(filePath, '.malloy');

  const selfFile = path.basename(filePath);
  const definedHere = loc =>
    !!loc && !!loc.url && (loc.url === selfUrl || loc.url.endsWith('/' + selfFile));

  const sources = {};
  for (const exp of model.explores) {
    if (!definedHere(exp.location)) continue; // skip sources imported from base
    const fieldConcepts = [];
    const joinRoles = [];
    for (const f of exp.allFields) {
      if (!definedHere(f.location)) continue; // skip fields inherited from base
      const isJoin = f.constructor && /Explore/.test(f.constructor.name);
      const fc = conceptOf(f);
      const role = roleOf(f);
      if (isJoin && role) joinRoles.push(role);
      if (fc) fieldConcepts.push(fc);
    }
    sources[exp.name] = { concept: conceptOf(exp), fieldConcepts, joinRoles };
  }
  return { model: modelName, sources };
}

// ---- 3. main ----------------------------------------------------------------
(async () => {
  const { NS, canon, rels } = loadKP();
  console.log('Canonical KP: ' + Object.keys(canon).length + ' concepts, '
              + Object.keys(rels).length + ' relationships');

  const modelFiles = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.malloy'));
  const models = [];
  for (const f of modelFiles) {
    const m = await compileModel(path.join(MODELS_DIR, f));
    models.push(m);
  }
  console.log('Models compiled: ' + models.map(m => m.model).join(', '));

  // ---- validation ----------------------------------------------------------
  const errors = [];
  for (const m of models) {
    const usedC = new Set(), usedR = new Set();
    for (const s of Object.values(m.sources)) {
      if (s.concept) usedC.add(s.concept);
      for (const fc of s.fieldConcepts) usedC.add(fc);
      for (const r of s.joinRoles) usedR.add(r);
    }
    for (const u of usedC) if (!canon[u]) errors.push('[' + m.model + '] concept not in KP: ' + u);
    for (const u of usedR) if (!rels[u])  errors.push('[' + m.model + '] relationship not in KP: ' + u);
  }
  for (const [uri, c] of Object.entries(canon)) {
    if (!c.preferred_source) continue;
    const [mdl, src] = c.preferred_source.split('.');
    const found = models.find(m => m.model === mdl && m.sources[src]);
    if (!found) errors.push('[KP] preferred_source for ' + uri + ' not found: ' + c.preferred_source);
  }
  if (errors.length) {
    console.error('\nBUILD FAILED — referential validation:');
    errors.forEach(e => console.error('  ' + e));
    process.exit(1);
  }
  console.log('Referential validation: OK');

  // ---- usage (which models touch each concept / which rels are used) ------
  const touch = {};
  const usedRels = new Set();
  for (const m of models) {
    for (const s of Object.values(m.sources)) {
      if (s.concept) (touch[s.concept] ||= new Set()).add(m.model);
      for (const fc of s.fieldConcepts) (touch[fc] ||= new Set()).add(m.model);
      for (const r of s.joinRoles) usedRels.add(r);
    }
  }

  // ---- emit JSON -----------------------------------------------------------
  const order = ['entity', 'defined_class', 'measure', 'attribute'];
  const conceptUris = Object.keys(canon).filter(u => touch[u])
    .sort((a, b) => (order.indexOf(canon[a].kind) - order.indexOf(canon[b].kind)) || a.localeCompare(b));

  const out = {
    _doc: 'Knowledge Plane — agent context. Meaning + routing only; fields live in the Malloy models (compile the named source). If a term is not a concept here, it is NOT modelled — say so; do not improvise it from raw columns.',
    namespace: NS,
    concepts: conceptUris.map(u => {
      const c = canon[u];
      const obj = {
        uri: u,
        kind: c.kind,
        label: c.label,
        definition: c.definition,
        models: [...touch[u]].sort(),
      };
      if (c.synonyms && c.synonyms.length) obj.synonyms = c.synonyms;
      if (c.steward) obj.steward = c.steward;
      if (c.subtype_of) obj.subtype_of = c.subtype_of;
      if (c.membership_rule) obj.membership_rule = c.membership_rule;
      if (c.preferred_source) obj.preferred_source = c.preferred_source;
      return obj;
    }),
    relationships: [...usedRels].sort().map(u => {
      const r = rels[u];
      return { uri: u, verb: r.label, domain: r.domain, range: r.range };
    }),
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');

  const shared = Object.keys(touch).filter(u => touch[u].size > 1);
  console.log('\nConcepts used: ' + Object.keys(touch).length + ' / ' + Object.keys(canon).length + ' canonical');
  console.log('Shared concepts (>1 model): ' + shared.length + (shared.length ? ' -> ' + shared.join(', ') : ''));
  console.log('-> ' + OUT_FILE);
})().catch(e => { console.error('FATAL:', e.stack || e); process.exit(1); });
