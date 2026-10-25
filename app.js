(function () {
  "use strict";
  const D = window.RONIN_DATA;
  const R = window.RONIN_RULES;
  const { FACTIONS, SWORDS, ATTRIBUTES, KORYU_WEAPONS, WEAPONS } = D;
  const STORE = "ronin-buntai-v1";

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const sign = (n) => (n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "+0");

  // ---------- State ----------
  function blankList(faction = "bushi") {
    return { id: uid(), name: "Untitled Buntai", faction, limit: 100, kiai: 0, notes: "", koryu: { primary: "Katana", secondary: [] }, leader: null, entries: [] };
  }
  let state = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s && Array.isArray(s.lists) && s.lists.length) return s;
    } catch (e) { /* storage unavailable */ }
    const l = blankList();
    return { lists: [l], current: l.id };
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  const cur = () => state.lists.find((l) => l.id === state.current) || state.lists[0];

  // ---------- Static selects ----------
  function fillFactionSelect() {
    $("#faction").innerHTML = Object.entries(FACTIONS).map(([k, f]) => `<option value="${k}">${esc(f.name)}</option>`).join("");
  }
  function koryuOptions(sel, allowNone) {
    return (allowNone ? `<option value="">None</option>` : "") +
      Object.entries(KORYU_WEAPONS).map(([w, c]) => `<option value="${w}" ${w === sel ? "selected" : ""}>${w}${c ? " (+" + c + " pts)" : ""}</option>`).join("");
  }

  // ---------- Rendering ----------
  function render() {
    const list = cur();
    const f = FACTIONS[list.faction];
    $("#list-select").innerHTML = state.lists.map((l) => `<option value="${l.id}" ${l.id === list.id ? "selected" : ""}>${esc(l.name)} · ${esc(FACTIONS[l.faction].name)}</option>`).join("");
    $("#list-name").value = list.name;
    $("#faction").value = list.faction;
    $("#limit").value = list.limit;
    $("#list-notes").value = list.notes || "";
    $("#faction-blurb").textContent = f.blurb;

    const ko = $("#koryu-settings");
    ko.hidden = !f.koryu;
    if (f.koryu) {
      const k = list.koryu;
      $("#koryu-primary").innerHTML = koryuOptions(k.primary, false);
      $("#koryu-sec1").innerHTML = koryuOptions(k.secondary[0] || "", true);
      $("#koryu-sec2").innerHTML = koryuOptions(k.secondary[1] || "", true);
    }
    $("#kiai-settings").hidden = !f.kiai;
    $("#kiai-count").textContent = list.kiai || 0;

    renderCatalogue(list);
    const ev = R.evaluate(list);
    renderSummary(list, ev);
    renderRoster(list, ev);
    renderPrint(list, ev);
    document.title = `${list.name} · Ronin Buntai Builder`;
  }

  function statLine(p) {
    return `R${p.rank} · CP ${p.cp} · Ini ${p.init} · Fi ${p.fight} · Sh ${p.shoot} · ${p.armour === "None" ? "No armour" : p.armour}`;
  }

  function renderCatalogue(list) {
    const f = FACTIONS[list.faction];
    const card = (src, key, p, extra = "") => `
      <li class="cat-item">
        <div class="cat-main">
          <span class="rank" data-rank="${p.rank}" title="Rank ${p.rank}">${p.rank}</span>
          <div>
            <div class="cat-name">${esc(p.name)}</div>
            <div class="cat-stats">${statLine(p)}</div>
            ${extra}
          </div>
        </div>
        <button type="button" class="add" data-add="${src}:${key}" aria-label="Add ${esc(p.name)}">${p.points} pts<span aria-hidden="true"> ＋</span></button>
      </li>`;
    let html = `<h3>${esc(f.name)}</h3><ul class="cat">` + Object.entries(f.models).map(([k, p]) => card("faction", k, p)).join("") + "</ul>";
    const allowed = Object.keys(SWORDS).filter((k) => f.sfh[k] || ((k === "warriorMonk" || k === "shugyosha") && f.sfh.monkOrShugyosha));
    if (allowed.length) {
      html += `<h3>Swords-for-Hire</h3><p class="hint">Up to a quarter of your models. ${esc(f.sfhNote || "")}</p><ul class="cat">` +
        allowed.map((k) => card("sfh", k, SWORDS[k], typeof f.sfh[k] === "number" ? `<div class="cat-limit">Limit ${f.sfh[k]}</div>` : "")).join("") + "</ul>";
    } else {
      html += `<h3>Swords-for-Hire</h3><p class="hint">${esc(f.name)} can't hire Swords-for-Hire.</p>`;
    }
    $("#catalogue").innerHTML = html;
  }

  function renderSummary(list, ev) {
    const legal = ev.errors.length === 0;
    const over = list.limit && ev.total > list.limit;
    $("#summary").innerHTML = `
      <div class="seal ${legal ? "ok" : "bad"}" title="${legal ? "Legal Buntai" : ev.errors.length + " problem(s)"}">
        <span class="seal-num">${ev.total}</span>
        <span class="seal-of">of ${list.limit || "∞"}</span>
      </div>
      <dl class="facts">
        <div><dt>Models</dt><dd>${ev.models.length}</dd></div>
        <div><dt>Morale</dt><dd>${esc(ev.morale)}</dd></div>
        <div><dt>${over ? "Over by" : "Left"}</dt><dd>${list.limit ? Math.abs(list.limit - ev.total) : "–"}</dd></div>
        ${ev.kiai ? `<div><dt>Kiai</dt><dd>${ev.kiai} (${ev.kiai * 5} pts)</dd></div>` : ""}
      </dl>
      <div class="checks">
        ${legal ? `<p class="legal">This Buntai is legal.</p>` : `<ul class="errors">${ev.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`}
        ${ev.notes.length ? `<ul class="notes">${ev.notes.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
      </div>`;
  }

  function attrOptions(selected, exclude) {
    const kinds = {};
    for (const [n, a] of Object.entries(ATTRIBUTES)) (kinds[a.kind] = kinds[a.kind] || []).push(n);
    return `<option value="">None</option>` + Object.entries(kinds).map(([k, names]) =>
      `<optgroup label="${k}">${names.map((n) => `<option value="${n}" ${n === selected ? "selected" : ""} ${exclude.includes(n) && n !== selected ? "disabled" : ""}>${n}</option>`).join("")}</optgroup>`).join("");
  }

  function renderRoster(list, ev) {
    $("#empty").hidden = ev.models.length > 0;
    const topRank = ev.models.length ? Math.max(...ev.models.map((m) => m.rank)) : -1;
    const ties = ev.models.filter((m) => m.rank === topRank).length > 1;
    $("#roster").innerHTML = ev.models.map((m) => {
      const e = m.entry;
      const p = m.profile;
      const groups = R.groupsFor(list, p);
      const bannerOn = m.banner;
      const isLeader = e.uid === ev.leaderUid;
      const disguised = !!m.disguisedAs;
      const groupHtml = disguised ? "" : groups.map((g) => {
        const locked = bannerOn && g.equipment;
        const val = (e.choices || {})[g.id] || "";
        return `<label class="opt">${esc(g.label)}
          <select data-group="${g.id}" ${locked ? "disabled" : ""}>
            ${g.required ? `<option value="" ${val ? "" : "selected"}>Choose…</option>` : `<option value="">${g.id === "armour" ? "Standard (" + esc(p.armour) + ")" : "None"}</option>`}
            ${g.choices.map((c) => `<option value="${c.id}" ${c.id === val ? "selected" : ""}>${esc(c.label)} (${sign(c.cost || 0)})</option>`).join("")}
          </select></label>`;
      }).join("");
      const innate = R.innateAttrs(list, p);
      let attrHtml = "";
      for (let i = 0; i < p.slots; i++) {
        const sel = (e.attrs || [])[i] || "";
        const others = [...innate, ...(e.attrs || []).filter((_, j) => j !== i), e.bujutsu].filter(Boolean);
        attrHtml += `<label class="opt">Attribute ${p.slots > 1 ? i + 1 : ""} (+3)<select data-attr="${i}">${attrOptions(sel, others)}</select></label>`;
      }
      let ninjaHtml = "";
      if (p.ninja) {
        const f = FACTIONS[list.faction];
        const lowRanks = Object.entries(f.models).filter(([, mp]) => mp.rank <= 1);
        const bujutsu = Object.keys(ATTRIBUTES).filter((a) => ATTRIBUTES[a].kind !== "Ability");
        ninjaHtml = `<label class="opt">Deployment<select data-disguise>
            <option value="">Undisguised</option>
            ${lowRanks.map(([k, mp]) => `<option value="${k}" ${e.disguisedAs === k ? "selected" : ""}>Disguised as ${esc(mp.name)}</option>`).join("")}
          </select></label>
          <label class="opt">Free Bujutsu<select data-bujutsu><option value="">Choose…</option>${bujutsu.map((b) => `<option ${e.bujutsu === b ? "selected" : ""}>${b}</option>`).join("")}</select></label>`;
      }
      const statCells = [["Rank", m.rank], ["CP", m.cp], ["Ini", m.init], ["Fight", m.fight], ["Shoot", m.shoot], ["Armour", m.armour]];
      return `<li class="entry ${m.issues.length ? "has-issue" : ""}" data-uid="${e.uid}">
        <div class="entry-head">
          <span class="rank" data-rank="${m.rank}">${m.rank}</span>
          <div class="entry-title">
            <input class="entry-name" data-name value="${esc(e.name || "")}" placeholder="${esc(p.name)}" aria-label="Model name">
            <span class="entry-type">${esc(p.name)}${m.sfh ? " · Sword-for-Hire" : ""}${isLeader ? ` · <strong class="leader">Leader</strong>` : ""}</span>
          </div>
          <span class="entry-pts">${m.points}<small> pts</small></span>
        </div>
        <table class="stats"><tr>${statCells.map(([k]) => `<th scope="col">${k}</th>`).join("")}</tr><tr>${statCells.map(([, v]) => `<td>${esc(v)}</td>`).join("")}</tr></table>
        <p class="kit"><span>Weapons</span> ${esc(m.weapons.join(", ") || "—")}</p>
        <p class="kit"><span>Attributes</span> ${m.attrs.length ? m.attrs.map((a) => `<abbr title="${esc(ATTRIBUTES[a] ? ATTRIBUTES[a].text : "")}">${esc(a)}</abbr>`).join(", ") : "None"}</p>
        ${m.notes ? `<p class="kit"><span>Note</span> ${esc(m.notes)}</p>` : ""}
        ${groupHtml || attrHtml || ninjaHtml ? `<div class="opts">${ninjaHtml}${groupHtml}${attrHtml}</div>` : ""}
        ${m.issues.length ? `<p class="issue">${m.issues.map(esc).join(". ")}</p>` : ""}
        <div class="entry-actions">
          ${ties && m.rank === topRank && !isLeader ? `<button type="button" data-leader class="quiet">Make Leader</button>` : ""}
          <button type="button" data-dup class="quiet">Duplicate</button>
          <button type="button" data-remove class="quiet danger">Remove</button>
        </div>
      </li>`;
    }).join("");
  }

  function renderPrint(list, ev) {
    const f = FACTIONS[list.faction];
    const wref = new Set();
    ev.models.forEach((m) => m.weapons.forEach((w) => wref.add(w)));
    const attrRef = new Set();
    ev.models.forEach((m) => m.attrs.forEach((a) => attrRef.add(a)));
    const wrow = (w) => {
      const d = WEAPONS[w] || {};
      const base = d.same ? WEAPONS[d.same] : d;
      const bits = [];
      if (d.same) bits.push("as " + d.same.toLowerCase());
      if (base.init) bits.push("Ini " + base.init);
      if (base.atk) bits.push("Atk " + base.atk);
      if (base.range) bits.push("Range " + base.range);
      if (base.wound) bits.push("Wound " + base.wound);
      const note = d.note || base.note;
      if (note) bits.push(note);
      return `<li><b>${esc(w)}</b> ${esc(bits.join("; "))}</li>`;
    };
    $("#print-roster").innerHTML = `
      <h1>Buntai Roster: ${esc(list.name)}</h1>
      <table class="p-head"><tr><th>Faction</th><td>${esc(f.name)}</td><th>Morale</th><td>${esc(ev.morale)}</td><th>Points</th><td>${ev.total}${list.limit ? " / " + list.limit : ""}</td><th>Models</th><td>${ev.models.length}</td></tr></table>
      ${list.notes || ev.kiai ? `<p class="p-notes">${ev.kiai ? `Fearsome Kiai ×${ev.kiai}. ` : ""}${esc(list.notes)}</p>` : ""}
      <div class="p-models">${ev.models.map((m) => `
        <div class="p-model">
          <div class="p-name"><b>${esc(m.name)}</b>${m.entry.name ? ` (${esc(m.profile.name)})` : ""}${m.entry.uid === ev.leaderUid ? " · Leader" : ""}${m.sfh ? " · Sword-for-Hire" : ""}</div>
          <table><tr><th>Type</th><th>Rank</th><th>CP</th><th>Initiative</th><th>Fight</th><th>Shoot</th><th>Armour</th><th>Points</th></tr>
          <tr><td>${esc(m.type)}</td><td>${m.rank}</td><td>${m.cp}</td><td>${m.init}</td><td>${m.fight}</td><td>${m.shoot}</td><td>${esc(m.armour)}</td><td>${m.points}</td></tr></table>
          <p><b>Weapons</b> ${esc(m.weapons.join(", "))}</p>
          <p><b>Attributes</b> ${esc(m.attrs.join(", ") || "None")}</p>
          <p class="p-wounds"><b>Wounds</b> ☐ Stunned ☐ Light ☐ Grievous ☐ Critical</p>
        </div>`).join("")}</div>
      <div class="p-ref">
        <h2>Quick reference</h2>
        <ul>${[...wref].map(wrow).join("")}</ul>
        <ul>${[...attrRef].map((a) => `<li><b>${esc(a)}</b> ${esc(ATTRIBUTES[a].text)}</li>`).join("")}</ul>
        ${f.notes && f.notes.length ? `<ul>${f.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      </div>`;
  }

  // ---------- Mutations ----------
  function update(fn) {
    fn(cur());
    save();
    render();
  }
  const entryOf = (el) => {
    const li = el.closest("[data-uid]");
    return li && cur().entries.find((e) => e.uid === li.dataset.uid);
  };

  // List bar
  $("#list-select").addEventListener("change", (e) => { state.current = e.target.value; save(); render(); });
  $("#new-list").addEventListener("click", () => {
    const l = blankList(cur().faction);
    state.lists.push(l);
    state.current = l.id;
    save(); render();
    $("#list-name").select();
  });
  $("#dup-list").addEventListener("click", () => {
    const c = JSON.parse(JSON.stringify(cur()));
    c.id = uid();
    c.name = cur().name + " (copy)";
    state.lists.push(c);
    state.current = c.id;
    save(); render();
  });
  $("#del-list").addEventListener("click", () => {
    const l = cur();
    if (!confirm(`Delete “${l.name}”? This can't be undone.`)) return;
    state.lists = state.lists.filter((x) => x.id !== l.id);
    if (!state.lists.length) state.lists.push(blankList());
    state.current = state.lists[0].id;
    save(); render();
  });
  $("#print-list").addEventListener("click", () => window.print());

  // Settings
  $("#list-name").addEventListener("input", (e) => {
    cur().name = e.target.value || "Untitled Buntai";
    save();
    const opt = $("#list-select").selectedOptions[0];
    if (opt) opt.textContent = `${cur().name} · ${FACTIONS[cur().faction].name}`;
    renderPrint(cur(), R.evaluate(cur()));
  });
  $("#list-notes").addEventListener("input", (e) => { cur().notes = e.target.value; save(); renderPrint(cur(), R.evaluate(cur())); });
  $("#limit").addEventListener("change", (e) => update((l) => { l.limit = Math.max(0, parseInt(e.target.value, 10) || 0); }));
  $("#faction").addEventListener("change", (e) => {
    const l = cur();
    if (l.entries.length && !confirm("Changing faction removes the models in this Buntai. Continue?")) {
      e.target.value = l.faction;
      return;
    }
    update((l) => { l.faction = e.target.value; l.entries = []; l.kiai = 0; l.leader = null; });
  });
  const setKoryu = () => update((l) => {
    const p = $("#koryu-primary").value;
    const s = [$("#koryu-sec1").value, $("#koryu-sec2").value].filter((w, i, a) => w && w !== p && a.indexOf(w) === i);
    l.koryu = { primary: p, secondary: s };
    const allowedW = [p, ...s];
    l.entries.forEach((en) => { if (en.choices && en.choices.weapon && !allowedW.includes(en.choices.weapon)) delete en.choices.weapon; });
  });
  ["#koryu-primary", "#koryu-sec1", "#koryu-sec2"].forEach((s) => $(s).addEventListener("change", setKoryu));
  $("#kiai-settings").addEventListener("click", (e) => {
    const b = e.target.closest("[data-kiai]");
    if (b) update((l) => { l.kiai = Math.max(0, Math.min(D.KIAI_MAX, (l.kiai || 0) + Number(b.dataset.kiai))); });
  });

  // Catalogue
  $("#catalogue").addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (!b) return;
    const [src, key] = b.dataset.add.split(":");
    const l = cur();
    const entry = { uid: uid(), src, key, name: "", choices: {}, attrs: [] };
    const p = R.profileFor(l, entry);
    if (p.koryuWeapon && l.koryu.primary) entry.choices.weapon = l.koryu.primary;
    update((l) => l.entries.push(entry));
    const li = document.querySelector(`[data-uid="${entry.uid}"]`);
    if (li) li.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });

  // Roster
  const roster = $("#roster");
  roster.addEventListener("change", (e) => {
    const t = e.target;
    const en = entryOf(t);
    if (!en) return;
    update(() => {
      en.choices = en.choices || {};
      if (t.dataset.group) {
        if (t.value) en.choices[t.dataset.group] = t.value; else delete en.choices[t.dataset.group];
        if (t.dataset.group === "banner" && t.value) {
          // Banner bearers carry nothing extra.
          const p = R.profileFor(cur(), en);
          R.groupsFor(cur(), p).forEach((g) => { if (g.equipment) delete en.choices[g.id]; });
        }
      } else if (t.dataset.attr != null) {
        en.attrs = en.attrs || [];
        en.attrs[Number(t.dataset.attr)] = t.value;
      } else if (t.hasAttribute("data-disguise")) {
        en.disguisedAs = t.value || null;
      } else if (t.hasAttribute("data-bujutsu")) {
        en.bujutsu = t.value || null;
      }
    });
  });
  roster.addEventListener("input", (e) => {
    if (!e.target.hasAttribute("data-name")) return;
    const en = entryOf(e.target);
    if (!en) return;
    en.name = e.target.value;
    save();
    renderPrint(cur(), R.evaluate(cur()));
  });
  roster.addEventListener("click", (e) => {
    const en = entryOf(e.target);
    if (!en) return;
    if (e.target.closest("[data-remove]")) update((l) => { l.entries = l.entries.filter((x) => x !== en); });
    else if (e.target.closest("[data-dup]")) update((l) => {
      const c = JSON.parse(JSON.stringify(en));
      c.uid = uid();
      l.entries.splice(l.entries.indexOf(en) + 1, 0, c);
    });
    else if (e.target.closest("[data-leader]")) update((l) => { l.leader = en.uid; });
  });

  fillFactionSelect();
  render();
})();
