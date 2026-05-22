#!/usr/bin/env node
// =============================================================================
// Exporter — Knowledge Plane (MOTLY) + Malloy models -> TTL graph + Markdown.
//   KP    : parsed with the real @malloydata/motly-ts-parser (no regex).
//   models: annotation extraction (text scan of # concept / # is_about_role).
//   HARD-FAILS if a model references a URI absent from the canonical KP.
// =============================================================================
const fs = require('fs');
const path = require('path');
const motly = require('@malloydata/motly-ts-parser');

const KP_FILE   = 'knowledge_plane.motly';
const MODELS_DIR = 'models';
const BUILD     = 'build';

// ---- 1. load canonical KP via the real MOTLY parser -------------------------
const session = new motly.MOTLYSession();
const pr = session.parse(fs.readFileSync(KP_FILE, 'utf8'));
if (pr.errors && pr.errors.length) {
  console.error('MOTLY parse error in ' + KP_FILE + ':');
  console.error(JSON.stringify(pr.errors, null, 1));
  process.exit(1);
}
const kpRoot = session.finish().value;
const NS = kpRoot.properties.namespace.eq;
const DP_BASE = NS.replace('kp#', 'dp/');

const canon = {};   // uri -> {kind, label, definition, synonyms[], steward, subtype_of, membership_rule}
for (const [uri, node] of Object.entries(kpRoot.properties.concepts.properties)) {
  const p = node.properties || {};
  canon[uri] = {
    kind: node.eq,
    label: p.label ? p.label.eq : null,
    definition: p.definition ? p.definition.eq : null,
    synonyms: p.synonyms && p.synonyms.array ? p.synonyms.array.map(x => x.eq) : [],
    steward: p.steward ? p.steward.eq : null,
    subtype_of: p.subtype_of ? p.subtype_of.eq : null,
    membership_rule: p.membership_rule ? p.membership_rule.eq : null,
  };
}
const rels = {};    // uri -> {label, domain, range}
for (const [uri, node] of Object.entries(kpRoot.properties.relationships.properties)) {
  const p = node.properties || {};
  rels[uri] = { label: node.eq, domain: p.domain ? p.domain.eq : null,
                range: p.range ? p.range.eq : null };
}
console.log('Canonical KP: ' + Object.keys(canon).length + ' concepts, '
            + Object.keys(rels).length + ' relationships');

// ---- 2. parse Malloy models (annotation scan) -------------------------------
function parseModel(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const head = lines.join('\n');
  const nameM = head.match(/#\s*model\s*=\s*"(\w+)"/);
  const model = nameM ? nameM[1] : path.basename(file, '.malloy');
  const sources = {}, joins = [], fields = [], unresolved = [];
  let pend = [], cur = null, sticky = null;
  const flushConcept = () => {
    let c = null;
    for (const a of pend) {
      const m = a.match(/#\s*concept\s*=\s*"([^"]+)"/);
      if (m) c = m[1];
    }
    return c;
  };
  const flushRole = () => {
    let r = null;
    for (const a of pend) {
      const m = a.match(/#\s*is_about_role\s*=\s*"([^"]+)"/);
      if (m) r = m[1];
    }
    return r;
  };
  for (let raw of lines) {
    const s = raw.trim();
    if (!s || s.startsWith('//') || s.startsWith('--') || s.startsWith('##!')) continue;
    if (s.startsWith('#')) { pend.push(s); continue; }
    let m = s.match(/^source:\s+(\w+)\s+is\s+(.+)/);
    if (m) {
      sources[m[1]] = { concept: flushConcept() };
      cur = m[1]; sticky = null; pend = [];
      if (/extend/.test(m[2])) sticky = null;
      continue;
    }
    if (s.startsWith('include')) { sticky = null; pend = []; continue; }
    if (s === 'extend {' || s.endsWith('extend {') || s === '} extend {') { sticky = null; pend = []; continue; }
    if (s === '}') { sticky = null; pend = []; continue; }
    m = s.match(/^(public|internal|private|dimension|measure):\s*(.*)/);
    if (m) {
      sticky = m[1];
      const rest = m[2].trim();
      const c = flushConcept(); pend = [];
      if (rest && sticky === 'public') {
        const toks = rest.split(',').map(t => t.trim().replace(/`/g,'')).filter(Boolean);
        if (toks.length === 1 && c) { fields.push({src:cur,name:toks[0],concept:c}); }
        else toks.forEach(t => { fields.push({src:cur,name:t,concept:null}); unresolved.push({model,src:cur,col:t}); });
      }
      continue;
    }
    m = s.match(/^join_(one|many):\s+(\w+)\s+is\s+(\w+)/);
    if (m) { joins.push({src:cur,name:m[2],target:m[3],role:flushRole()}); pend=[]; continue; }
    if (sticky === 'public') {
      const c = flushConcept(); pend = [];
      const toks = s.split(',').map(t => t.trim().replace(/`/g,'')).filter(Boolean);
      if (toks.length === 1 && c) fields.push({src:cur,name:toks[0],concept:c});
      else toks.forEach(t => { fields.push({src:cur,name:t,concept:null}); unresolved.push({model,src:cur,col:t}); });
      continue;
    }
    if (sticky === 'dimension' || sticky === 'measure') {
      const c = flushConcept(); pend = [];
      const dm = s.match(/^(\w+)\s+is/);
      if (dm && c) fields.push({src:cur,name:dm[1],concept:c});
      continue;
    }
    pend = [];
  }
  return { model, sources, joins, fields, unresolved };
}

const models = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.malloy'))
  .map(f => parseModel(path.join(MODELS_DIR, f)));
console.log('Models parsed: ' + models.map(m => m.model).join(', '));

// ---- 3. HARD referential validation -----------------------------------------
const errors = [];
for (const m of models) {
  const used = new Set();
  for (const s of Object.values(m.sources)) if (s.concept) used.add(s.concept);
  for (const f of m.fields) if (f.concept) used.add(f.concept);
  for (const u of used) if (!canon[u]) errors.push('[' + m.model + '] concept not in KP: ' + u);
  for (const j of m.joins) if (j.role && !rels[j.role]) errors.push('[' + m.model + '] relationship not in KP: ' + j.role);
}
if (errors.length) {
  console.error('\nBUILD FAILED — referential validation:');
  errors.forEach(e => console.error('  ' + e));
  process.exit(1);
}
console.log('Referential validation: OK');

// ---- 4. assemble graph facts ------------------------------------------------
const usedConcepts = new Set(), isAbout = [], hasAttr = [], usedRels = new Set();
const touch = {};
for (const m of models) {
  for (const [sn, s] of Object.entries(m.sources)) {
    if (s.concept) {
      usedConcepts.add(s.concept);
      isAbout.push({ dp: m.model + '#' + sn, concept: s.concept });
      (touch[s.concept] = touch[s.concept] || new Set()).add(m.model);
    }
  }
  for (const f of m.fields) {
    if (f.concept) {
      usedConcepts.add(f.concept);
      (touch[f.concept] = touch[f.concept] || new Set()).add(m.model);
      const src = m.sources[f.src];
      if (src && src.concept && canon[f.concept] && canon[f.concept].kind === 'attribute')
        hasAttr.push([src.concept, f.concept]);
    }
  }
  for (const j of m.joins) if (j.role) usedRels.add(j.role);
}

// ---- 5. OUTPUT 1: Turtle graph ----------------------------------------------
const esc = t => String(t).replace(/"/g, '\\"');
const T = [
  '@prefix kp:   <' + NS + '> .',
  '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
  '@prefix owl:  <http://www.w3.org/2002/07/owl#> .',
  '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .', ''];
T.push('# --- KNOWLEDGE PLANE: concepts ---');
for (const uri of Object.keys(canon).sort()) {
  if (!usedConcepts.has(uri)) continue;
  const c = canon[uri];
  T.push(uri + ' a owl:Class ;');
  T.push('    skos:prefLabel "' + esc(c.label) + '" ;');
  for (const syn of c.synonyms) T.push('    skos:altLabel "' + esc(syn) + '" ;');
  T.push('    skos:definition "' + esc(c.definition) + '" ;');
  if (c.kind === 'defined_class') {
    T.push('    rdfs:subClassOf ' + c.subtype_of + ' ;');
    T.push('    kp:membershipRule "' + esc(c.membership_rule) + '" ;');
  }
  T.push('    kp:conceptKind "' + c.kind + '"' + (c.steward ? ' ;' : ' .'));
  if (c.steward) T.push('    kp:steward "' + esc(c.steward) + '" .');
}
T.push('\n# --- KNOWLEDGE PLANE: relationships ---');
for (const uri of [...usedRels].sort()) {
  const r = rels[uri];
  T.push(uri + ' a owl:ObjectProperty ;');
  T.push('    rdfs:label "' + esc(r.label) + '" ;');
  T.push('    rdfs:domain ' + r.domain + ' ;');
  T.push('    rdfs:range ' + r.range + ' .');
}
T.push('\n# --- KNOWLEDGE PLANE: attributes ---');
const seenAttr = new Set();
for (const [e, a] of hasAttr) {
  const k = e + '|' + a;
  if (seenAttr.has(k)) continue; seenAttr.add(k);
  T.push(e + ' kp:hasAttribute ' + a + ' .');
}
T.push('\n# --- DATA PLANE: per-model object representations ---');
for (const { dp } of isAbout)
  T.push('<' + DP_BASE + dp + '> a <' + DP_BASE + 'MalloySource> ; rdfs:label "' + dp + '" .');
T.push('\n# --- SEMANTIC LINKING: isAbout ---');
for (const { dp, concept } of isAbout)
  T.push('<' + DP_BASE + dp + '> kp:isAbout ' + concept + ' .');
fs.writeFileSync(path.join(BUILD, 'knowledge_plane.ttl'), T.join('\n') + '\n');

// ---- 6. OUTPUT 2: Markdown glossary -----------------------------------------
const M = ['# Knowledge Plane — Glossary', '',
  '_Generated from `' + KP_FILE + '` + ' + models.length + ' Malloy model(s). Do not edit by hand._', ''];
const groups = [['entity','Entities'],['defined_class','Defined Classes'],
                ['measure','Measures'],['attribute','Attributes']];
for (const [kind, title] of groups) {
  const items = Object.keys(canon).sort().filter(u => canon[u].kind === kind && usedConcepts.has(u));
  if (!items.length) continue;
  M.push('## ' + title, '');
  for (const u of items) {
    const c = canon[u];
    M.push('### ' + c.label + '  `' + u + '`', '', c.definition, '');
    if (c.synonyms.length) M.push('*Synonyms:* ' + c.synonyms.join(', ') + '  ');
    if (c.steward) M.push('*Steward:* ' + c.steward + '  ');
    if (c.kind === 'defined_class') {
      M.push('*Subtype of:* `' + c.subtype_of + '`  ');
      M.push('*Membership rule:* `' + c.membership_rule + '`  ');
    }
    if (touch[u]) M.push('*Appears in models:* ' + [...touch[u]].sort().join(', ') + '  ');
    M.push('');
  }
}
M.push('## Relationships', '');
for (const u of [...usedRels].sort()) {
  const r = rels[u];
  M.push('- **' + r.label + '** `' + u + '` — `' + r.domain + '` → `' + r.range + '`');
}
M.push('');
const allUnresolved = models.flatMap(m => m.unresolved);
if (allUnresolved.length) {
  M.push('## Validator — public fields without a concept', '');
  const by = {};
  for (const u of allUnresolved) (by[u.model+'/'+u.src] = by[u.model+'/'+u.src] || []).push(u.col);
  for (const k of Object.keys(by).sort()) M.push('- `' + k + '`: ' + by[k].join(', '));
}
fs.writeFileSync(path.join(BUILD, 'knowledge_plane.md'), M.join('\n') + '\n');

// ---- report -----------------------------------------------------------------
const shared = Object.keys(touch).filter(u => touch[u].size > 1);
console.log('\nConcepts used: ' + usedConcepts.size + ' / ' + Object.keys(canon).length + ' canonical');
console.log('Shared concepts (>1 model): ' + shared.length + (shared.length ? ' -> ' + shared.join(', ') : ''));
console.log('isAbout links: ' + isAbout.length);
console.log('Unresolved public fields: ' + allUnresolved.length);
console.log('\n-> build/knowledge_plane.ttl\n-> build/knowledge_plane.md');
