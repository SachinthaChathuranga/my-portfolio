/**
 * Teams, grounds and match formats for SMSC Cricket.
 * Squads are fictional players generated from culturally plausible name pools.
 */

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEAM_DEFS = [
  {
    id: "sl", name: "Sri Lanka", short: "SL", strength: 75, primary: "#0A2E7A", secondary: "#F7C600", trim: "#1E5BD8",
    first: ["Kasun", "Dilan", "Tharindu", "Nuwan", "Sahan", "Chamath", "Isuru", "Ravindu", "Pasindu", "Janith", "Kavindu", "Sachith", "Hasitha", "Lakshan", "Oshada", "Yasiru"],
    last: ["Perera", "Fernando", "Silva", "Jayasinghe", "Wickramage", "Gunawardena", "Bandara", "Herath", "Dissanayake", "Ranasinghe", "Weerakoon", "Abeysekara", "Liyanage", "Samarasekara"],
  },
  {
    id: "in", name: "India", short: "IND", strength: 81, primary: "#0B4EA2", secondary: "#FF8A1F", trim: "#53A7FF",
    first: ["Arjun", "Rohan", "Vikram", "Aditya", "Karan", "Siddharth", "Rahul", "Nikhil", "Varun", "Ishaan", "Pranav", "Dev", "Harsh", "Kunal", "Yash", "Aarav"],
    last: ["Sharma", "Iyer", "Patel", "Reddy", "Nair", "Kulkarni", "Chauhan", "Menon", "Rathore", "Desai", "Joshi", "Bhatt", "Pillai", "Saxena"],
  },
  {
    id: "au", name: "Australia", short: "AUS", strength: 81, primary: "#F2C200", secondary: "#0B6B3A", trim: "#FFE15A",
    first: ["Jack", "Liam", "Mitchell", "Cooper", "Riley", "Lachlan", "Hamish", "Brodie", "Zac", "Tom", "Callum", "Josh", "Ned", "Harry", "Flynn", "Sam"],
    last: ["Walsh", "Brennan", "Harper", "McAllister", "Doyle", "Fraser", "Gibbs", "Holloway", "Kerr", "Lyons", "Quinn", "Thornton", "Whitfield", "Barrett"],
  },
  {
    id: "en", name: "England", short: "ENG", strength: 78, primary: "#0F2A5C", secondary: "#D7263D", trim: "#4F8CD6",
    first: ["Oliver", "George", "Harry", "Alfie", "Freddie", "Archie", "Ben", "Toby", "Rory", "Joe", "Will", "Charlie", "Ollie", "Dan", "Max", "Theo"],
    last: ["Ashworth", "Pemberton", "Hargreaves", "Fletcher", "Whitmore", "Danforth", "Kingsley", "Mercer", "Lambert", "Oakley", "Prescott", "Radcliffe", "Turnbull", "Wakefield"],
  },
  {
    id: "pk", name: "Pakistan", short: "PAK", strength: 77, primary: "#0F6B2E", secondary: "#E8F5E9", trim: "#2FB45A",
    first: ["Usman", "Hamza", "Bilal", "Faisal", "Zain", "Saad", "Imran", "Haris", "Danish", "Ahsan", "Kamran", "Waqas", "Talha", "Rizwan", "Junaid", "Arham"],
    last: ["Qureshi", "Malik", "Chaudhry", "Siddiqui", "Butt", "Abbasi", "Mirza", "Hashmi", "Rana", "Sheikh", "Javed", "Niazi", "Raza", "Ghani"],
  },
  {
    id: "sa", name: "South Africa", short: "SA", strength: 78, primary: "#0B5D3B", secondary: "#FFC72C", trim: "#21A365",
    first: ["Thabo", "Pieter", "Sipho", "Ruan", "Kagiso", "Jaco", "Lungi", "Wian", "Bongani", "Dewald", "Kyle", "Andile", "Morné", "Heinrich", "Tristan", "Ethan"],
    last: ["van Wyk", "Botha", "Nkosi", "du Plessis", "Mokoena", "Steyn", "Pretorius", "Dlamini", "Venter", "Khumalo", "Coetzee", "Mahlangu", "Erasmus", "Ndlovu"],
  },
  {
    id: "nz", name: "New Zealand", short: "NZ", strength: 77, primary: "#121212", secondary: "#E6E6E6", trim: "#5C5C5C",
    first: ["Finn", "Blake", "Kane", "Mason", "Tane", "Logan", "Hayden", "Jesse", "Nathan", "Reuben", "Corey", "Glenn", "Tim", "Ollie", "Ajaz", "Hemi"],
    last: ["Ngata", "McKenzie", "Rowe", "Tipene", "Sinclair", "Hollis", "Paewai", "Whitaker", "Crowley", "Faleolo", "Murdoch", "Kingi", "Ashby", "Tuilagi"],
  },
  {
    id: "wi", name: "West Indies", short: "WI", strength: 72, primary: "#6B0F2A", secondary: "#F2B705", trim: "#A3264B",
    first: ["Shai", "Kemar", "Jermaine", "Andre", "Darnell", "Rovman", "Keacy", "Obed", "Jaden", "Tevin", "Kirk", "Marlon", "Shamar", "Kyle", "Romario", "Alzarri"],
    last: ["Charles", "Joseph", "Gayle-Smith", "Hinds", "Bramble", "Roach", "Sealy", "Greaves", "Alleyne", "Mottley", "Holder-James", "Bishop", "Clarke", "Phillip"],
  },
  {
    id: "bd", name: "Bangladesh", short: "BAN", strength: 71, primary: "#006A4E", secondary: "#E2231A", trim: "#1E9C74",
    first: ["Tanvir", "Mahmud", "Rakib", "Sabbir", "Nazmul", "Towhid", "Arif", "Shoriful", "Mehedi", "Afif", "Rishad", "Parvez", "Tanzid", "Jaker", "Mominul", "Nasum"],
    last: ["Hossain", "Rahman", "Islam", "Ahmed", "Chowdhury", "Hasan", "Karim", "Uddin", "Mridha", "Sarkar", "Talukder", "Babu", "Alam", "Mia"],
  },
  {
    id: "af", name: "Afghanistan", short: "AFG", strength: 72, primary: "#1B3E8F", secondary: "#D32F2F", trim: "#3C6DD8",
    first: ["Rahmat", "Ibrahim", "Najib", "Azmat", "Fazal", "Noor", "Gulbadin", "Hashmat", "Karim", "Sediq", "Farid", "Zia", "Ikram", "Qais", "Naveed", "Wafa"],
    last: ["Zadran", "Shinwari", "Omarzai", "Safi", "Stanikzai", "Atal", "Ahmadzai", "Mangal", "Noori", "Kakar", "Malik", "Nabizada", "Wardak", "Popal"],
  },
];

// Batting order template: role, batting & bowling bias, bowling style
const SLOTS = [
  { role: "bat", bat: 10, bowl: -40, style: null },
  { role: "bat", bat: 9, bowl: -40, style: null },
  { role: "bat", bat: 12, bowl: -30, style: "spin" },
  { role: "bat", bat: 11, bowl: -35, style: null },
  { role: "bat", bat: 6, bowl: -12, style: "spin" },
  { role: "all", bat: 2, bowl: 0, style: "medium" },
  { role: "wk", bat: 3, bowl: -60, style: null },
  { role: "all", bat: -6, bowl: 6, style: "spin" },
  { role: "bowl", bat: -22, bowl: 12, style: "pace" },
  { role: "bowl", bat: -26, bowl: 10, style: "spin" },
  { role: "bowl", bat: -30, bowl: 13, style: "pace" },
];

function buildSquad(def) {
  const rnd = seeded(def.id.charCodeAt(0) * 977 + def.id.charCodeAt(1) * 131);
  const usedF = new Set();
  const usedL = new Set();
  const pick = (arr, used) => {
    for (let i = 0; i < 40; i++) {
      const v = arr[Math.floor(rnd() * arr.length)];
      if (!used.has(v)) {
        used.add(v);
        return v;
      }
    }
    return arr[Math.floor(rnd() * arr.length)];
  };
  return SLOTS.map((slot, i) => {
    const jitter = () => Math.round((rnd() - 0.5) * 10);
    const bat = Math.max(15, Math.min(96, def.strength + slot.bat + jitter()));
    const bowl = slot.style ? Math.max(10, Math.min(95, def.strength + slot.bowl + jitter())) : 10;
    return {
      id: `${def.id}-${i}`,
      name: `${pick(def.first, usedF)} ${pick(def.last, usedL)}`,
      role: slot.role,
      bat,
      bowl,
      style: slot.style, // "pace" | "medium" | "spin" | null
      spinType: slot.style === "spin" ? (rnd() > 0.5 ? "off" : "leg") : null,
      hand: rnd() < 0.27 ? "L" : "R",
      power: Math.round(Math.max(30, Math.min(98, bat + (rnd() - 0.4) * 22))),
      speed: 6.2 + rnd() * 1.4, // running m/s
      catching: 0.72 + rnd() * 0.22,
      number: 1 + Math.floor(rnd() * 98),
    };
  });
}

export const TEAMS = TEAM_DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  short: d.short,
  strength: d.strength,
  primary: d.primary,
  secondary: d.secondary,
  trim: d.trim,
  players: buildSquad(d),
}));

export const GROUNDS = [
  {
    id: "colombo",
    name: "Lion's Den Oval",
    city: "Colombo",
    time: "night",
    boundary: { x: 66, z: 72 },
    pitch: { pace: 0.85, bounce: 0.9, turn: 1.25, swing: 0.9, label: "Dry • Spin-friendly" },
    stands: "#22324d",
    seatColors: ["#0A2E7A", "#F7C600", "#1E5BD8", "#ffffff"],
    capacity: 1,
  },
  {
    id: "galle",
    name: "Fortside Coastal Ground",
    city: "Galle",
    time: "day",
    boundary: { x: 63, z: 68 },
    pitch: { pace: 0.8, bounce: 0.85, turn: 1.45, swing: 1.0, label: "Dusty • Big turn" },
    stands: "#8a7a62",
    seatColors: ["#0A2E7A", "#F7C600", "#ffffff"],
    capacity: 0.45,
    coastal: true,
  },
  {
    id: "sydney",
    name: "Harbour Bowl",
    city: "Sydney",
    time: "day",
    boundary: { x: 70, z: 76 },
    pitch: { pace: 1.05, bounce: 1.1, turn: 1.05, swing: 0.95, label: "True • Good carry" },
    stands: "#3b4252",
    seatColors: ["#F2C200", "#0B6B3A", "#ffffff", "#c9ccd2"],
    capacity: 1,
  },
  {
    id: "london",
    name: "Thames Green",
    city: "London",
    time: "dusk",
    boundary: { x: 64, z: 69 },
    pitch: { pace: 1.0, bounce: 0.95, turn: 0.85, swing: 1.45, label: "Overcast • Swing" },
    stands: "#e8e4da",
    seatColors: ["#0F2A5C", "#D7263D", "#ffffff"],
    capacity: 0.8,
  },
  {
    id: "jhb",
    name: "Highveld Arena",
    city: "Johannesburg",
    time: "day",
    boundary: { x: 67, z: 72 },
    pitch: { pace: 1.2, bounce: 1.3, turn: 0.8, swing: 1.05, label: "Hard • Pace & bounce" },
    stands: "#59443a",
    seatColors: ["#0B5D3B", "#FFC72C", "#ffffff"],
    capacity: 0.9,
  },
  {
    id: "dubai",
    name: "Desert Lights Stadium",
    city: "Dubai",
    time: "night",
    boundary: { x: 68, z: 73 },
    pitch: { pace: 0.92, bounce: 0.9, turn: 1.15, swing: 1.1, label: "Slow • Dew at night" },
    stands: "#2d2a33",
    seatColors: ["#e6e6e6", "#c03b3b", "#2f7fd6", "#f2c200"],
    capacity: 0.85,
  },
];

export const FORMATS = {
  t20: { id: "t20", label: "T20", overs: 20, innings: 1, reviews: 2, powerplay: 6, freeHit: true, ball: "white" },
  odi: { id: "odi", label: "ODI", overs: 50, innings: 1, reviews: 2, powerplay: 10, freeHit: true, ball: "white" },
  test: { id: "test", label: "Test", overs: null, innings: 2, reviews: 3, powerplay: 0, freeHit: false, ball: "red" },
  custom: { id: "custom", label: "Custom", overs: 5, innings: 1, reviews: 2, powerplay: 2, freeHit: true, ball: "white" },
};

export const DIFFICULTY = {
  easy: { label: "Rookie", timing: 1.45, aiSkill: 0.78, assist: true },
  normal: { label: "Pro", timing: 1.0, aiSkill: 1.0, assist: true },
  hard: { label: "Legend", timing: 0.72, aiSkill: 1.18, assist: false },
};

export function maxOversPerBowler(totalOvers) {
  if (!totalOvers) return Infinity;
  return Math.max(1, Math.ceil(totalOvers / 5));
}

// Delivery catalogue. swing in m/s² (+ = toward off side of a right-hander, i.e. away swing),
// turn in m/s lateral after pitching, len = default target length (m from batsman's stumps)
export const DELIVERIES = {
  pace: [
    { id: "stock", label: "Seam Up", speed: 1, swing: 0, seam: 0.5, len: 7, key: "1" },
    { id: "outswing", label: "Outswinger", speed: 0.97, swing: 1.6, seam: 0.2, len: 7.5, key: "2" },
    { id: "inswing", label: "Inswinger", speed: 0.97, swing: -1.6, seam: 0.2, len: 7.5, key: "3" },
    { id: "yorker", label: "Yorker", speed: 1.02, swing: 0, seam: 0, len: 1.2, key: "4" },
    { id: "bouncer", label: "Bouncer", speed: 1.03, swing: 0, seam: 0.2, len: 13, key: "5" },
    { id: "slower", label: "Slower Ball", speed: 0.78, swing: 0, seam: 0.3, len: 6.5, key: "6" },
  ],
  medium: [
    { id: "stock", label: "Seam Up", speed: 1, swing: 0.3, seam: 0.6, len: 6.5, key: "1" },
    { id: "outswing", label: "Outswinger", speed: 0.97, swing: 1.9, seam: 0.2, len: 7, key: "2" },
    { id: "inswing", label: "Inswinger", speed: 0.97, swing: -1.9, seam: 0.2, len: 7, key: "3" },
    { id: "cutter", label: "Off-Cutter", speed: 0.88, swing: 0, seam: -0.9, len: 7, key: "4" },
    { id: "yorker", label: "Yorker", speed: 1.0, swing: 0, seam: 0, len: 1.2, key: "5" },
    { id: "slower", label: "Knuckle Ball", speed: 0.76, swing: 0, seam: 0.2, len: 6, key: "6" },
  ],
  spin: [
    { id: "stock", label: "Stock Turn", speed: 1, swing: 0, turn: 1, len: 5.5, key: "1" },
    { id: "flight", label: "Flighted", speed: 0.88, swing: 0, turn: 1.25, len: 4.5, key: "2" },
    { id: "wrong", label: "Wrong'un", speed: 0.98, swing: 0, turn: -0.9, len: 5.5, key: "3" },
    { id: "arm", label: "Arm Ball", speed: 1.12, swing: 0.4, turn: 0.05, len: 5.8, key: "4" },
    { id: "quick", label: "Quicker One", speed: 1.2, swing: 0, turn: 0.4, len: 4, key: "5" },
    { id: "top", label: "Top-Spinner", speed: 0.95, swing: 0, turn: 0.15, len: 5, bounceBoost: 1.25, key: "6" },
  ],
};

export const FIELD_PRESETS = {
  attacking: {
    label: "Attacking",
    spots: [[2.6, 17.5], [4.2, 16.8], [5.8, 15.8], [-3.2, 16.5], [14, 3], [-14, 2.5], [8, -12], [-8, -12], [-20, 12]],
  },
  balanced: {
    label: "Balanced",
    spots: [[3.2, 16.8], [22, 9], [24, -6], [12, -20], [-12, -20], [-24, -4], [-22, 10], [-48, 34], [50, 32]],
  },
  defensive: {
    label: "Defensive",
    spots: [[24, 2], [-24, 2], [44, -40], [-44, -40], [58, 5], [-58, 6], [20, -60], [-20, -60], [-40, 48]],
  },
  spin: {
    label: "Spin Trap",
    spots: [[2.4, 15.8], [-2.2, 15.6], [6, 9.5], [-6, 9.5], [16, -8], [-16, -8], [20, 8], [-50, -20], [48, -26]],
  },
  death: {
    label: "Death Overs",
    spots: [[56, -24], [-56, -24], [20, -62], [-20, -62], [62, 14], [-60, 16], [10, -26], [-10, -26], [-38, 52]],
  },
};
