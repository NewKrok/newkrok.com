// Who speaks with which voice, and how (read by voice.mjs).
//
// The voices are ElevenLabs library voices picked as a starting point;
// swap an id for one made with Voice Design when the cast settles. The
// model is eleven_v3, which reads [tags] in ACTED as acting directions
// (never spoken, never shown).
//
// Kessler: veteran ranger sergeant, forties. Dry, low, unhurried; under
//   fire short and clipped, never shrill. Rare warmth, always understated.
// Oduya: the commander on the Long Watch. Deep, tired, measured; carries
//   the weight of too few rangers for too much space.
// Voss: xenobiologist. Quick, precise, curious; fascinated by the Hive even
//   when it is trying to eat the people she is talking to.
// Marsh: Deepcore's liaison. Smooth, polite, a little too calm. Never
//   raises his voice.
// Brandt: survivor, mining foreman. Hoarse, shaken, exhausted.
export const VOICES = {
  kessler: { name: "Alice", id: "Xb7hH8MSUJpSbSDYk0k2" },
  oduya: { name: "Brian", id: "nPczCjzI2devNBz1zQrb" },
  voss: { name: "Lily", id: "pFZP5JcG7iQjIQuC4Bru" },
  marsh: { name: "Daniel", id: "onwK4e9ZLuTAKqWW03F9" },
  brandt: { name: "Bill", id: "pqHfZKP75CvOlQylNhV4" },
};

// Lines with acting directions (the words must match the line on screen;
// case and punctuation may differ). A line not listed is read plainly.
export const ACTED = {
  oduya_intro1: "[tired, measured] Long Watch to ground team. Dustnest colony went silent thirty-one hours ago. [pause] Forty-two people on the roster.",
  oduya_intro2: "[quietly] No distress call. No reactor alarm. Just nothing. [firmly] Find out why.",
  kessler_intro2: "[low, dry] Stay close, Seven. And keep it quiet until we know what we're walking into.",
  kessler_rover: "[whispers] Hold up. Something's moving by that rover. Get low.",
  kessler_contact: "[sharp] Contact! Weapons free!",
  voss_first: "[fascinated] Long Watch science, this is Voss. Your helmet feed... those aren't in any registry. [eagerly] Keep the cameras on them, please.",
  kessler_voss: "[deadpan] We'll try to get their good side, Doctor.",
  kessler_colony: "[quietly] No bodies. No blood. Where did forty-two people go?",
  marsh_intro: "[smooth, polite] Rangers. Julian Marsh, Deepcore Consolidated. We're grateful. [pleasantly] Please remember the colony's equipment is company property. Try not to break anything you don't have to.",
  kessler_marsh: "[flat] Noted.",
  voss_sentry: "[urgent whisper] Careful. The tall one with the frills? That one isn't listening. It's watching. If it sees you, it calls the others.",
  brandt_1: "[shaken, relieved] Rangers? Oh, thank God. I'm Teo Brandt, shift foreman. [exhausted] There are three of us left.",
  brandt_3: "[bitter] The company man had us seal that level a year ago. Said it was a gas pocket. [quietly] It wasn't gas.",
  kessler_warden_dead: "[breathless] It's down. [exhales] It's actually down.",
  marsh_outro: "[smooth] Deepcore thanks you, rangers. We'll handle the site from here. No need for a full report. [pleasantly] Our people will take care of it.",
  kessler_outro: "[dry, suspicious] Funny. He didn't sound surprised.",
  oduya_outro2: "[tired, warm] Get some sleep. We burn for the ice at oh-six-hundred.",
};
