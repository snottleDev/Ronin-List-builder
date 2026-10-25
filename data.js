/*
 * Game data for Ronin (Osprey Wargames 4, 2013) by Craig Woodfield.
 * Profiles, points and option costs are transcribed from the rulebook so the
 * builder can do the arithmetic. Rule descriptions are short paraphrases —
 * you need the book to play. This is an unofficial fan tool.
 */
(function (root) {
  "use strict";

  // ---------- Attributes ----------
  const ATTRIBUTES = {
    // Abilities
    Acrobatic: { kind: "Ability", text: "Ignores difficult terrain and treats impassable as difficult; can't be attacked while withdrawing; may move through friends." },
    Commander: { kind: "Ability", text: "If any model in the Buntai has it, Morale Tests get −1." },
    Fast: { kind: "Ability", text: "+1 to Initiative Rolls and wins Initiative ties." },
    Fearless: { kind: "Ability", text: "Ignores Morale Test results." },
    Inexorable: { kind: "Ability", text: "After killing everything it fights, may move 2\" into a new enemy and keep fighting with leftover Attack Counters." },
    Intuition: { kind: "Ability", text: "One free Defence Counter each turn." },
    Powerful: { kind: "Ability", text: "+1 to Attack Rolls." },
    Tough: { kind: "Ability", text: "Ignores the effects of Light wounds; a Critical wound only removes it at the end of the Combat Phase." },
    Yojimbo: { kind: "Ability", text: "Bodyguard: once per game may swap places with the Leader (within 3\"); may intercept a shot aimed at the highest-ranked model." },
    // Weapons Bujutsu
    Kenjutsu: { kind: "Weapons Bujutsu", weapon: ["Katana", "Wakizashi", "Nodachi"], text: "Re-roll one Attack or Defence die per roll with katana, wakizashi or nodachi." },
    Naginatajutsu: { kind: "Weapons Bujutsu", weapon: ["Naginata"], text: "Re-roll one Attack or Defence die per roll with a naginata." },
    Sojutsu: { kind: "Weapons Bujutsu", weapon: ["Yari"], text: "Re-roll one Attack or Defence die per roll with a yari." },
    Jojutsu: { kind: "Weapons Bujutsu", weapon: ["Jo"], text: "Re-roll one Attack or Defence die per roll with a jo." },
    Bojutsu: { kind: "Weapons Bujutsu", weapon: ["Bo"], text: "Re-roll one Attack or Defence die per roll with a bo." },
    Tetsubojutsu: { kind: "Weapons Bujutsu", weapon: ["Tetsubo"], text: "Re-roll one Attack or Defence die per roll with a tetsubo." },
    Kasurigamajutsu: { kind: "Weapons Bujutsu", weapon: ["Kasurigama"], text: "Re-roll one die with a kasurigama; +1 to Subdue and Disarm." },
    Jujutsu: { kind: "Weapons Bujutsu", weapon: ["Weaponless"], text: "Re-roll one die when fighting weaponless; +1 to Subdue." },
    Kyujutsu: { kind: "Weapons Bujutsu", weapon: ["Yumi"], text: "Re-roll one Shooting Attack die with a yumi." },
    Hojutsu: { kind: "Weapons Bujutsu", weapon: ["Teppo"], text: "Re-roll one Shooting Attack die with a teppo." },
    // Advanced Bujutsu
    Niten: { kind: "Advanced Bujutsu", requires: "Kenjutsu", text: "Fights with katana and wakizashi together: +1 Combat Pool. Requires Kenjutsu." },
    "Yadome-jutsu": { kind: "Advanced Bujutsu", requires: "anyWeaponBujutsu", text: "Yumi attacks against this model get an extra −2. Requires any Weapons Bujutsu." },
    Bajutsu: { kind: "Advanced Bujutsu", text: "No penalties for fighting or shooting while mounted." },
    "Senjo-jutsu": { kind: "Advanced Bujutsu", text: "Re-roll your Priority roll, or force the opponent to re-roll theirs." },
  };

  // ---------- Weapons reference ----------
  // init / attack modifiers from the hand-to-hand and missile tables.
  const WEAPONS = {
    Katana: { init: "", atk: "", note: "" },
    Wakizashi: { init: "−1", atk: "", note: "" },
    Nodachi: { init: "−1", atk: "+1", note: "" },
    Tanto: { init: "−1", atk: "−1", note: "" },
    Naginata: { init: "+1", atk: "+1", note: "" },
    Yari: { init: "+2", atk: "", note: "+1 Attack on a mounted ride-by." },
    "Nagae-yari": { init: "+3/−2", atk: "", note: "+3 Initiative in the first round, then −2 each later turn of the same combat." },
    Jo: { init: "+1", atk: "", note: "" },
    Bo: { init: "", atk: "", note: "" },
    Tetsubo: { init: "−1", atk: "+1", note: "" },
    Kasurigama: { init: "+1/−", atk: "", note: "+1 Initiative in the first round; +1 to Subdue." },
    Weaponless: { init: "−1", atk: "−1", note: "Extra −1 against heavy armour." },
    "Improvised weapon": { init: "−1", atk: "", note: "" },
    Yumi: { missile: true, range: "48\"", note: "" },
    Teppo: { missile: true, firearm: true, range: "48\"", note: "Reload after firing; −1 beyond 24\"; light/medium armour gives no protection, heavy counts as light." },
    Shuriken: { missile: true, range: "6\"", wound: "−2", note: "No penalty for moving." },
    // Continental equivalents (Koreans, Ming)
    Sword: { same: "Katana" },
    Spear: { same: "Yari" },
    Bow: { same: "Yumi", missile: true },
    Arquebus: { same: "Teppo", missile: true, firearm: true },
    Halberd: { same: "Naginata" },
    Flail: { init: "−1", atk: "+2", note: "Korean special weapon." },
    Shield: { note: "Part of the model's armour value." },
    Horse: { note: "Mounted: 12\" move, 18\" gallop, ride-by attacks." },
    Warhorse: { note: "Mounted, and the horse fights too (Fight 1, one Attack Counter, Initiative 1)." },
    Banner: { note: "Can't engage voluntarily; −1 to rolls if engaged; Buntai may re-roll failed Morale Tests while held." },
  };

  // ---------- Option-group helpers ----------
  const SAMURAI_WEAPONS = ["Naginata", "Nodachi", "Yari", "Tetsubo", "Teppo", "Yumi"];

  function weapon(list, cost, opts = {}) {
    return {
      id: opts.id || "weapon",
      label: opts.label || (opts.required ? "Weapon" : "Extra weapon"),
      required: !!opts.required,
      equipment: true,
      choices: list.map((w) => ({
        id: w,
        label: w,
        cost: typeof cost === "object" ? cost[w] : cost,
        add: [w],
        remove: opts.remove || [],
      })),
    };
  }
  function armour(choices) {
    return {
      id: "armour",
      label: "Armour",
      choices: choices.map(([a, cost]) => ({ id: a, label: a === "None" ? "No armour" : a + " armour", cost, armour: a })),
    };
  }
  function mount(horse, warhorse) {
    const c = [{ id: "Horse", label: "Horse", cost: horse, add: ["Horse"], mounted: true }];
    if (warhorse != null) c.push({ id: "Warhorse", label: "Warhorse", cost: warhorse, add: ["Warhorse"], mounted: true });
    return { id: "mount", label: "Mount", equipment: true, choices: c };
  }
  function banner(cost, note) {
    return {
      id: "banner",
      label: "Banner",
      exclusive: true, // clears and locks other equipment options
      choices: [{ id: "banner", label: "Carry banner" + (note ? " (" + note + ")" : ""), cost, add: ["Banner"], banner: true }],
    };
  }

  // A profile: { name, type, rank, cp, init, fight, shoot, armour, points,
  //   weapons:[], attrs:[] innate, slots: n extra attrs at +3, groups:[], notes }
  const P = (o) => Object.assign({ attrs: [], slots: 0, groups: [], weapons: [] }, o);

  const PEASANT = (yari = true) =>
    P({ name: "Peasant", type: "Peasant", rank: 0, cp: 1, init: 1, fight: 1, shoot: 0, armour: "None", points: 4, weapons: ["Improvised weapon"], groups: yari ? [weapon(["Yari"], 4)] : [] });

  const SAMURAI = (name = "Samurai") =>
    P({ name, type: "Samurai", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Heavy", points: 24, weapons: ["Katana", "Wakizashi"], attrs: ["Commander"], slots: 1, groups: [weapon(SAMURAI_WEAPONS, 3), armour([["None", -6]])] });

  const R4SAMURAI = (name) =>
    P({ name, type: "Samurai", rank: 4, cp: 4, init: 4, fight: 4, shoot: 2, armour: "Heavy", points: 29, weapons: ["Katana", "Wakizashi"], attrs: ["Commander"], slots: 2, groups: [weapon(SAMURAI_WEAPONS, 3), mount(10, 15), armour([["None", -6]])] });

  // Korean / Ming shield exchange
  function shieldSwap(extraSwordCp, weaponsList = ["Bow", "Spear", "Halberd"]) {
    const choices = weaponsList.map((w) => ({ id: w, label: "Shield → " + w.toLowerCase(), cost: 3, add: [w], remove: ["Shield"], armour: "Medium" }));
    if (extraSwordCp) choices.push({ id: "Sword", label: "Shield → second sword (CP " + extraSwordCp + ")", cost: 0, add: ["Sword"], remove: ["Shield"], armour: "Medium", cp: 1 });
    return { id: "shield", label: "Exchange shield", equipment: true, choices };
  }

  const FACTIONS = {
    bushi: {
      name: "Bushi",
      blurb: "Professional soldiers: Ashigaru footmen and Samurai. Strong arms, armour and skills.",
      morale: "9",
      sfh: { ronin: true, seniorRonin: true, warriorMonk: 1, ninja: 1 },
      sfhNote: "Hiring a Ninja costs the Bushi 1 Victory Point.",
      kiai: true,
      notes: [
        "−1 VP for each friendly model killed by a lower-ranked enemy.",
        "+1 VP for each enemy head held by a living Samurai at the end.",
        "A losing Bushi Leader who is alive may commit seppuku for +2 VP (can make a draw, never a win).",
      ],
      models: {
        ashigaru: P({ name: "Ashigaru", type: "Ashigaru", rank: 1, cp: 2, init: 2, fight: 2, shoot: 1, armour: "Medium", points: 18, weapons: ["Katana"], groups: [weapon(["Yari", "Nagae-yari", "Yumi", "Teppo"], 0, { required: true }), armour([["None", -4]]), banner(-3, "−3 pts, katana only")] }),
        gashira: P({ name: "Ashigaru-gashira", type: "Ashigaru", rank: 2, cp: 2, init: 2, fight: 3, shoot: 1, armour: "Medium", points: 18, weapons: ["Katana"], attrs: ["Commander"], groups: [weapon(["Yari", "Nagae-yari", "Teppo", "Yumi"], 3), armour([["None", -4]]), banner(0, "free, no other equipment")] }),
        samurai: SAMURAI(),
        hatamoto: R4SAMURAI("Hatamoto"),
        bushou: P({ name: "Bushou", type: "Samurai", rank: 5, cp: 5, init: 4, fight: 5, shoot: 3, armour: "Heavy", points: 34, weapons: ["Katana", "Wakizashi"], attrs: ["Commander"], slots: 3, groups: [weapon(SAMURAI_WEAPONS, 3), mount(10, 15), armour([["None", -6]])] }),
      },
      bannerLimit: 1,
    },

    ikko: {
      name: "Ikko-Ikki",
      blurb: "The Single-minded League: peasants, Monto footmen, monks and Samurai under Buddhist banners.",
      morale: "8, or 9 with a banner",
      sfh: { ronin: true, seniorRonin: true, ninja: 1 },
      notes: ["Monto and Monto-gashira may carry banners for free (no other equipment)."],
      models: {
        peasant: PEASANT(),
        monto: P({ name: "Monto", type: "Monto", rank: 1, cp: 2, init: 2, fight: 2, shoot: 1, armour: "Light", points: 13, weapons: ["Katana"], groups: [weapon(["Yari", "Nagae-yari", "Teppo", "Yumi"], 3), armour([["None", -2]]), banner(0, "free")] }),
        montoGashira: P({ name: "Monto-gashira", type: "Samurai", rank: 2, cp: 2, init: 2, fight: 3, shoot: 1, armour: "Medium", points: 18, weapons: ["Katana"], attrs: ["Commander"], groups: [weapon(["Yari", "Nagae-yari", "Teppo", "Yumi"], 3), armour([["None", -4]]), banner(0, "free")] }),
        samurai: SAMURAI(),
        sohei: P({ name: "Sohei", type: "Sohei", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Medium", points: 26, weapons: ["Katana"], attrs: ["Fearless"], slots: 1, groups: [weapon(["Naginata", "Tetsubo", "Yumi", "Teppo"], 0, { required: true }), armour([["None", -4]])] }),
        hanshou: R4SAMURAI("Hanshou"),
      },
    },

    sohei: {
      name: "Sohei",
      blurb: "Buddhist warrior monks, famed for the naginata. Almost all Fearless.",
      morale: "Fearless (Temple Attendants test on 7)",
      sfh: {},
      notes: ["Temple Attendants are Fearless within 3\" of any Rank 2+ model."],
      models: {
        attendant: P({ name: "Temple Attendant", type: "Sohei", rank: 1, cp: 1, init: 1, fight: 1, shoot: 0, armour: "None", points: 8, weapons: ["Yari"], notes: "Fearless within 3\" of a Rank 2+ model" }),
        initiate: P({ name: "Initiate", type: "Sohei", rank: 2, cp: 2, init: 2, fight: 3, shoot: 1, armour: "Medium", points: 19, weapons: ["Katana"], attrs: ["Fearless"], groups: [weapon(["Naginata", "Tetsubo", "Yumi", "Teppo"], 0, { required: true }), armour([["None", -4]])] }),
        sohei: P({ name: "Sohei", type: "Sohei", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Medium", points: 26, weapons: ["Katana"], attrs: ["Fearless"], slots: 1, groups: [weapon(["Naginata", "Tetsubo", "Yumi"], 0, { required: true }), armour([["None", -4]])] }),
        senior: P({ name: "Senior Sohei", type: "Sohei", rank: 4, cp: 4, init: 4, fight: 4, shoot: 2, armour: "Medium", points: 31, weapons: ["Katana"], attrs: ["Fearless"], slots: 2, groups: [weapon(["Naginata", "Tetsubo", "Yumi"], 0, { required: true }), armour([["None", -4]])] }),
        grandmaster: P({ name: "Grandmaster", type: "Sohei", rank: 5, cp: 5, init: 4, fight: 5, shoot: 3, armour: "Medium", points: 36, weapons: ["Katana"], attrs: ["Fearless"], slots: 3, groups: [weapon(["Naginata", "Tetsubo", "Yumi"], 0, { required: true }), armour([["None", -4]])] }),
      },
    },

    koryu: {
      name: "Koryu",
      blurb: "A traditional martial arts school built around one primary weapon. Unarmoured specialists.",
      morale: "9 while the Sensei lives, otherwise 7",
      sfh: { shugyosha: 1 },
      koryu: true,
      notes: ["+1 VP for each surviving model that fought with the school's primary weapon."],
      models: {
        novice: P({ name: "Novice", type: "Koryu", rank: 1, cp: 1, init: 1, fight: 2, shoot: 0, armour: "None", points: 7, koryuWeapon: true }),
        initiate: P({ name: "Initiate", type: "Koryu", rank: 2, cp: 2, init: 2, fight: 2, shoot: 1, armour: "None", points: 14, koryuWeapon: true, koryuBujutsu: true }),
        kohai: P({ name: "Kohai", type: "Koryu", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "None", points: 20, koryuWeapon: true, koryuBujutsu: true }),
        senpai: P({ name: "Senpai", type: "Koryu", rank: 4, cp: 4, init: 4, fight: 4, shoot: 2, armour: "None", points: 26, koryuWeapon: true, koryuBujutsu: true, attrs: ["Commander"], slots: 1 }),
        sensei: P({ name: "Sensei", type: "Koryu", rank: 5, cp: 5, init: 4, fight: 5, shoot: 3, armour: "None", points: 31, koryuWeapon: true, koryuBujutsu: true, attrs: ["Commander"], slots: 2 }),
      },
    },

    bandits: {
      name: "Bandits",
      blurb: "Brigands, deserters and wako pirates in looted gear. Not strong, but colourful.",
      morale: "7",
      sfh: { ronin: true, seniorRonin: true },
      notes: [
        "+1 VP for each surviving model that looted a Rank 3+ enemy.",
        "On a failed Morale Test you may remove a friendly model within 6\" of the Leader to pass instead.",
        "Bandit teppos jam for good on an Attack Roll of double 1 or double 2.",
      ],
      models: {
        peasant: PEASANT(),
        bandit: P({ name: "Bandit", type: "Bandit", rank: 1, cp: 2, init: 2, fight: 2, shoot: 1, armour: "Light", points: 13, weapons: ["Katana"], groups: [weapon(["Yari", "Yumi", "Teppo"], 3), armour([["Medium", 2], ["None", -2]])] }),
        gashira: P({ name: "Gashira", type: "Samurai", rank: 2, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Light", points: 20, weapons: ["Katana"], attrs: ["Commander"], slots: 1, slotsHalf: true, groups: [weapon(SAMURAI_WEAPONS, 3), mount(10), armour([["Medium", 2], ["None", -2]])] }),
        leader: P({ name: "Leader", type: "Samurai", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Heavy", points: 24, weapons: ["Katana"], attrs: ["Commander"], slots: 1, groups: [weapon(SAMURAI_WEAPONS, 3), mount(10), armour([["Medium", -2], ["None", -6]])] }),
      },
    },

    koreans: {
      name: "Koreans",
      blurb: "Unarmoured but brave soldiers and monks, with scarce heavy infantry and cavalry. Poor Morale.",
      morale: "7",
      sfh: {},
      notes: ["+1 VP for each Samurai model killed.", "One Soldier or Monk may carry a banner for free (no other equipment)."],
      models: {
        peasant: PEASANT(false),
        soldier: P({ name: "Soldier", type: "Soldier", rank: 1, cp: 2, init: 2, fight: 2, shoot: 1, armour: "None", points: 11, weapons: ["Sword"], groups: [weapon(["Spear", "Arquebus", "Bow"], 3), banner(0, "free")] }),
        monk: P({ name: "Monk", type: "Monk", rank: 1, cp: 2, init: 2, fight: 2, shoot: 1, armour: "None", points: 13, weapons: ["Sword"], attrs: ["Fearless"], groups: [weapon(["Spear", "Arquebus", "Bow"], 3), banner(0, "free")] }),
        captain: P({ name: "Captain", type: "Soldier", rank: 2, cp: 2, init: 2, fight: 3, shoot: 1, armour: "None", points: 14, weapons: ["Sword"], attrs: ["Commander"], groups: [weapon(["Spear", "Bow"], 3), { id: "shield", label: "Shield", equipment: true, choices: [{ id: "Shield", label: "Shield (light armour)", cost: 1, add: ["Shield"], armour: "Light" }] }] }),
        heavyInf: P({ name: "Heavy Infantry", type: "Soldier", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Heavy", points: 23, weapons: ["Sword", "Shield"], slots: 1, groups: [shieldSwap(4)] }),
        heavyCav: P({ name: "Heavy Cavalry", type: "Soldier", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Medium", points: 31, weapons: ["Sword", "Horse"], mounted: true, slots: 1, groups: [weapon(["Flail", "Bow"], 3), { id: "sword2", label: "Second sword", equipment: true, choices: [{ id: "Sword", label: "Second sword (CP 4)", cost: 3, add: ["Sword"], cp: 1 }] }] }),
        commander: P({ name: "Commander", type: "Soldier", rank: 4, cp: 4, init: 3, fight: 4, shoot: 2, armour: "Heavy", points: 28, weapons: ["Sword", "Shield"], attrs: ["Commander"], slots: 2, groups: [shieldSwap(5), mount(10)] }),
      },
      bannerLimit: 1,
    },

    ming: {
      name: "Ming Chinese",
      blurb: "Well-armed, well-led continental troops with firearms and steppe horse archers.",
      morale: "9",
      sfh: {},
      notes: ["One Soldier may carry a banner for free (no other equipment)."],
      models: {
        soldier: P({ name: "Soldier", type: "Soldier", rank: 1, cp: 2, init: 2, fight: 2, shoot: 1, armour: "Medium", points: 15, weapons: ["Sword"], groups: [weapon(["Spear", "Arquebus", "Bow"], 3), banner(0, "free")] }),
        lightCav: P({ name: "Light Cavalry", type: "Soldier", rank: 1, cp: 2, init: 2, fight: 2, shoot: 2, armour: "None", points: 28, weapons: ["Sword", "Bow", "Horse"], mounted: true, attrs: ["Bajutsu"] }),
        captain: P({ name: "Captain", type: "Soldier", rank: 2, cp: 2, init: 2, fight: 3, shoot: 1, armour: "Medium", points: 18, weapons: ["Sword", "Shield"], attrs: ["Commander"], groups: [weapon(["Spear", "Bow"], 3)] }),
        heavyInf: P({ name: "Heavy Infantry", type: "Soldier", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Heavy", points: 23, weapons: ["Sword", "Shield"], slots: 1, groups: [shieldSwap(4)] }),
        heavyCav: P({ name: "Heavy Cavalry", type: "Soldier", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Medium", points: 34, weapons: ["Sword", "Spear", "Horse"], mounted: true, slots: 1 }),
        commander: P({ name: "Commander", type: "Soldier", rank: 4, cp: 4, init: 3, fight: 4, shoot: 2, armour: "Heavy", points: 28, weapons: ["Sword", "Shield"], attrs: ["Commander"], slots: 2, groups: [shieldSwap(0), mount(10)] }),
      },
      bannerLimit: 1,
    },

    peasants: {
      name: "Peasants",
      blurb: "Farmers who fight back, Seven Samurai style, hiring ronin to help.",
      morale: "8 if they outnumber the enemy 3:1, 7 if over 2:1, otherwise 6",
      sfh: { ronin: true, seniorRonin: true, monkOrShugyosha: 1 },
      notes: ["+½ VP per surviving looter of a Rank 1–2 enemy; +1 VP for a Rank 3+ enemy."],
      models: { peasant: PEASANT() },
    },
  };

  // ---------- Swords-for-Hire ----------
  const SWORDS = {
    ronin: P({ name: "Ronin", type: "Samurai", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "None", points: 17, weapons: ["Katana", "Wakizashi"], slots: 2, groups: [weapon(SAMURAI_WEAPONS, 3), armour([["Light", 2], ["Medium", 4], ["Heavy", 6]])], notes: "Unreliable: may flee when the Buntai wavers; leaves when it routs" }),
    seniorRonin: P({ name: "Senior Ronin", type: "Samurai", rank: 4, cp: 4, init: 4, fight: 4, shoot: 2, armour: "None", points: 22, weapons: ["Katana", "Wakizashi"], attrs: ["Commander"], slots: 3, groups: [weapon(SAMURAI_WEAPONS, 3), armour([["Light", 2], ["Medium", 4], ["Heavy", 6]])], notes: "Unreliable, like other Ronin" }),
    warriorMonk: P({ name: "Warrior Monk", type: "Sohei", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Medium", points: 26, weapons: ["Katana"], attrs: ["Fearless"], slots: 2, groups: [weapon(["Naginata", "Tetsubo", "Yumi"], 0, { required: true }), armour([["None", -4]])] }),
    shugyosha: P({ name: "Shugyosha", type: "Shugyosha", rank: 5, cp: 5, init: 4, fight: 5, shoot: 3, armour: "None", points: 28, weapons: ["Katana"], attrs: ["Commander"], slots: 4, groups: [weapon(["Jo", "Bo", "Kasurigama", "Naginata", "Nodachi", "Tetsubo"], { Jo: 0, Bo: 0, Kasurigama: 0, Naginata: 3, Nodachi: 3, Tetsubo: 3 }, { label: "Exchange katana", remove: ["Katana"] })] }),
    ninja: P({ name: "Ninja", type: "Ninja", rank: 3, cp: 3, init: 3, fight: 3, shoot: 2, armour: "Light", points: 26, weapons: ["Katana", "Shuriken"], attrs: ["Acrobatic"], freeBujutsu: 1, groups: [weapon(["Kasurigama"], 0, { label: "Exchange katana", remove: ["Katana"] })], ninja: true, notes: "Deploys anywhere more than 6\" from enemies" }),
  };

  const KORYU_WEAPONS = { Katana: 0, Wakizashi: 0, Nodachi: 3, Naginata: 3, Yari: 3, Jo: 0, Bo: 0, Tetsubo: 3, Kasurigama: 0, Weaponless: 0 };
  const BUJUTSU_FOR_WEAPON = { Katana: "Kenjutsu", Wakizashi: "Kenjutsu", Nodachi: "Kenjutsu", Naginata: "Naginatajutsu", Yari: "Sojutsu", Jo: "Jojutsu", Bo: "Bojutsu", Tetsubo: "Tetsubojutsu", Kasurigama: "Kasurigamajutsu", Weaponless: "Jujutsu" };

  const DATA = { ATTRIBUTES, WEAPONS, FACTIONS, SWORDS, KORYU_WEAPONS, BUJUTSU_FOR_WEAPON, ATTR_COST: 3, KIAI_COST: 5, KIAI_MAX: 3, MIN_MODELS: 4, MAX_MODELS: 20 };
  root.RONIN_DATA = DATA;
  if (typeof module !== "undefined") module.exports = DATA;
})(typeof window !== "undefined" ? window : globalThis);
