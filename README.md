# Ronin Buntai Builder

An unofficial list (Buntai) builder for **Ronin: Skirmish Wargames in the Age of the Samurai** by Craig Woodfield (Osprey Wargames 4, 2013).

**Use it:** https://snottledev.github.io/Ronin-List-builder/

## What it does

- All eight core factions: Bushi, Ikko-Ikki, Sohei, Koryu, Bandits, Koreans, Ming Chinese and Peasants
- Swords-for-Hire: Ronin, Senior Ronin, Warrior Monk, Shugyosha and Ninja (disguised or undisguised)
- Points for weapons, armour, mounts, banners, Attributes (+3 each) and Bushi Fearsome Kiai
- Live composition checks: rank ratios, Rank 4/5 limits, teppo/arquebus and missile caps (rounded down), the 25% Swords-for-Hire cap, the 4–20 model range, Koryu primary weapon, Peasant 30% points, Advanced Bujutsu prerequisites
- Saves as many Buntai as you like in your browser (localStorage, nothing leaves your device)
- A printable roster modelled on the book's Buntai Roster sheet, with a quick reference for the weapons and Attributes you've used

You still need the book: rule descriptions here are short paraphrases.

## How I read the rules

Where the book is ambiguous, the builder does this:

- **Swords-for-Hire** don't count toward rank ratios or weapon caps, because the book says they are "not counted when determining Buntai composition". They do count toward the 4–20 models and the 25% hire cap.
- **Peasants** may hire "any number of Ronin", but the general 25% Swords-for-Hire cap still applies.
- **Koryu** models each carry one weapon from the school's primary or secondary weapons, at that weapon's cost.
- A **disguised Ninja** costs 26 points and takes on the equipment and armour of the faction's Rank 0–1 model you pick.
- The **Leader** is the highest-ranked model, Swords-for-Hire included. You pick when ranks tie.
- The book's 200-point sample prices a Hatamoto with a naginata and two Attributes at 35 points. The book's own costs give 38 (29 + 3 + 3 + 3), so the builder uses 38.

## Running locally

It's plain HTML, CSS and JavaScript with no build step. Open `index.html`, or serve the folder:

```
python3 -m http.server
```

`rules.js` has no DOM code, so you can test it in Node.

## Legal

*Ronin* is © Craig Woodfield and Osprey Publishing. This is a fan-made tool and isn't affiliated with or endorsed by them.
