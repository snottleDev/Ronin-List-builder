/*
 * Points and composition logic. Pure functions, no DOM, so it can be tested in Node.
 */
(function (root) {
  "use strict";
  const D = root.RONIN_DATA || (typeof require !== "undefined" ? require("./data.js") : null);
  const { ATTRIBUTES, WEAPONS, FACTIONS, SWORDS, KORYU_WEAPONS, BUJUTSU_FOR_WEAPON, ATTR_COST, KIAI_COST } = D;

  const canon = (w) => (WEAPONS[w] && WEAPONS[w].same) || w;
  const isMissile = (w) => !!(WEAPONS[w] && WEAPONS[w].missile);
  const isFirearm = (w) => !!(WEAPONS[w] && WEAPONS[w].firearm);
  const isWeaponBujutsu = (a) => ATTRIBUTES[a] && ATTRIBUTES[a].kind === "Weapons Bujutsu";

  function profileFor(list, entry) {
    if (entry.src === "sfh") return SWORDS[entry.key];
    const f = FACTIONS[list.faction];
    return f && f.models[entry.key];
  }

  function koryuSchool(list) {
    const k = list.koryu || {};
    const weapons = [k.primary, ...(k.secondary || [])].filter((w, i, a) => w && a.indexOf(w) === i);
    return { primary: k.primary || null, weapons };
  }

  // Option groups for a profile in the context of a list (Koryu weapons are dynamic).
  function groupsFor(list, profile) {
    if (profile.koryuWeapon) {
      const school = koryuSchool(list);
      const g = {
        id: "weapon",
        label: "Weapon",
        required: true,
        equipment: true,
        choices: school.weapons.map((w) => ({ id: w, label: w + (w === school.primary ? " (primary)" : ""), cost: KORYU_WEAPONS[w], add: [w] })),
      };
      return [g, ...profile.groups];
    }
    return profile.groups;
  }

  function innateAttrs(list, profile) {
    const a = [...profile.attrs];
    if (profile.koryuBujutsu) {
      const p = koryuSchool(list).primary;
      if (p && BUJUTSU_FOR_WEAPON[p]) a.push(BUJUTSU_FOR_WEAPON[p]);
    }
    return a;
  }

  /** Resolve an entry to its final stats, equipment and cost. */
  function resolve(list, entry) {
    const profile = profileFor(list, entry);
    if (!profile) return null;
    const issues = [];
    let points = profile.points;
    let armour = profile.armour;
    let cp = profile.cp;
    let weapons = [...profile.weapons];
    let mounted = !!profile.mounted;
    const choices = entry.choices || {};
    const groups = groupsFor(list, profile);
    const bannerOn = choices.banner === "banner" && groups.some((g) => g.id === "banner");
    const picked = [];

    // Disguised ninja takes the equipment of a Rank 0–1 faction model.
    let disguise = null;
    if (profile.ninja && entry.disguisedAs) {
      const f = FACTIONS[list.faction];
      disguise = f && f.models[entry.disguisedAs];
      if (disguise) {
        weapons = ["Shuriken", ...disguise.weapons.filter((w) => w !== "Shuriken")];
        armour = disguise.armour;
      }
    }

    for (const g of groups) {
      if (disguise) break; // a disguised ninja has no extra options
      const cid = choices[g.id];
      const locked = bannerOn && g.equipment;
      if (!cid || locked) {
        if (g.required && !locked) issues.push("Choose a " + g.label.toLowerCase());
        continue;
      }
      const c = g.choices.find((x) => x.id === cid);
      if (!c) {
        if (g.required) issues.push("Choose a " + g.label.toLowerCase());
        continue;
      }
      points += c.cost || 0;
      if (c.remove) weapons = weapons.filter((w) => !c.remove.includes(w));
      if (c.add) weapons.push(...c.add);
      if (c.armour) armour = c.armour;
      if (c.cp) cp += c.cp;
      if (c.mounted) mounted = true;
      picked.push({ group: g.id, choice: c });
    }

    const innate = innateAttrs(list, profile);
    const chosen = (entry.attrs || []).filter((a, i, arr) => a && ATTRIBUTES[a] && arr.indexOf(a) === i && !innate.includes(a)).slice(0, profile.slots);
    points += chosen.length * ATTR_COST;
    let free = [];
    if (profile.freeBujutsu) {
      if (entry.bujutsu && ATTRIBUTES[entry.bujutsu] && ATTRIBUTES[entry.bujutsu].kind !== "Ability") free = [entry.bujutsu];
      else issues.push("Choose the Ninja's free Bujutsu");
    }
    const attrs = [...innate, ...free, ...chosen];

    // Prerequisites for advanced bujutsu
    if (attrs.includes("Niten") && !attrs.includes("Kenjutsu")) issues.push("Niten needs Kenjutsu");
    if (attrs.includes("Yadome-jutsu") && !attrs.some(isWeaponBujutsu)) issues.push("Yadome-jutsu needs a Weapons Bujutsu");
    if (attrs.includes("Niten")) cp += 1;

    return {
      entry,
      profile,
      name: entry.name || profile.name,
      type: profile.type,
      rank: profile.rank,
      cp,
      init: profile.init,
      fight: profile.fight,
      shoot: profile.shoot,
      armour: disguise ? armour + " (as " + disguise.name + ")" : armour,
      weapons,
      attrs,
      chosenAttrs: chosen,
      points,
      mounted,
      banner: bannerOn,
      sfh: entry.src === "sfh",
      disguisedAs: disguise ? disguise.name : null,
      hasMissile: weapons.some(isMissile),
      hasFirearm: weapons.some(isFirearm),
      notes: profile.notes || "",
      issues,
    };
  }

  const floorPct = (n, pct) => Math.floor((n * pct) / 100);

  /** Validate a whole list. Returns { models, total, errors[], notes[], leaderUid, morale }. */
  function evaluate(list) {
    const faction = FACTIONS[list.faction];
    const models = (list.entries || []).map((e) => resolve(list, e)).filter(Boolean);
    const errors = [];
    const notes = [];
    const add = (msg) => errors.push(msg);
    const kiai = faction && faction.kiai ? Math.max(0, Math.min(D.KIAI_MAX, list.kiai || 0)) : 0;
    const total = models.reduce((s, m) => s + m.points, 0) + kiai * KIAI_COST;
    if (!faction) return { models, total, errors: ["Pick a faction"], notes, leaderUid: null, morale: "" };

    const limit = Number(list.limit) || 0;
    if (limit && total > limit) add(`Over the points limit by ${total - limit}`);

    const n = models.length;
    if (n < D.MIN_MODELS) add(`A Buntai needs at least ${D.MIN_MODELS} models (has ${n})`);
    if (n > D.MAX_MODELS) add(`A Buntai can have at most ${D.MAX_MODELS} models (has ${n})`);

    for (const m of models) for (const i of m.issues) add(`${m.name}: ${i}`);

    // ----- Swords-for-Hire -----
    const sfh = models.filter((m) => m.sfh);
    const core = models.filter((m) => !m.sfh);
    const allowed = faction.sfh || {};
    const sfhMax = floorPct(n, 25);
    if (sfh.length > sfhMax) add(`Swords-for-Hire are capped at 25% of models: ${sfhMax} allowed, ${sfh.length} taken`);
    const countKey = (k) => sfh.filter((m) => m.entry.key === k).length;
    for (const k of ["ronin", "seniorRonin", "warriorMonk", "shugyosha", "ninja"]) {
      const c = countKey(k);
      if (!c) continue;
      const ok = allowed[k] || ((k === "warriorMonk" || k === "shugyosha") && allowed.monkOrShugyosha);
      if (!ok) add(`${faction.name} can't hire ${SWORDS[k].name}`);
      else if (typeof allowed[k] === "number" && c > allowed[k]) add(`${faction.name} may hire only ${allowed[k]} ${SWORDS[k].name}`);
    }
    if (allowed.monkOrShugyosha && countKey("warriorMonk") + countKey("shugyosha") > 1) add("Peasants may hire only one Warrior Monk or Shugyosha in total");
    if (countKey("seniorRonin") > 1) add("Only one Senior Ronin may be fielded");
    if (countKey("seniorRonin") && countKey("ronin") < 2) add("A Senior Ronin needs at least two other Ronin");
    if (countKey("shugyosha") > 1) add("Only one Shugyosha may be fielded");
    if (countKey("ninja") > 1) add("Only one Ninja may be fielded");
    if (sfh.length) notes.push("Swords-for-Hire are left out of the rank and weapon limits below (the book says they don't count toward composition).");
    if (countKey("ninja") && faction.sfhNote) notes.push(faction.sfhNote);

    // ----- Composition (core models only) -----
    const R = [0, 0, 0, 0, 0, 0];
    core.forEach((m) => R[m.rank]++);
    const nc = core.length;
    const r3up = R[3] + R[4] + R[5];
    const firearms = core.filter((m) => m.hasFirearm).length;
    const missiles = core.filter((m) => m.hasMissile).length;
    const cap = (count, pct, what) => {
      const max = floorPct(nc, pct);
      if (count > max) add(`No more than ${pct}% may have ${what}: ${max} allowed, ${count} taken`);
    };
    const maxOf = (rank, max) => {
      if (R[rank] > max) add(`Only ${max} Rank ${rank} model${max === 1 ? "" : "s"} allowed (has ${R[rank]})`);
    };

    switch (list.faction) {
      case "bushi":
        if (!(nc > 0 && r3up === nc) && R[1] + R[2] < 2 * r3up) add(`Need two Rank 1–2 models per Rank 3+ model (or all Rank 3+): ${R[1] + R[2]} for ${r3up}`);
        if (R[1] + R[2] > 0 && R[1] < 3 * R[2]) add(`Need three Rank 1 models per Rank 2 model: ${R[1]} for ${R[2]}`);
        if (R[4] > R[3]) add(`Each Rank 4 model needs a Rank 3 model: ${R[3]} for ${R[4]}`);
        maxOf(5, 1);
        cap(firearms, 25, "a teppo");
        cap(missiles, 50, "a missile weapon");
        break;
      case "ikko":
        if (R[0] + R[1] <= R[2] + r3up) add(`Need more Rank 0–1 than Rank 2+ models: ${R[0] + R[1]} vs ${R[2] + r3up}`);
        if (R[1] < 3 * R[2]) add(`Need three Rank 1 models per Rank 2 model: ${R[1]} for ${R[2]}`);
        maxOf(4, 1);
        cap(firearms, 25, "a teppo");
        cap(missiles, 50, "a missile weapon");
        break;
      case "sohei":
        maxOf(5, 1);
        cap(firearms, 25, "a teppo");
        cap(missiles, 50, "a missile weapon");
        break;
      case "koryu": {
        maxOf(5, 1);
        const school = koryuSchool(list);
        if (!school.primary) add("Choose the school's primary weapon");
        else {
          const withPrimary = core.filter((m) => m.weapons.includes(school.primary)).length;
          if (withPrimary * 2 < nc) add(`At least half must carry the primary weapon (${school.primary}): ${withPrimary} of ${nc}`);
        }
        break;
      }
      case "bandits": {
        if (R[0] + R[1] <= R[2] + r3up) add(`Need more Rank 0–1 than Rank 2+ models: ${R[0] + R[1]} vs ${R[2] + r3up}`);
        maxOf(3, 1);
        cap(firearms, 10, "a teppo");
        cap(missiles, 50, "a missile weapon");
        const g = core.filter((m) => m.entry.key === "gashira");
        const gAttr = g.filter((m) => m.chosenAttrs.length).length;
        if (gAttr > Math.floor(g.length / 2)) add(`Only half the Gashira may take an Attribute: ${Math.floor(g.length / 2)} allowed, ${gAttr} taken`);
        break;
      }
      case "koreans":
        if (R[0] + R[1] <= R[3] + R[4]) add(`Need more Rank 0–1 than Rank 3–4 models: ${R[0] + R[1]} vs ${R[3] + R[4]}`);
        if (R[2] > Math.floor((R[0] + R[1]) / 4)) add(`One Rank 2 model per four Rank 0–1 models: ${Math.floor((R[0] + R[1]) / 4)} allowed, ${R[2]} taken`);
        maxOf(4, 1);
        cap(firearms, 10, "an arquebus");
        cap(missiles, 50, "a missile weapon");
        if (core.some((m) => m.entry.key === "monk") && core.some((m) => m.entry.key === "heavyInf" || m.entry.key === "heavyCav")) add("With Monks in the Buntai, no Heavy Infantry or Heavy Cavalry may be used");
        break;
      case "ming":
        if (R[0] + R[1] <= R[3] + R[4]) add(`Need more Rank 0–1 than Rank 3–4 models: ${R[0] + R[1]} vs ${R[3] + R[4]}`);
        if (R[2] > Math.floor((R[0] + R[1]) / 4)) add(`One Rank 2 model per four Rank 0–1 models: ${Math.floor((R[0] + R[1]) / 4)} allowed, ${R[2]} taken`);
        maxOf(4, 1);
        cap(firearms, 25, "an arquebus");
        cap(missiles, 50, "a missile weapon");
        break;
      case "peasants": {
        const pp = core.filter((m) => m.entry.key === "peasant").reduce((s, m) => s + m.points, 0);
        if (total > 0 && pp * 100 < total * 30) add(`At least 30% of points must be on Peasants: ${pp} of ${total} (${Math.round((pp / total) * 100)}%)`);
        break;
      }
    }

    // Banners
    const banners = models.filter((m) => m.banner).length;
    if (faction.bannerLimit && banners > faction.bannerLimit) add(`Only ${faction.bannerLimit} banner allowed (has ${banners})`);

    // Leader: highest rank; player picks among ties.
    let leaderUid = null;
    if (models.length) {
      const top = Math.max(...models.map((m) => m.rank));
      const cands = models.filter((m) => m.rank === top);
      const chosen = cands.find((m) => m.entry.uid === list.leader);
      leaderUid = (chosen || cands[0]).entry.uid;
    }

    let morale = faction.morale;
    if (list.faction === "ikko") morale = banners ? "9 (banner)" : "8";
    return { models, total, kiai, errors, notes, leaderUid, morale, ranks: R, coreCount: nc };
  }

  const API = { resolve, evaluate, groupsFor, innateAttrs, profileFor, koryuSchool, canon, isMissile };
  root.RONIN_RULES = API;
  if (typeof module !== "undefined") module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
