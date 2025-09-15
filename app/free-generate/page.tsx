"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { FlippableCardPreview } from "@/components/flippable-card-preview";
import { CustomCardCheckoutModal } from "@/components/custom-card-checkout-modal";
import { useNavigationVisibility } from "@/hooks/use-navigation-visibility";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  RotateCcw,
  ExternalLink,
  Zap,
  Star,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowDown,
  Wand2,
  ImageIcon,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSupabaseBrowserClient,
  signInWithGoogle,
} from "@/lib/supabase-browser";
import { uploadToSupabase } from "@/lib/supabase-storage";
// import { CyberDefense } from "@/components/cyber-defense"; // Now integrated in FlippableCardPreview

import { cropImageToAspectRatio } from "@/lib/image-processing";
import { v4 as uuidv4 } from "uuid";
import { track } from "../../lib/analytics-client";


const DEVICE_STORAGE_KEY = "cardify.device_id";

/** Return a UUID that stays the same for this browser until local-storage is cleared */
function getDeviceId(): string {
  // try localStorage first
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (cached) return cached;

    const fresh = uuidv4();
    localStorage.setItem(DEVICE_STORAGE_KEY, fresh);
    return fresh;
  }

  // SSR – just fallback to a random v4 (won't be persisted)
  return uuidv4();
}

// Art style options
const ART_STYLES = [
  {
    id: "anime",
    name: "Anime Style",
    description: "Pokemon-inspired artwork",
    stylePrompt: "in vibrant anime style, cel-shaded, clean lines, pokemon tcg aesthetic, bright saturated colors, luminous effects, cheerful and energetic mood, dynamic pose"
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Style",
    description: "Futuristic digital aesthetic",
    stylePrompt: "in cyberpunk style, bright neon colors, vivid pink and cyan lights, luminous digital art, glowing holographic effects, colorful LED accents, vibrant futuristic technology, high contrast with bright highlights"
  },
  {
    id: "fantasy",
    name: "Fantasy Style",
    description: "Magic the Gathering inspired",
    stylePrompt: "in epic fantasy style, painterly, vibrant colors, magical glow effects, bright dramatic lighting, colorful spell effects, radiant energy, MTG card art style with vivid palette"
  }
];

// Random character archetypes for when no reference image is provided
const CHARACTER_ARCHETYPES = [
  // Warriors & Knights
  "a battle-hardened knight with glowing runic armor",
  "a fierce samurai warrior with ethereal cherry blossoms swirling around",
  "a cybernetic gladiator with energy weapons",
  "a valkyrie with radiant wings and divine spear",
  "a ronin with spirit blade and honor tattoos",
  "a crusader with holy fire armor",
  
  // Mages & Wizards
  "a powerful wizard channeling cosmic energy",
  "an elemental sorceress controlling fire and ice",
  "a technomancer hacking reality with digital magic",
  "a necromancer summoning spectral forces",
  "a chaos mage with reality-warping aura",
  "a blood mage with crimson power",
  
  // Creatures & Beasts
  "a majestic dragon with crystalline scales",
  "a mythical phoenix rising from cosmic flames",
  "a biomechanical beast with glowing circuits",
  "a celestial wolf with starry fur",
  "a void kraken with dimensional tentacles",
  "a storm eagle with lightning wings",
  
  // Rogues & Assassins
  "a shadow assassin emerging from darkness",
  "a cyberpunk hacker with holographic displays",
  "a mystic thief with time-bending abilities",
  "a void walker phasing between dimensions",
  "a phantom blade with ghost weapons",
  "a mirror assassin with reflection clones",
  
  // Cyberpunk Specialists (NEW)
  "a biomech symbiote host with living techno-organic armor and adaptive nanite swarms",
  "a cyborg street medic with surgical arm attachments and emergency drone swarm",
  "a gene-spliced courier with raptor legs and optical camouflage skin",
  "a resistance broadcaster with pirate signal equipment and holographic disguises",
  "an underground fight club champion with kinetic absorbing implants",
  "a black market dealer with concealed weapon compartments and crypto displays",
  "a megacorp executive with luxury chrome plating and personal security field",
  "an AI researcher with neural interface crown and quantum processors",
  "an orbital station pilot with zero-g mods and vacuum-sealed armor",
  "a neon graffiti artist with paint-dispensing fingers and AR tag projectors",
  "a cyber-shaman with technomystic implants and digital spirit guides",
  "an underground racer with reflex boosters and vehicle interface ports",
  "a memory thief with neural extraction cables and stolen identity overlays",
  "a drone controller with swarm command interface and surveillance access",
  "a virtual architect with reality-bending gloves and holographic tools",
  "a data smuggler with encrypted storage implants and blackout tech",
  "a corpo assassin with stealth field generator and smart targeting system",
  "a street samurai with monomolecular blade arms and enhanced reflexes",
  "a netrunner with ice breaker implants and daemon summoning ability",
  "a techno-priest with cybernetic third eye and machine communion",
  
  // Fantasy Heroes
  "an ancient tree spirit with bioluminescent features",
  "a cosmic entity made of pure starlight",
  "a steampunk inventor with mechanical companions",
  "an angelic warrior with burning sword",
  "a demon lord with molten armor",
  "a nature guardian with living vines",
  "a time traveler with chronos artifacts",
  "a psychic warrior with mind shields",
  "a dream walker with nightmare powers",
  "a soul reaper with ethereal scythe",
  
  // Mythological
  "a thunder god wielding lightning",
  "a sea deity controlling ocean waves",
  "a forest nymph with magical butterflies",
  "a titan breaking free from chains",
  "a medusa with serpent hair and stone gaze",
  "a minotaur warrior with labyrinth powers",
  
  // Sci-fi
  "a space marine in powered exosuit",
  "an AI construct materializing in physical form",
  "a galactic explorer with alien technology",
  "a mutant with crystalline growths",
  "a void pilot with quantum navigation implants",
  "a xenobiologist with symbiotic alien companion",
  
  // Dark Fantasy
  "a vampire lord with blood magic aura",
  "a lich with soul phylactery floating nearby",
  "a shadow demon with void portals",
  "a plague doctor with toxic miasma",
  "a bone collector with skeleton army",
  "a nightmare fuel with fear incarnate form",
];

// Professional object/logo trading card styles - universal designs that work with any logo type
const OBJECT_TRADING_CARD_STYLES = [
  // Gradient Styles
  "professional trading card design with deep blue to black gradient background, logo with soft white glow and drop shadow, minimalist geometric patterns in corners, premium matte finish effect",
  "modern card style with clean silver to white gradient, logo elevated with subtle 3D effect, thin accent lines, soft particle effects in background, metallic sheen",
  "sleek trading card with dark charcoal background, logo with glass effect and reflection, subtle grid pattern overlay, professional holographic corners",
  "gradient mesh trading card with purple to blue fade, logo with chrome finish, soft ambient lighting, clean composition with balanced spacing",
  "dual-tone gradient card from teal to navy, logo with platinum treatment, subtle light rays emanating from center, pristine finish",
  
  // Minimal Clean
  "minimalist trading card with pure white background and subtle shadows, logo perfectly centered with gentle elevation, thin geometric border, ample breathing room",
  "clean design card with light gray gradient, logo with subtle spotlight effect, minimal line work in corners, contemporary aesthetic",
  "ultra-minimal card with off-white background, logo with soft drop shadow, single accent color line, maximum negative space",
  "modern minimal design with pearl white base, logo floating with depth effect, subtle corner accents only, gallery presentation",
  
  // Dark Mode Styles
  "dark mode trading card with deep black background, logo with neon glow accents, subtle digital noise texture, modern aesthetic",
  "midnight card design with navy to black fade, logo with electric blue highlights, minimal tech patterns, sleek modern finish",
  "noir trading card with charcoal base, logo with silver chrome effect, dramatic single light source, high contrast presentation",
  "shadow realm card with void black background, logo with ethereal glow, subtle particle drift, mysterious ambiance",
  
  // Energy Effects
  "dynamic trading card with energy wave background, logo with power surge effect, radiating light beams, motion blur accents",
  "electric card design with lightning effect corners, logo with plasma glow, energetic particle system, high voltage aesthetic",
  "power surge trading card with kinetic background, logo surrounded by energy field, speed lines suggesting movement, impact presentation",
  "radiant card with aurora-like background, logo with prismatic light refraction, subtle lens flares, luminous quality",
  
  // Material Finishes
  "metallic trading card with brushed steel texture, logo with mirror chrome finish, industrial strength presentation, titanium series",
  "carbon fiber card design with subtle weave pattern, logo with matte black treatment, tactical aesthetic, performance edition",
  "glass morphism trading card with frosted glass effect, logo with crystal clarity, translucent layers, premium transparency",
  "liquid metal card with mercury-like background, logo with molten silver effect, fluid dynamics, adaptive surface",
  
  // Geometric Patterns
  "geometric trading card with triangular mesh background, logo centered in sacred geometry, mathematical precision, structured design",
  "hexagonal grid card with honeycomb pattern, logo with dimensional depth, interconnected design, modular aesthetic",
  "abstract polygon card with low-poly background, logo with faceted effect, angular composition, contemporary art style",
  "circular pattern card with concentric rings, logo as focal point, ripple effects emanating outward, harmonic design",
  
  // Light and Shadow
  "dramatic lighting card with single spotlight on logo, deep shadows for contrast, theatrical presentation, stage presence",
  "soft glow trading card with ambient illumination, logo with warm halo effect, gentle gradients, welcoming atmosphere",
  "neon nights card with vibrant glow effects, logo with LED strip lighting, urban aesthetic, street style",
  "sunset card with golden hour lighting, logo with long shadow, warm color temperature, nostalgic feeling",
  
  // Texture Styles
  "textured card with subtle paper grain, logo with embossed effect, tactile quality, artisan crafted feeling",
  "smooth silk finish card with lustrous sheen, logo with satin reflection, luxury texture, premium touch",
  "rough concrete texture with urban aesthetic, logo with stencil effect, street art influence, raw presentation",
  "velvet touch card with soft matte finish, logo with subtle depth, rich texture, sophisticated presence",
  
  // Color Burst
  "vibrant splash card with color explosion background, logo in clean white space, dynamic contrast, artistic expression",
  "rainbow prism card with spectrum gradient, logo with holographic effect, chromatic aberration, full color range",
  "monochrome card with single color theme, logo in complementary shade, tonal variations, focused palette",
  "duo-chrome design with two-color split, logo bridging both sides, bold contrast, balanced composition"
];

// Function to get a random object/logo trading card style
function getRandomObjectStyle(): string {
  const index = Math.floor(Math.random() * OBJECT_TRADING_CARD_STYLES.length);
  return OBJECT_TRADING_CARD_STYLES[index];
}

// Character transformation archetypes for reference images - organized by style and subject type
const REFERENCE_IMAGE_TRANSFORMATIONS = {
  human: {
    anime: [
      // Anime style transformations for humans - designed to show hair
      "beast tamer with open-face cap showing hair, mystical creature companion, dynamic action pose with energy effects",
      "magical warrior with flowing hair adorned with ribbons, transformation sequence effects, sparkles, and prismatic magic",
      "mecha pilot in sleek anime-style power armor with transparent visor showing face and hair, energy wings deployed",
      "shadow warrior with headband (not covering hair), duplicate illusions, throwing blades, and swirling cherry blossom petals",
      "spirit summoner with glowing hair accessories and ethereal guardian beast manifesting behind them",
      "elemental master with hair flowing in elemental energy, controlling stylized fire, water, earth, or air",
      "mystic swordsman with hair ornaments, glowing blade, special technique effects, and dramatic speed lines",
      "card master with stylish hair, summoning magical creatures from glowing cards with summoning circles",
      "energy warrior with hair glowing and flowing upward, powerful aura radiating, transformation effects",
      "spirit guardian with hair visible under flowing hood, ethereal weapons, and ghostly energy chains",
      "crystal knight with gemstone hair accessories, crystalline armor partially covering, rainbow light refraction",
      "storm caller with wind-swept hair, lightning coursing through strands, thunder effects surrounding them",
      "dimension hopper with multicolored hair streaks, portal effects, reality distortion around them",
      "martial artist with tied-back hair, chi energy visible, impact waves from powerful strikes",
      "tech samurai with cyber hair highlights, holographic katana, digital cherry blossoms",
      // Battle Shounen Heroes
      "demon slayer with hair visible under checkered haori, breath technique effects, nichirin blade glowing, and marking transformation",
      "pirate captain with signature straw hat over hair, devil fruit powers manifesting, haki aura, and crew jolly roger flag",
      "ninja with spiky hair and headband, sharingan eyes glowing, shadow clone jutsu, and rasengan energy sphere",
      "soul reaper with distinctive hair color, zanpakuto release form, hollow mask partially formed, and spiritual pressure waves",
      "alchemist with braided hair, transmutation circles glowing, automail limbs visible, and philosopher's stone energy",
      // Magical Girl/Boy
      "magical guardian with elaborate hair ribbons, transformation sequence sparkles, crystal wand, and ribbon attacks",
      "star warrior with hair in twin tails/buns, constellation armor forming, cosmic tiara, and moon prism power",
      "dream protector with pastel hair colors, nightmare-fighting staff, sleep bubble shields, and astral wings",
      // Mecha/Sci-fi Anime
      "EVA pilot in form-fitting plug suit showing hair, AT field deployed, berserker mode eyes, and synchronization aura",
      "gundam pilot with hair visible in cockpit view, newtype awareness flash, funnels deployed, and trans-am system glow",
      "space battleship captain with military-style hair, wave motion energy charging, tactical holograms, and fleet command",
      // Sports/Competition Anime
      "tournament fighter with gravity-defying spiky hair, power level over 9000, ki blasts charging, and super saiyan aura",
      "card game champion with distinctive dual-colored hair, duel disk activated, holographic monsters, and destiny draw",
      "racing driver with hair flowing from speed, drift aura trails, speed lines, and eurobeat energy visualization",
      // Supernatural Anime
      "vampire hunter with long flowing hair, holy weapons glowing, blessed chains manifesting, and anti-vampire wards",
      "spirit detective with slicked-back hair, spirit gun finger pointed, demon form emerging, and sacred beast companion",
      "exorcist with hair tied back, prayer beads glowing, demon-sealing talismans floating, and divine blue flames",
    ],
    
    cyberpunk: [
      // Cyberpunk style transformations for humans
      "netrunner hacker with neon-colored hair streaks, minimal facial implants, holographic displays, and digital glitch effects",
      "street samurai with stylized cyberpunk hair, LED tattoos on skin (not covering hair), and cyber katana",
      "corporate enforcer with slicked-back hair visible, tactical visor (not helmet), and plasma weapons",
      "tech-priest with partially shaved head showing hair patterns, mechanical arm augmentations, and floating drones",
      "cyber-psycho with wild colorful hair, facial modifications, neon accents, and energy blades",
      "data broker with high-tech hair accessories, AR monocle, holographic projections, and visible neural jack",
      "synth hunter with noir-style hair, trench coat, high-tech weapons and glowing eye implant",
      "chrome warrior with metallic hair highlights, partial body chrome (face and hair visible), and integrated weapons",
      "neural assassin with tactical ponytail or bun, face paint, smart weapons, and digital camouflage clothing",
      "biohacker with bioluminescent hair tips, genetic modifications on skin, and tech-organic fusion",
    ],
    
    fantasy: [
      // Fantasy/MTG style transformations for humans
      "planeswalker with glowing hair flowing with magical energy, channeling mana from multiple worlds",
      "archmage with long flowing hair and beard (if applicable), pointed hat pushed back, ancient staff, and swirling magic",
      "dragon lord with hair transformed into flowing scales at the tips, partial draconic features, wings, and fire breath",
      "elven ranger with braided hair adorned with leaves, pointed ears visible, enchanted bow, and nature magic",
      "death knight with hair visible through open-faced helmet, frost forming on hair tips, cursed armor, and necromantic powers",
      "celestial cleric with radiant hair that glows like a halo, divine light, healing magic, and translucent wings",
      "barbarian berserker with wild untamed hair, tribal face paint and tattoos, primal rage, and ancestral spirits",
      "vampire noble with elegant styled hair, aristocratic attire showing neck and face, blood magic, and bat familiars",
      "elemental shaman with hair that flows like the elements (fire, water, earth, air), tribal ornaments, and nature magic",
      "lich king with ethereal glowing hair, crown floating above head (not covering hair), undead minions, and dark magic",
      // High Fantasy Warriors
      "dragonborn warrior with hair resembling dragon mane, draconic ancestry showing, breath weapon charging, and scale armor",
      "paladin of the light with golden hair glowing, divine hammer raised, consecrated ground beneath, and holy nova",
      "ranger with hair woven with feathers, animal companion at side, nature's blessing aura, and legendary bow drawn",
      "battlemage with hair crackling with magic, spell-sword combination, runic tattoos glowing, and war magic circles",
      // Dark Fantasy
      "witch hunter with hair tied back under wide-brimmed hat, silver bullets ready, holy water grenades, and inquisitor's seal",
      "cursed knight with hair turned white from curse, living armor pulsing, soul-bound weapon, and undying rage",
      "blood hunter with hair stained crimson, crimson rites activated, hunter's mark visible, and lycanthrope tracking",
      "shadow priest with hair obscured by void energy, void tendrils emerging, mind control aura, and madness spiral",
      // Mythic Beings
      "fae court noble with flower-adorned hair, seasonal magic shifting, glamour illusions, and wild hunt summons",
      "titan slayer with hair like molten gold, god-killer weapons ready, divine blessings manifest, and legendary strength",
      "oracle with hair turning white during visions, future sight active, prophecy scrolls floating, and fate threads visible",
      "djinn with hair like smoke wisps, wish-granting power swirling, smoke form shifting, and elemental command",
      // Elemental Masters
      "storm herald with hair whipping in hurricane force, lightning crown forming, and thunder drums echoing",
      "forge master with hair glowing like embers, molten hammer raised, metal manipulation, and creation flames",
      "ice sovereign with frost-white hair, frozen throne manifesting, blizzard cloak, and permafrost aura",
      "earth warden with hair adorned with stones and moss, stone armor forming, seismic sense, and mountain's strength",
      // Mystical Scholars
      "arcane librarian with hair defying gravity from magic, floating tomes orbiting, knowledge extraction, and spell storing",
      "rune scribe with hair marked with glowing runes, living tattoos active, glyph weapons, and words of power",
      "time mage with hair showing temporal effects, temporal loops visible, age manipulation, and chrono shields",
      "portal master with hair flowing through dimensions, dimension doors opening, spatial folding, and planar keys",
    ]
  },
  
  creature: {
    anime: [
      // Anime style transformations for creatures
      "legendary beast with energy aura, evolution transformation effects, and elemental powers radiating outward",
      "spirit guardian creature with ethereal form, glowing markings, and mystical energy trails",
      "mecha-enhanced creature with cyber armor plating, energy weapons, and holographic wings",
      "elemental titan form with body made of pure energy, reality-warping presence, and cosmic power",
      "shadow beast with darkness manipulation, multiple forms shifting, and void energy",
      "crystal dragon evolution with prismatic scales, rainbow breath attack, and gem-like features",
      "divine familiar with angelic features, holy aura, protective barriers, and celestial markings",
      "demon lord transformation with infernal flames, corrupting aura, and nightmare presence",
      "nature colossus with living ecosystem on body, seasonal changes, and earth-shaking power",
      "cosmic entity form with star patterns, nebula effects, and gravity manipulation",
      // Legendary Pokemon-style
      "mega evolution form with energy overflow, type-change aura, signature move charging, and battle bond",
      "shiny variant with chromatic scales, rare coloration, sparkle effects, and legendary status",
      "gigantamax form towering with clouds, weather manipulation, max move effects, and stadium presence",
      // Summoned Beings
      "contracted spirit beast with summoning seal visible, loyalty bond, special technique, and sage mode",
      "tailed beast manifestation with chakra cloak, jinchuriki connection, devastating power, and ancient wisdom",
      "zanpakuto spirit form with blade manifestation, bankai release, unique ability, and soul resonance",
      // Digital Monsters
      "digivolved champion with armor upgrades, digital wings, data streams, and evolution particles",
      "virus-type creature with corruption effects, data absorption, glitch aesthetics, and system override",
      "ultimate level fusion with combined attributes, dual nature, synchronized attacks, and matrix evolution",
    ],
    
    cyberpunk: [
      // Cyberpunk style transformations for creatures
      "cyber-beast with LED strips along body, holographic camouflage, and integrated weapon systems",
      "data construct creature made of pure information, digital glitch effects, and code streams",
      "bio-mechanical hybrid with exposed circuitry, neon blood vessels, and tech-organic fusion",
      "AI entity manifested physically, geometric patterns, and reality-hacking abilities",
      "mutant specimen with genetic modifications, bioluminescent organs, and adaptive evolution",
      "drone swarm consciousness forming creature shape, modular body parts, and networked intelligence",
      "synthetic predator with stealth tech, thermal vision indicators, and plasma claws",
      "corporate experiment gone rogue, unstable mutations, experimental tech grafted on",
      "virtual pet evolved to physical form, pixel artifacts, and digital matter manipulation",
      "nanobot colony creature, shape-shifting metal form, and self-repairing body",
    ],
    
    fantasy: [
      // Fantasy/MTG style transformations for creatures
      "ancient dragon with elemental breath, treasure hoard aura, and reality-bending presence",
      "mythical phoenix with rebirth flames, healing feathers, and immortal essence",
      "dire beast alpha with pack leader aura, primal fury, and territorial dominance",
      "fey creature with nature magic, seasonal aspects, and trickster illusions",
      "void horror from beyond reality, tentacles through dimensions, and madness aura",
      "celestial mount with divine blessing, radiant wings, and protective wards",
      "infernal demon with corruption effects, soul chains, and hellfire manifestation",
      "elemental incarnation of pure magic, environmental control, and force of nature",
      "undead abomination with necromantic power, soul collection, and death aura",
      "legendary guardian with ancient runes, protective stance, and unbreakable will",
      // Mythological Beasts
      "hydra with regenerating heads, toxic breath, swamp dominion, and immortal blood",
      "griffin with eagle sight, lion's courage, sky sovereignty, and golden feathers",
      "basilisk with petrifying gaze, venomous fangs, serpent king crown, and ancient curse",
      "chimera with triple threat, hybrid vigor, chaotic nature, and evolutionary anomaly",
      // Elemental Titans
      "leviathan of the depths with tsunami generation, abyssal pressure, ocean's wrath, and primordial age",
      "behemoth of the earth with tectonic shifts, mountain form, unstoppable force, and geological patience",
      "ziz of the skies with storm wings, atmospheric control, divine messenger, and celestial navigation",
      "salamander of flames with lava blood, forge heart, eternal burning, and phoenix rivalry",
      // Fae Creatures
      "wild hunt hound with spectral form, relentless pursuit, soul tracking, and otherworldly howl",
      "pixie dragon with illusion breath, size shifting, mischief magic, and dream dust",
      "treant ancient with forest network, root system, seasonal crown, and nature's wisdom",
      "kelpie shapeshifter with water form, drowning lure, river speed, and aquatic mastery",
      // Celestial Beings
      "seraphim with six wings, divine fire, heavenly choir, and judgment blade",
      "valkyrie's pegasus with rainbow bridge access, soul transport, battle selection, and immortal flight",
      "solar with radiant body, life-giving warmth, star core, and cosmic authority",
      // Dark Creatures
      "nightmare with fear feeding, dream invasion, shadow gallop, and terror incarnate",
      "bone dragon with necromantic revival, death breath, phylactery core, and eternal unrest",
      "shadow colossus with void body, light absorption, dimensional weight, and existence erasure",
    ]
  },
  
  object: {
    anime: [
      // Anime style transformations for objects
      "legendary weapon spirit manifested, energy blade extensions, special attack sequences with dramatic effects",
      "cursed artifact awakened, dark energy tendrils, corruption spreading, and sealed power breaking free",
      "divine relic activated, holy light emanating, protective barriers, and miracle granting powers",
      "mecha transformation sequence, combining parts, weapon systems deploying, and pilot integration",
      "magical item evolution, power levels increasing, new forms unlocking, and ultimate mode",
      "ancient seal breaking, imprisoned power releasing, reality cracks forming, and destiny fulfilling",
      "power crystal resonating, energy beams shooting, dimensional rifts opening, and cosmic alignment",
      "summoning catalyst activating, creature manifestations, contract circles, and binding rituals",
      "transformation device engaged, morphing sequences, power-up effects, and hero emergence",
      "legendary card materializing its contents, holographic projections becoming real, game made reality",
      // Sacred Weapons
      "demon-slaying blade with purification aura, evil detection, holy inscription, and generational legacy",
      "zanpakuto in shikai release, unique ability manifesting, spirit pressure, and soul connection",
      "sacred gear activation, balance breaker mode, dragon power, and sacred treasure",
      // Magical Artifacts
      "philosopher's stone transmuting, equivalent exchange, alchemical circles, and forbidden knowledge",
      "dragon balls gathering, wish-granting power, eternal dragon summoning, and cosmic reset",
      "millennium item activated, shadow game initiated, ancient Egyptian power, and soul manipulation",
      // Transformation Items
      "magical girl compact opening, transformation sequence, costume materialization, and power upgrade",
      "rider belt activating, armor manifestation, finishing move ready, and justice power",
      "digi-device evolution trigger, partner synchronization, data materialization, and digital gate",
    ],
    
    cyberpunk: [
      // Cyberpunk style transformations for objects
      "weaponized AI core, holographic interfaces, hack attacks visualized, and system override",
      "black market cyberware, illegal modifications, power surges, and corporate secrets",
      "data blade materialized, information cutting through reality, code streams, and firewall breaker",
      "neural implant activated, mind-machine interface, digital consciousness, and reality augmentation",
      "prototype tech unleashed, experimental features, unstable power, and breakthrough innovation",
      "corporate weapon system, branded destruction, stock market manipulation, and hostile takeover",
      "hacker tool manifested, security breaches visualized, backdoor creation, and system corruption",
      "quantum processor engaged, probability manipulation, timeline splitting, and computational supremacy",
      "biometric key activated, DNA locks opening, identity verification, and access granted",
      "cryptocurrency made physical, blockchain visualization, value fluctuation, and digital wealth",
    ],
    
    fantasy: [
      // Fantasy/MTG style transformations for objects
      "legendary blade unsheathed, ancient power awakening, destiny calling, and evil's bane",
      "grimoire opening itself, spells casting automatically, knowledge manifesting, and reality rewriting",
      "artifact of power activated, ley lines connecting, mana flowing, and planar convergence",
      "cursed item's true form, seals breaking, dark bargains, and forbidden knowledge",
      "divine instrument playing itself, celestial music, reality harmonizing, and miracles manifesting",
      "philosopher's stone transmuting, elements changing, gold creation, and immortality granting",
      "world tree seed sprouting, life force spreading, nature reclaiming, and ecosystem birthing",
      "crown of dominion worn by worthy, armies summoning, kingdoms bowing, and destiny claiming",
      "portal key turning, dimensions opening, travelers arriving, and worlds connecting",
      "soul gem activated, spirits contained, power channeling, and consciousness storing",
      // Legendary Weapons
      "excalibur emerging from stone, rightful king chosen, unbreakable edge, and kingdom's salvation",
      "mjolnir lightning-charged, worthy wielder, thunder god's might, and realm protection",
      "staff of magnus with infinite mana, spell amplification, magical dominion, and arcane mastery",
      "spear of destiny with fate-piercing power, prophecy fulfillment, divine judgment, and truth revelation",
      // Magical Artifacts
      "horn of plenty overflowing, endless abundance, feast manifestation, and prosperity blessing",
      "crystal ball revealing futures, scrying visions, distant viewing, and prophetic clarity",
      "flying carpet with wind mastery, altitude control, speed of thought, and Arabian nights magic",
      "wishing well granting desires, price demanding, fate weaving, and careful wording required",
      // Cursed Objects
      "pandora's box opening, evils escaping, hope remaining, and consequences unleashing",
      "cursed mirror showing truth, soul reflection, vanity punishment, and reality distortion",
      "blood chalice filling endlessly, vampire transformation, immortal thirst, and unholy communion",
      "necronomicon pages turning, elder knowledge, sanity draining, and cosmic horror summoning",
      // Divine Relics
      "holy grail glowing, healing waters, eternal life, quest fulfillment, and divine grace",
      "ark of covenant radiating power, divine presence, covenant renewal, and sacred protection",
      "golden fleece shimmering, healing properties, divine favor, heroic quest completion",
      // Elemental Stones
      "fire ruby igniting, phoenix rebirth, eternal flame, pyroclastic power, and forge heart",
      "ice sapphire freezing, eternal winter, frost kingdom, absolute zero, and glacier birth",
      "earth emerald growing, nature's blessing, forest creation, gaia's gift, and life force",
      "storm topaz crackling, weather control, lightning mastery, tempest calling, and sky dominion",
    ]
  }
};

// Function to get a random character - uses true randomness for better variety
function getRandomCharacter(): string {
  // Use Math.random() for true randomness instead of pseudo-random seed
  const index = Math.floor(Math.random() * CHARACTER_ARCHETYPES.length);
  return CHARACTER_ARCHETYPES[index];
}

// Function to get a random transformation for reference images based on style and subject type
function getRandomTransformation(artStyle: string, subjectType: 'transform' | 'character' | 'creature' | 'object'): string {
  // Default to fantasy if no style selected or style not found
  const styleKey = artStyle || 'fantasy';
  // Map the new subject types to the existing transformation categories
  const mappedType = subjectType === 'transform' || subjectType === 'character' ? 'human' : subjectType;
  const transformations = REFERENCE_IMAGE_TRANSFORMATIONS[mappedType]?.[styleKey as keyof typeof REFERENCE_IMAGE_TRANSFORMATIONS[typeof mappedType]] 
    || REFERENCE_IMAGE_TRANSFORMATIONS[mappedType]?.fantasy 
    || REFERENCE_IMAGE_TRANSFORMATIONS.human.fantasy;
  
  // Use Math.random() for true randomness
  const index = Math.floor(Math.random() * transformations.length);
  return transformations[index];
}

// Frame styles from original
const FRAME_STYLES = [
  {
    id: "pokemon",
    name: "Poke Style",
    description: "Full-art layout with blue capsule and red header",
    basePrompt:
      "Use a Pokémon-style card layout with FULL-BLEED artwork that extends completely to all four edges of the image. NO white borders, NO margins, NO rounded corners - the card fills the entire image frame edge-to-edge. Include a dark red header bar at the top with the card name, a blue stage capsule in the top left corner, HP display in top right, and semi-transparent attack/ability boxes in the lower portion overlaid on the full-bleed artwork.",
    titleTextPrompt:
      "Place the card name in bold white serif font on a dark red rectangular header at the top left. The top right displays HP in bold white text next to a circular energy symbol.",
  },
  {
    id: "magic",
    name: "Magic Fantasy",
    description: "Fantasy frame with curved banner and flourishes",
    basePrompt:
      "Use a Magic: The Gathering-inspired card frame with FULL-BLEED artwork extending to all edges. NO borders, NO margins, NO rounded corners - sharp 90-degree corners only. The artwork must fill the entire image from edge to edge. CRITICAL: This is NOT a photograph of a card - the entire image IS the card face. Do not show the card as an object floating in space or on a background. The image boundaries ARE the card boundaries.",
    titleTextPrompt:
      "Place the card name at the top left in a bold serif font, enclosed in a curved, 50% transparent banner. Align mana cost symbols to the top right.",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Style",
    description: "Digital interface with circuit borders and HUD elements",
    basePrompt:
      "Use a full-art digital trading card frame with a high-tech, cyber interface design extending to all image edges. Create THICK, PROMINENT neon-glowing circuit borders forming a solid rectangular frame around the card edges. Add heavy corner connectors with holographic panels. Include bold HUD-style interface elements that create clear frame boundaries. The frame should have substantial visual weight with glowing edges that the character can dramatically break through. NO white space, NO margins, NO rounded corners.",
    titleTextPrompt:
      "Display the character name in bold, all-caps text with digital styling, integrated into the cyber interface.",
  },
  {
    id: "none",
    name: "No Frame",
    description: "Pure artwork with no frame elements",
    basePrompt:
      "Create FULL-BLEED artwork with no frame elements. The artwork must extend completely to all four edges of the image with NO borders, NO margins, NO rounded corners - fill the entire image frame edge-to-edge.",
    titleTextPrompt:
      "Overlay the title text directly on the artwork in a bold, readable font with a subtle shadow or glow effect to ensure visibility against the background.",
  },
];

interface PromptFields {
  artStyle: string;
  background: string;
  frameStyle: string;
  titleText: string;
}

interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: Date;
  purchased: boolean;
}

type ProfileRow = {
  credits: number | null;
  free_generations_used: number | null;
};

const FREE_LIMIT = 1;

export default function FreeGeneratePage() {
  /* ───────── auth & credits ───────────────── */
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState(0);
  const [freeGenerationsUsed, setFreeGenerationsUsed] = useState(0);

  /* ── NEW: persistent per-browser id ───────────────────────── */
  const [deviceId, setDeviceId] = useState<string>("");
  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  const migrateGuestQuota = async (
    sb: ReturnType<typeof getSupabaseBrowserClient>,
    userId: string,
    deviceId: string,
    row: ProfileRow
  ): Promise<ProfileRow> => {
    /* ── how many freebies this device already burned ── */
    const { data: quota } = await sb
      .from("guest_quotas")
      .select("used")
      .eq("device_id", deviceId)
      .maybeSingle<{ used: number }>();

    const guestUsed = Number(quota?.used ?? 0);
    if (guestUsed === 0) return row;

    // ── merge with the user's profile ──
    const alreadyUsed = row.free_generations_used ?? 0;
    const combinedUsage = Math.min(FREE_LIMIT, alreadyUsed + guestUsed);

    if (combinedUsage !== alreadyUsed) {
      const { data } = await sb
        .from("mkt_profiles")
        .update({ free_generations_used: combinedUsage })
        .eq("id", userId)
        .select("credits, free_generations_used")
        .single<ProfileRow>();

      // wipe the guest-quota row so it cannot be re-merged
      await sb.from("guest_quotas").delete().eq("device_id", deviceId);

      return data ?? row;
    }

    // still wipe even if nothing changed (prevents replay attacks)
    await sb.from("guest_quotas").delete().eq("device_id", deviceId);
    return row;
  };

  /* ──────────────────────────────────────────────────────────────
   auth bootstrap + realtime profile listener
─────────────────────────────────────────────────────────────────*/
useEffect(() => {
  const sb = getSupabaseBrowserClient()
  if (!deviceId) return                

  // bootstrap auth
  sb.auth.getUser().then(({ data }) => setUser(data.user ?? null))
  const { data: authSub } =
    sb.auth.onAuthStateChange((_e, sess) => setUser(sess?.user ?? null))

  return () => authSub.subscription.unsubscribe()
}, [deviceId])

/** NEW effect that actually loads / merges the profile ------ */
useEffect(() => {
  if (!deviceId || !user?.id) return       

  const sb   = getSupabaseBrowserClient()
  let chan: ReturnType<typeof sb.channel> | null = null

  ;(async () => {
    const { data } = await sb
      .from("mkt_profiles")
      .select("credits, free_generations_used")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>()

    const merged = await migrateGuestQuota(
      sb,
      user.id,
      deviceId,
      data ?? { credits: 0, free_generations_used: 0 },
    )

    setCredits(Number(merged.credits ?? 0))
    setFreeGenerationsUsed(Number(merged.free_generations_used ?? 0))

    /* realtime — optional but handy */
    chan = sb.channel(`profile-${user.id}`).on(
      "postgres_changes",
      {
        event:  "UPDATE",
        schema: "public",
        table:  "mkt_profiles",
        filter: `id=eq.${user.id}`,
      },
      ({ new: r }) => {
        setCredits(Number((r as ProfileRow).credits ?? 0))
        setFreeGenerationsUsed(Number((r as ProfileRow).free_generations_used ?? 0))
      }
    ).subscribe()
  })()

  return () => { if (chan) sb.removeChannel(chan) }
}, [deviceId, user?.id])        

  /* ─────────────────────────── guest free quota (1) ────────────────────────── */

  const [remainingGenerations, setRemainingGenerations] = useState(FREE_LIMIT);

  const freebiesLeftDB = Math.max(0, FREE_LIMIT - freeGenerationsUsed); // ⬅️ NEW
  const guestQuotaLeft = remainingGenerations;
  const paidCreditsLeft = credits;

  const usableCredits =
    paidCreditsLeft + (user ? freebiesLeftDB : guestQuotaLeft);
  const isOutOfCredits = usableCredits <= 0;

  useEffect(() => {
    if (typeof window === "undefined" || user) return;
    const saved = Number(
      localStorage.getItem("cardify.freeGens.v1") ?? FREE_LIMIT
    );
    setRemainingGenerations(Math.max(0, saved));
  }, [user]);

  const isOutOfFreeAndLoggedOut = !user && remainingGenerations <= 0;

  /* ─────────────────────────── builder state ──────────────────── */
  const [fields, setFields] = useState<PromptFields>({
    artStyle: "anime", // Default to Anime Style
    background: "",
    frameStyle: "pokemon", // Default to TCG/Poke Style
    titleText: "",
  });
  
  // Track generation count for random character selection
  const [generationCount, setGenerationCount] = useState(0);

  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [referenceImageName, setReferenceImageName] = useState<string | null>(
    null
  );
  const [subjectType, setSubjectType] = useState<'transform' | 'character' | 'creature' | 'object'>('transform');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  // const [showGameModal, setShowGameModal] = useState(false); // Removed - now using integrated game in card preview
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(
    null
  );
  const [generationElapsedTime, setGenerationElapsedTime] = useState(0);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [processedImageBlob, setProcessedImageBlob] = useState<Blob | null>(
    null
  );
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [sessionImages, setSessionImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isUploadingToDatabase, setIsUploadingToDatabase] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const freeLeft = user ? freebiesLeftDB : remainingGenerations;

  /* ─────────────────────────── helper functions ───────────────── */
  // Generate the prompt based on selected options
  const generatePrompt = () => {
    // Must have at least something to generate
    if (!fields.artStyle && !fields.background && !fields.frameStyle && !fields.titleText && !referenceImageFile) {
      return "";
    }

    let prompt = "Create a full-bleed trading card artwork that fills the ENTIRE image frame from edge to edge with no borders, margins, or empty space around it. The artwork must extend completely to all four edges of the image. Use sharp 90-degree corners with no rounding. The aspect ratio is 2.5:3.5 (portrait orientation).\n\n";

    // PRIORITY 1: Handle reference image if provided (takes priority when there's a subject type conflict)
    if (referenceImageFile) {
      // Only get character/creature transformations for non-object modes
      const epicTransformation = subjectType !== 'object' 
        ? getRandomTransformation(fields.artStyle, subjectType)
        : null;
      
      if (subjectType === 'transform') {
        // Transform a regular person into an epic character
        prompt += "REFERENCE IMAGE GUIDANCE: ";
        if (fields.titleText.trim()) {
          prompt += `Transform the person in the reference image into a character that embodies the spirit of "${fields.titleText}" while preserving their exact facial features and recognizable likeness. `;
        } else {
          prompt += "Transform the person in the reference image into an epic trading card character while preserving their exact facial features and recognizable likeness. ";
        }
        prompt += `Character transformation: Transform them into ${epicTransformation}. `;
        prompt += "CRITICAL: Maintain their exact facial structure, facial features, and especially their HAIR COLOR and HAIR STYLE (length, texture, curl pattern). ";
        prompt += "If the character design includes a helmet or headpiece, make it transparent, partial, or positioned to show their actual hair. ";
        prompt += "Preserve their eye color, skin tone, and any distinctive features (freckles, moles, facial hair, etc.). ";
        prompt += "The person should look like themselves as this epic character.\n\n";
      } else if (subjectType === 'character') {
        // Enhance an existing character while preserving their identity
        prompt += "REFERENCE IMAGE GUIDANCE: ";
        prompt += "Create an epic trading card artwork inspired by the character in the reference image. ";
        if (fields.titleText.trim()) {
          prompt += `Use "${fields.titleText}" as the card title. `;
        }
        prompt += "IMPORTANT: Create an original interpretation that captures the spirit and theme of the character. ";
        prompt += "Use the reference for inspiration regarding color schemes and general heroic themes. ";
        prompt += "Enhancement approach - Create a dynamic hero card: ";
        prompt += "- Design an original heroic character in a dynamic action pose ";
        prompt += "- Add energy effects, glowing auras, or power effects that match the heroic theme ";
        prompt += "- Create an epic background environment with special effects ";
        prompt += "- Use dramatic lighting, atmospheric effects, and motion blur ";
        prompt += "- Make them look powerful and epic for a trading card ";
        prompt += "The goal is an epic trading card with an original heroic character inspired by the reference's theme and energy.\n\n";
      } else if (subjectType === 'creature') {
        prompt += "REFERENCE IMAGE GUIDANCE: ";
        prompt += "Transform the creature in the reference image into an epic trading card version while maintaining its core creature type and recognizable form. ";
        if (fields.titleText.trim()) {
          prompt += `The creature's name "${fields.titleText}" should influence its personality, powers, and aesthetic style, but NOT change what type of creature it is. `;
          prompt += `For example, if it's a unicorn named "John", it remains a unicorn but might have qualities that evoke the name's character. `;
        }
        prompt += `Enhancement: ${epicTransformation}. `;
        prompt += "CRITICAL: Keep the creature's essential anatomy and species intact. If it's a unicorn, it stays a unicorn. If it's a dragon, it stays a dragon. ";
        prompt += "Add epic enhancements, powers, and effects while preserving the creature's fundamental nature. ";
        prompt += "DO NOT add human facial features to non-human creatures.\n\n";
      } else { // object/logo
        prompt += "REFERENCE IMAGE GUIDANCE: ";
        prompt += "Transform the object or logo in the reference image into an epic trading card element. ";
        // For logos, the title text should NOT affect the artwork - it's only for the card frame header
        if (fields.titleText.trim()) {
          prompt += `NOTE: The card title "${fields.titleText}" is ONLY for the frame header text. `;
          prompt += "DO NOT let this title influence or change the logo artwork itself. ";
        }
        // Use the selected art style to guide the enhancement if one is chosen
        if (fields.artStyle) {
          prompt += "Enhancement approach: Apply the selected art style while preserving logo integrity. ";
        } else {
          prompt += "Enhancement approach: Professional trading card presentation with subtle effects. ";
        }
        prompt += "CRITICAL LOGO INTEGRITY: Maintain ALL key elements of the logo while adding epic enhancements: ";
        prompt += "- Keep ALL symbols, icons, shapes, and design elements present in the original logo. ";
        prompt += "- FONT PRESERVATION: If the logo contains text or letters, preserve the EXACT font, typeface, and typography. ";
        prompt += "DO NOT change fonts, letterforms, or text styling - maintain the original font characteristics completely. ";
        prompt += "Text must remain readable and in their exact original arrangement with identical font style. ";
        prompt += "- Preserve the logo's structural composition and the relationships between its parts. ";
        prompt += "- DO NOT add any characters, people, creatures, or living beings to the scene. ";
        prompt += "- The logo/object should be the ONLY subject - no additional characters or creatures. ";
        prompt += "- You can enhance with effects (glow, metallic finish, energy auras, 3D depth, holographic shimmer) ";
        prompt += "but ensure every component including exact fonts is still clearly visible and recognizable. ";
        prompt += "- Add dramatic background effects and environmental integration to create epic card presence. ";
        prompt += "Think of it as making the logo look powerful while keeping ALL original components and fonts intact. ";
        prompt += "Position elements to avoid obstruction by card frame overlays. ";
        if (fields.titleText.trim()) {
          prompt += "IMPORTANT: The title text is ONLY for labeling the card, not for modifying the logo artwork. ";
        }
        prompt += "The result should be a powerful, enhanced version with dynamic energy and trading card presence.\n\n";
      }
    } else if (!fields.titleText.trim()) {
      // No reference image and no title - use a random character archetype
      const randomCharacter = getRandomCharacter();
      prompt += `Main subject: ${randomCharacter}\n\n`;
    } else if (fields.titleText.trim() && !referenceImageFile) {
      // We have a title but no reference image - let the title drive the generation
      prompt += `**CARD TITLE**: The card is titled "${fields.titleText}". `;
      prompt += `Create a character or creature that embodies the concept of "${fields.titleText}". `;
      prompt += `The design should visually represent and enhance the meaning and feeling of this title.\n\n`;
    }
    // Title with reference image is already handled above in the reference image section

    // Add art style if selected, or use professional object style for Object Mode without art style
    if (fields.artStyle) {
      const selectedStyle = ART_STYLES.find(style => style.id === fields.artStyle);
      if (selectedStyle) {
        prompt += `Art style: ${selectedStyle.stylePrompt}\n`;
      }
    } else if (referenceImageFile && subjectType === 'object') {
      // For Object Mode without an art style selected, use a random professional trading card style
      const objectStyle = getRandomObjectStyle();
      prompt += `Style: ${objectStyle}\n`;
      prompt += "IMPORTANT: Maintain complete logo integrity while adding these professional trading card enhancements.\n";
    }

    // Add background if specified
    if (fields.background) {
      prompt += `Background: ${fields.background}\n`;
    } else if (fields.titleText.trim()) {
      // If no background specified but we have a title, suggest an appropriate background
      prompt += `Background: Create an appropriate epic background that enhances "${fields.titleText}" - consider the character's domain, powers, or origin.\n`;
    }

    // Add frame technical instructions if a frame is selected
    if (fields.frameStyle) {
      const selectedFrame = FRAME_STYLES.find(
        (style) => style.id === fields.frameStyle
      );
      if (selectedFrame) {
        prompt += `\nFrame implementation: ${selectedFrame.basePrompt}\n`;
        
        // Add title text styling if provided
        if (fields.titleText.trim() !== "") {
          prompt += `Text layout: ${selectedFrame.titleTextPrompt}\n`;
          prompt += `Title text to display: "${fields.titleText}"\n`;
        }
        
        // Add frame-specific card text elements for authenticity
        const characterName = fields.titleText.trim() || "Hero";
        
        if (fields.frameStyle === "pokemon") {
          // Check if this is a logo/object
          const isLogo = referenceImageFile && subjectType === 'object';
          
          if (isLogo) {
            // For logos: NO overlay text at all to preserve logo text visibility
            prompt += "LOGO MODE - NO OVERLAY TEXT: Since this is a logo/object, DO NOT add any overlay text elements. ";
            prompt += "NO attack boxes, NO ability text, NO HP numbers, NO weakness/resistance bars. ";
            prompt += "Keep the Pokemon frame border and header bar ONLY. ";
            prompt += "The artwork and any text within it must be completely unobstructed. ";
            prompt += "Include only the minimal frame elements: the red header bar at top and blue stage capsule. ";
            prompt += "This ensures any text in the logo remains fully visible and unobstructed.\n";
          } else {
            // For non-logos: normal Pokemon card overlay elements
            prompt += "Card text elements: Include HP value (e.g., 'HP 120') in top right corner. ";
            prompt += `Add ONLY ONE attack name that relates to ${characterName}'s abilities with energy cost icons and damage value. Keep the attack name short (2-3 words max). `;
            prompt += "MANDATORY: At the very bottom of the card, create a clearly visible horizontal bar with three distinct sections showing: ";
            prompt += "Weakness (fire or appropriate type icon), Resistance (water or appropriate type icon with -30), and Retreat Cost (1-3 colorless energy symbols). ";
            prompt += "These bottom elements must be clearly visible with proper icons on a semi-transparent background bar. ";
            prompt += "Include evolution stage indicator (Basic, Stage 1, or Stage 2) in the blue capsule. ";
            prompt += "CRITICAL: Keep all text minimal - one short attack name, damage number, and the bottom bar elements only. ";
            prompt += "DO NOT add flavor text, extra attacks, ability descriptions, or any other text. ";
            prompt += "DO NOT add copyright text, set symbols, card numbers, or artist credits.\n";
          }
        } else if (fields.frameStyle === "magic") {
          const isLogo = referenceImageFile && subjectType === 'object';
          
          if (isLogo) {
            // For logos: NO overlay text
            prompt += "LOGO MODE - NO OVERLAY TEXT: Since this is a logo/object, DO NOT add any overlay text elements. ";
            prompt += "NO mana costs, NO card type lines, NO ability text, NO power/toughness boxes. ";
            prompt += "Keep only the Magic frame border and title area. ";
            prompt += "The artwork and any text within it must be completely unobstructed.\n";
          } else {
            // For non-logos: normal Magic card elements
            prompt += "Card text elements: Include 2-3 small mana cost symbols in top right. ";
            prompt += `Add SHORT card type line (e.g., 'Creature - Dragon'). `;
            prompt += "Include ONE ability name OR single line of italicized flavor text (max 10 words). ";
            prompt += "Add power/toughness box in bottom right (e.g., '5/4'). ";
            prompt += "CRITICAL: Minimal text only - type line, one ability/flavor text, P/T. ";
            prompt += "DO NOT add copyright text, set symbols, or artist credits.\n";
          }
        } else if (fields.frameStyle === "cyberpunk") {
          const isLogo = referenceImageFile && subjectType === 'object';
          
          if (isLogo) {
            // For logos: NO overlay text except minimal title if provided
            prompt += "LOGO MODE - MINIMAL OVERLAY: Since this is a logo/object, ";
            if (fields.titleText.trim()) {
              prompt += `display ONLY the title "${characterName}" in the cyber interface, positioned to not obscure logo text. `;
            } else {
              prompt += "DO NOT add any overlay text. ";
            }
            prompt += "NO stats, NO subtitles, NO other text elements. ";
            prompt += "Keep the cyber frame elements but ensure the logo and its text remain fully visible.\n";
          } else {
            // For non-logos: normal Cyberpunk elements
            prompt += `Card text elements: Display ${characterName} in bold, all-caps digital font integrated into the cyber interface. `;
            prompt += "OPTIONAL: Add a SHORT subtitle below the name in matching digital font (e.g., 'ELITE HUNTER' or 'NETRUNNER'). ";
            prompt += "CRITICAL: Keep text extremely minimal - just the name and optional short subtitle. ";
            prompt += "Integrate text seamlessly with the HUD-style graphical elements and circuit patterns. ";
            prompt += "DO NOT add stats, abilities, descriptions, or any other text elements. ";
            prompt += "DO NOT add copyright text, barcodes, QR codes, or manufacturer logos.\n";
          }
        }
      }
    }

    // 3D breakout effect only if there's a frame
    if (fields.frameStyle && fields.frameStyle !== "none") {
      prompt +=
        "\n**MANDATORY 3D BREAKOUT EFFECT**: The subject MUST dramatically break through and extend beyond the card frame borders. ";
      prompt +=
        "Parts of the subject (weapons, limbs, wings, tentacles, energy effects, or other prominent features) MUST protrude past and overlap the frame edges to create a striking three-dimensional pop-out effect. ";
      prompt +=
        "This is ESSENTIAL - the subject cannot be contained within the frame boundaries. ";
      prompt +=
        "CRITICAL: While implementing the frame, ensure the subject breaks through it as described above. ";
      prompt +=
        "IMPORTANT: The card background and frame must still extend to all four edges of the image - the breakout effect should NOT create empty space around the card.\n";
    }

    prompt +=
      "\n**CRITICAL FULL-BLEED REQUIREMENTS**: The final image must be a print-ready, full-bleed design. The artwork and all card elements MUST extend completely to all four edges of the image frame. NO white borders, NO margins, NO visible card edges, NO drop shadows around the card, NO perspective views of a physical card. The image should look like the actual printed surface of the card, not a photograph of a card. Use sharp 90-degree corners with NO rounding.\n";
    prompt +=
      "IMPORTANT: Use a bright, vibrant, and colorful palette throughout the image. Avoid dark or muted colors - make the artwork pop with vivid, saturated colors, bright lighting, and eye-catching effects. The overall mood should be energetic and visually striking with high contrast and luminous colors.\n";
    prompt +=
      "FINAL REQUIREMENT: Generate a 2.5:3.5 aspect ratio image (portrait) that fills the entire frame edge-to-edge, suitable for direct printing and cutting into a physical trading card.";

    return prompt;
  };

  const handleRemoveImage = () => {
    setReferenceImageFile(null);
    setReferenceImageName(null);
    setSubjectType('transform'); // Reset to default
    // Restore default settings when removing image
    setFields(prev => ({
      ...prev,
      artStyle: 'anime',
      frameStyle: 'pokemon'
    }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReset = () => {
    setFields({
      artStyle: "",
      background: "",
      frameStyle: "",
      titleText: "",
    });
    setReferenceImageFile(null);
    setReferenceImageName(null);
    setSubjectType('transform'); // Reset to default
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle reference image upload (minimal memory approach)
  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type - Accept PNG, JPEG, GIF, and WEBP for GPT-4 Vision
    const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!acceptedTypes.includes(file.type.toLowerCase())) {
      setGenerationError("Please upload a PNG, JPEG, GIF, or WEBP image file");
      return;
    }

    // Additional validation by file extension
    const acceptedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = acceptedExtensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      setGenerationError("Please upload a PNG, JPEG, GIF, or WEBP image file");
      return;
    }

    // Check file size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      setGenerationError("Image must be less than 4MB");
      return;
    }

    setGenerationError(null);
    // Store file temporarily and show mode selector
    setPendingImageFile(file);
    setShowModeSelector(true);
  };

  // Handle mode selection after image upload
  const handleModeSelection = (mode: 'transform' | 'character' | 'creature' | 'object') => {
    // If we have a pending file (initial upload), use it
    // Otherwise we're just changing the mode for an existing image
    if (pendingImageFile) {
      setReferenceImageFile(pendingImageFile);
      setReferenceImageName(pendingImageFile.name);
    }
    
    setSubjectType(mode);
    
    // Auto-configure settings based on mode
    if (mode === 'object') {
      setFields(prev => ({
        ...prev,
        artStyle: '', // Clear art style for object mode
        frameStyle: 'none' // Default to no frame for clean logo presentation
      }));
    } else {
      setFields(prev => ({
        ...prev,
        artStyle: 'anime', // Default to anime style
        frameStyle: 'pokemon' // Default to pokemon frame
      }));
    }
    
    // Close modal and clear pending file
    setShowModeSelector(false);
    setPendingImageFile(null);
  };

  // Handle canceling mode selection
  const handleCancelModeSelection = () => {
    setShowModeSelector(false);
    setPendingImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const handleViewCard = () => {
    // Simply reset the generation complete state
    // The game will automatically disappear from the card preview
    setGenerationComplete(false);
    setIsGenerating(false);
    
    // Scroll to the preview section after a short delay
    setTimeout(() => {
      const previewElement = document.querySelector('.flippable-card-preview');
      if (previewElement) {
        previewElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      } else {
        // Fallback: scroll to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  // Navigation functions for cycling through generated images
  const handlePreviousImage = () => {
    if (currentImageIndex > 0) {
      const newIndex = currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
      setGeneratedImage(sessionImages[newIndex]);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < sessionImages.length - 1) {
      const newIndex = currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      setGeneratedImage(sessionImages[newIndex]);
    }
  };

  const freeQuotaLeft = remainingGenerations;
  /* REPLACE the whole burnFreeQuota helper */
const burnFreeQuota = async () => {
  if (remainingGenerations <= 0 || !deviceId) return
  setRemainingGenerations(p => {
    const newVal = p - 1
    localStorage.setItem("cardify.freeGens.v1", String(newVal))
    return newVal
  })

    const sb = getSupabaseBrowserClient();
    const used = FREE_LIMIT - (remainingGenerations - 1);

    await sb
      .from("guest_quotas")
      .upsert({
        device_id: deviceId,
        used,
        last_used: new Date().toISOString(),
      });
  };

// ─────────────────────────────────────────────────────────────
// handleGenerate – with explicit `source_type` metadata
// ─────────────────────────────────────────────────────────────
const handleGenerate = async (): Promise<void> => {
  // Game now shows in card preview instead of modal
  // setShowGameModal(true);
  setGenerationComplete(false);
  
  // Scroll to card preview section on mobile (or small screens)
  setTimeout(() => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const cardPreviewSection = document.getElementById('card-preview-section');
      if (cardPreviewSection) {
        const offset = 80; // Account for navigation bar height
        const elementPosition = cardPreviewSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  }, 100);
  
  const supabase = getSupabaseBrowserClient();
  const t0 = performance.now();

  /* ─── quota pre-flight (UI only) ─────────────────────────── */
  const paidCreditsLeft = Number(credits);
  const dbFreebiesLeft  = Math.max(0, FREE_LIMIT - Number(freeGenerationsUsed));
  const guestQuotaLeft  = Number(remainingGenerations);

  await track("generate", {
    action: "preflight",
    authed: !!user,
    paidCreditsLeft,
    dbFreebiesLeft,
    guestQuotaLeft,
  });

  if (!user) {
    if (guestQuotaLeft <= 0) {
      await track("generate", { action: "blocked", reason: "guest_no_quota" });
      // setShowGameModal(false);
      signInWithGoogle("/free-generate");
      return;
    }
  } else if (paidCreditsLeft <= 0 && dbFreebiesLeft <= 0) {
    await track("generate", { action: "blocked", reason: "no_credits_and_no_freebies" });
    // setShowGameModal(false);
    window.location.href = "/credits";
    return;
  }

  /* ─── build prompt guard ─────────────────────────────────── */
  const prompt = generatePrompt();
  if (!prompt) {
    setGenerationError("Please select at least one option to generate a card");
    await track("generate", { action: "blocked", reason: "no_options_selected" });
    // setShowGameModal(false);
    return;
  }

  /* ─── UI state ───────────────────────────────────────────── */
  setIsGenerating(true);
  setGenerationStartTime(Date.now());
  setGenerationError(null);
  
  // Increment generation counter for character variety
  setGenerationCount(prev => prev + 1);

  try {
    /* ─── 1) hit /api/generate-image ───────────────────────── */
    // Use FormData to send file directly (minimal memory)
    const formData = new FormData();
    formData.append("prompt", prompt);
    // Maintain likeness for all modes (transform, character, creature, and object)
    formData.append("maintainLikeness", String(true));
    
    if (referenceImageFile) {
      formData.append("referenceImage", referenceImageFile);
    }

    await track("generate", { action: "request_start" });

    const res  = await fetch("/api/generate-image", {
      method : "POST",
      body   : formData,
    });
    const json = (await res.json()) as { imageUrl?: string; error?: string; code?: string };

    if (!res.ok || !json.imageUrl) {
      await track("generate", {
        action : "request_error",
        status : res.status,
        code   : json.code  ?? null,
        message: json.error ?? "Unknown error",
      });
      setGenerationError(json.error || "Failed to generate image");
      if (json.code === "RATE_LIMIT_EXCEEDED" && !user) setRemainingGenerations(0);
      return;
    }

    /* ─── 2) preview image in UI ───────────────────────────── */
    const { imageUrl } = json;
    setGeneratedImage(imageUrl);
    setSessionImages((prev) => {
      const newImages = [...prev, imageUrl];
      // Set the index to the last item in the array (length - 1)
      setCurrentImageIndex(newImages.length - 1);
      return newImages;
    });
    await track("generate", { action: "preview_ready" });

    /* ─── 3) burn guest quota if required ──────────────────── */
    if (!user) {
      await burnFreeQuota();
      await track("generate", { action: "guest_quota_burned" });
    }

    /* ─── 4) signed-in: upload to Storage + DB ─────────────── */
    if (user) {
      setIsUploadingToDatabase(true);
      setUploadError(null);

      try {
        await track("generate", { action: "upload_start" });

        const blob     = await fetch(imageUrl).then((r) => r.blob());
        const file     = new File([blob], "card.png", { type: blob.type });
        const cropped  = await cropImageToAspectRatio(file);
        setProcessedImageBlob(cropped);

        //  ⚑  *NEW*: explicit `source_type` alongside the flag
 const { publicUrl } = await uploadToSupabase(
   cropped,
   undefined,
   {
     metadata: {
       is_ai_generation: true,
       upload_source    : "ai_generation",
       source_type     : "ai_generation",
     },
   },
 );

        setUploadedImageUrl(publicUrl ?? null);
        await track("generate", { action: "upload_ok" });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setUploadError("Upload failed — image won't be purchasable");
        await track("generate", { action: "upload_fail", message: msg });
      } finally {
        setIsUploadingToDatabase(false);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    setGenerationError(msg || "Unknown error");
    await track("generate", { action: "unexpected_error", message: msg });
  } finally {
    await track("generate", {
      action      : "done",
      duration_ms : Math.round(performance.now() - t0),
    });
    setIsGenerating(false);
    setGenerationComplete(true);  // Mark as complete instead of closing
    setGenerationStartTime(null);
    setGenerationElapsedTime(0);
  }
}

  /* ─────────── download card ─────────── */
  const handleDownload = async () => {
    const currentImage = sessionImages.length
      ? sessionImages[currentImageIndex]
      : generatedImage;
    if (!currentImage) return;

    try {
      // Fetch the image and convert to blob
      const response = await fetch(currentImage);
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cardify-card-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      setGenerationError('Failed to download image');
    }
  };

  /* ─────────── finalize card ─────────── */
  const handleFinalizeClick = async () => {
    if (!user) return signInWithGoogle("/free-generate");

    const currentImage = sessionImages.length
      ? sessionImages[currentImageIndex]
      : generatedImage;
    if (!currentImage) return;

    /* If the image was already uploaded during generate, simply open checkout. 
     Otherwise (should only happen in edge cases), fall back to upload flow. */
    if (uploadedImageUrl) {
      setShowCheckoutModal(true);
      return;
    }

    setIsUploadingToDatabase(true);
    setUploadError(null);

    try {
      const blob = await fetch(currentImage).then((r) => r.blob());
      const cropped = await cropImageToAspectRatio(
        new File([blob], "card.png", { type: blob.type })
      );
      setProcessedImageBlob(cropped);

      const { publicUrl } = await uploadToSupabase(
        cropped,
        undefined,
        {
          metadata: {
            is_ai_generation: true,
            upload_source: "ai_generation",
            source_type: "ai_generation",
          },
        },
      );
      setUploadedImageUrl(publicUrl ?? null);
      setShowCheckoutModal(true);
    } catch (e: any) {
      setUploadError("Failed to prepare image for checkout");
    } finally {
      setIsUploadingToDatabase(false);
    }
  };

  /* ─────────────────────── generate/finalize enable flags ─────────────────── */
  // At minimum, need either a reference image OR an art style to generate something meaningful
  const hasValidInput = referenceImageFile || fields.artStyle || fields.titleText || fields.frameStyle;

  const generateBtnEnabled = hasValidInput && !isGenerating && usableCredits > 0;

  const remainingFree = user ? freebiesLeftDB : remainingGenerations;

  return (
    <div className="min-h-screen bg-cyber-black relative overflow-hidden font-mono">
      {/* ────── background scan-lines & grid ────── */}
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="fixed inset-0 scanlines  opacity-20 pointer-events-none" />

      <Navigation />

      {/* ────── Mode Selection Modal ────── */}
      {showModeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleCancelModeSelection}
          />
          
          {/* Modal Content */}
          <div className="relative bg-cyber-dark border-2 border-cyber-cyan/50 rounded-xl p-4 sm:p-6 max-w-2xl w-full shadow-[0_0_30px_rgba(0,255,255,0.3)] max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={handleCancelModeSelection}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3 pr-8">
              Choose Generation Mode
            </h2>
            <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">
              Choose the mode that best matches your uploaded image for optimal results
            </p>
            
            {/* Mode Options Grid - Single column on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Transform Mode */}
              <button
                onClick={() => handleModeSelection('transform')}
                className="relative p-3 sm:p-4 rounded-lg border-2 border-cyber-cyan/30 bg-cyber-darker/50 hover:bg-cyber-darker/70 hover:border-cyber-cyan/50 transition-all duration-300 text-left group"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl flex-shrink-0">👤</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-cyber-cyan transition-colors">
                      Transform Mode
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400">
                      Transform regular people into epic heroes
                    </p>
                  </div>
                </div>
              </button>
              
              {/* Character Mode */}
              <button
                onClick={() => handleModeSelection('character')}
                className="relative p-3 sm:p-4 rounded-lg border-2 border-cyber-cyan/30 bg-cyber-darker/50 hover:bg-cyber-darker/70 hover:border-cyber-cyan/50 transition-all duration-300 text-left group"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl flex-shrink-0">🦸</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-cyber-cyan transition-colors">
                      Character Mode
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400">
                      Keep costume & identity of character
                    </p>
                  </div>
                </div>
              </button>
              
              {/* Creature Mode */}
              <button
                onClick={() => handleModeSelection('creature')}
                className="relative p-3 sm:p-4 rounded-lg border-2 border-cyber-cyan/30 bg-cyber-darker/50 hover:bg-cyber-darker/70 hover:border-cyber-cyan/50 transition-all duration-300 text-left group"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl flex-shrink-0">🐉</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-cyber-cyan transition-colors">
                      Creature Mode
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400">
                      For creature or animal images
                    </p>
                  </div>
                </div>
              </button>
              
              {/* Object Mode */}
              <button
                onClick={() => handleModeSelection('object')}
                className="relative p-3 sm:p-4 rounded-lg border-2 border-cyber-cyan/30 bg-cyber-darker/50 hover:bg-cyber-darker/70 hover:border-cyber-cyan/50 transition-all duration-300 text-left group"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl flex-shrink-0">📦</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-cyber-cyan transition-colors">
                      Object Mode
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400">
                      For logos or objects • Defaults to logo-optimized
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game modal removed - now integrated into FlippableCardPreview */}

      {/* ────── checkout modal (opens after finalize) ────── */}
      <CustomCardCheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        uploadedImage={
          sessionImages.length
            ? sessionImages[currentImageIndex]
            : generatedImage
        }
        processedImageBlob={processedImageBlob}
        uploadedImageUrl={uploadedImageUrl}
      />

      {/* ────── page body ────── */}
      <div className="px-4 sm:px-6 py-8 pt-24 pb-20 relative">
        <div className="max-w-7xl mx-auto">
          {/* ───────────── header ───────────── */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-wider">
                Free Card Generator
              </h1>
              <p className="text-gray-400">
                Quick and simple AI card creation
              </p>
            </div>

          </div>

          {/* ───────────── main grid ───────────── */}
          <div className="grid lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
            {/* ─────────── builder (left) ─────────── */}
            <div className="lg:col-span-3">
              <Card className="bg-cyber-dark/60 backdrop-blur-sm border border-cyber-cyan/30 h-full flex flex-col">
                <CardHeader className="pb-6 sm:pb-2 px-4 sm:px-6">
                  <CardTitle className="text-white flex items-center gap-2 tracking-wider">
                    <Wand2 className="w-5 h-5 text-cyber-cyan" />
                    Create Your Card
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 pt-0 flex-1 flex flex-col gap-4">
                  {/* Reference Image Upload */}
                  <div className="space-y-2">
                    <Label className="text-cyber-cyan tracking-wide">
                      Reference Image
                    </Label>
                    <div className={`relative transition-all duration-500 rounded-md ${!referenceImageFile ? 'animate-subtle-pulse-mobile' : ''}`}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="reference-image-upload"
                      />
                      {!referenceImageFile ? (
                        <label
                          htmlFor="reference-image-upload"
                          className="flex items-center justify-center gap-2 h-10 px-3 bg-cyber-darker/50 border border-cyber-cyan/30 rounded-md cursor-pointer hover:bg-cyber-darker/70 hover:border-cyber-cyan transition-colors"
                        >
                          <Upload className="w-4 h-4 text-cyber-cyan" />
                          <span className="text-xs text-gray-400">
                            Upload Image
                          </span>
                        </label>
                      ) : (
                        <div className="flex items-center gap-2 h-10 px-3 bg-cyber-cyan/10 border border-cyber-cyan/50 rounded-md">
                          <ImageIcon className="w-4 h-4 text-cyber-cyan flex-shrink-0" />
                          <span
                            className="text-xs text-cyber-cyan truncate"
                            title={referenceImageName || "Image uploaded"}
                          >
                            {referenceImageName
                              ? referenceImageName.length > 20
                                ? `${referenceImageName.substring(0, 20)}...`
                                : referenceImageName
                              : "Uploaded"}
                          </span>
                          <button
                            onClick={handleRemoveImage}
                            className="text-cyber-pink hover:text-cyber-pink/80 transition-colors ml-auto"
                            type="button"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Mode Indicator */}
                    {referenceImageFile && (
                      <div className="flex items-center justify-between mt-2 h-10 px-3 bg-cyber-cyan/10 border border-cyber-cyan/50 rounded-md">
                        <div className="flex items-center gap-1">
                          <span className="text-sm">
                            {subjectType === 'transform' && '👤'}
                            {subjectType === 'character' && '🦸'}
                            {subjectType === 'creature' && '🐉'}
                            {subjectType === 'object' && '📦'}
                          </span>
                          <span className="text-xs font-bold text-cyber-cyan">
                            {subjectType === 'transform' && 'Transform Mode'}
                            {subjectType === 'character' && 'Character Mode'}
                            {subjectType === 'creature' && 'Creature Mode'}
                            {subjectType === 'object' && 'Object Mode'}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowModeSelector(true)}
                          className="text-xs text-cyber-cyan hover:text-cyber-cyan/80 transition-colors underline"
                          type="button"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title Text */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="title-text"
                      className="text-cyber-cyan tracking-wide"
                    >
                      Card Title
                    </Label>
                    <Input
                      id="title-text"
                      placeholder="e.g., Shadow Dragon, Cyber Knight"
                      value={fields.titleText}
                      onChange={(e) =>
                        setFields({
                          ...fields,
                          titleText: e.target.value,
                        })
                      }
                      className="bg-cyber-darker/50 border-cyber-cyan/30 text-white placeholder:text-gray-500 focus:border-cyber-cyan"
                    />
                  </div>

                  {/* Art Style Selection */}
                  <div className="space-y-2">
                    <Label className="text-cyber-cyan tracking-wide">
                      Art Style {referenceImageFile && subjectType === 'object' && '(Optional)'}
                      {referenceImageFile && subjectType === 'object' && !fields.artStyle && (
                        <span className="text-xs text-gray-400 ml-2">
                          - Professional style auto-applied for logos
                        </span>
                      )}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {ART_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setFields({ ...fields, artStyle: style.id })}
                          type="button"
                          className={`relative h-auto min-h-[3rem] py-2 px-1 flex items-center justify-center rounded-lg border-2 transition-all duration-300 overflow-hidden ${
                            fields.artStyle === style.id
                              ? "bg-cyber-dark border-cyber-cyan shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                              : "bg-cyber-darker/50 border-cyber-cyan/30 hover:bg-cyber-darker/70 hover:border-cyber-cyan/50"
                          }`}
                        >
                          <span className={`relative z-10 text-sm font-bold text-center whitespace-normal break-words leading-tight ${
                            fields.artStyle === style.id ? 'text-cyber-cyan' : 'text-gray-300'
                          }`}>
                            {style.name}
                          </span>
                          {fields.artStyle === style.id && (
                            <div className="absolute inset-0 bg-gradient-to-br from-cyber-cyan/20 to-transparent pointer-events-none" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Setting */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="background"
                      className="text-cyber-cyan tracking-wide"
                    >
                      Background Setting (Optional)
                    </Label>
                    <Input
                      id="background"
                      placeholder="e.g., mystical forest, neon city skyline, ancient ruins"
                      value={fields.background}
                      onChange={(e) =>
                        setFields({
                          ...fields,
                          background: e.target.value,
                        })
                      }
                      className="bg-cyber-darker/50 border-cyber-cyan/30 text-white placeholder:text-gray-500 focus:border-cyber-cyan"
                    />
                  </div>

                  {/* Frame Style */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="frame-style"
                      className="text-cyber-cyan tracking-wide"
                    >
                      Card Frame Style
                    </Label>
                    <Select
                      value={fields.frameStyle}
                      onValueChange={(value) =>
                        setFields({ ...fields, frameStyle: value })
                      }
                    >
                      <SelectTrigger className="bg-cyber-darker/50 border-cyber-cyan/30 text-white hover:bg-cyber-darker/70 hover:border-cyber-cyan focus:border-cyber-cyan transition-colors">
                        <SelectValue placeholder="Select a frame style" />
                      </SelectTrigger>
                      <SelectContent className="bg-cyber-dark border-cyber-cyan/30 max-w-[90vw] sm:max-w-md overflow-hidden rounded-md">
                        <div className="overflow-hidden rounded-[inherit]">
                          {FRAME_STYLES.map((style) => (
                            <SelectItem
                              key={style.id}
                              value={style.id}
                              className="text-white data-[state=checked]:bg-transparent hover:bg-white hover:text-black data-[state=checked]:hover:bg-white data-[state=checked]:hover:text-black data-[state=checked]:text-white [&>span]:text-white hover:[&>span]:text-black [&_*]:hover:text-black mx-0 rounded-none cursor-pointer"
                            >
                              <div className="pr-2">
                                <div className="font-semibold">
                                  {style.name}
                                </div>
                                <div className="text-xs text-gray-400 whitespace-normal break-words">
                                  {style.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Generate and Reset Buttons */}
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <Button
                        onClick={handleReset}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-gray-400 hover:bg-transparent hover:text-gray-300"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reset All
                      </Button>
                    </div>
                    <Button
                      onClick={isOutOfFreeAndLoggedOut ? () => signInWithGoogle("/free-generate") : handleGenerate}
                      disabled={isOutOfFreeAndLoggedOut ? false : (!generateBtnEnabled || isOutOfCredits)}
                      className={`w-full text-lg py-6 tracking-wider transition-all duration-300 ${
                        (generateBtnEnabled || isOutOfFreeAndLoggedOut)
                          ? "cyber-button"
                          : "bg-gray-800 border-2 border-gray-600 text-gray-500 opacity-50"
                      }`}
                      title={
                        isOutOfFreeAndLoggedOut
                          ? "Sign in to continue"
                          : undefined
                      }
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating…
                        </>
                      ) : isOutOfFreeAndLoggedOut ? (
                        <>
                          <AlertCircle className="w-5 h-5 mr-2" />
                          Sign in to continue
                        </>
                      ) : isOutOfCredits ? (
                        <>
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          Buy Credits
                        </>
                      ) : user ? (
                        <>
                          <Wand2 className="w-5 h-5 mr-2" />
                          <span className="hidden sm:inline">Generate Card</span>
                          <span className="sm:hidden">Generate</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5 mr-2" />
                          <span className="hidden sm:inline">Generate Card</span>
                          <span className="sm:hidden">Generate</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {generationError && (
                    <div className="mt-2 text-xs text-red-400 bg-red-900/20 border border-red-400/30 rounded p-2">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      {generationError}
                    </div>
                  )}

                  {/* Upgrade Banner - Always visible, fills remaining space */}
                  <div className="flex-1 relative overflow-hidden rounded-lg bg-cyber-dark/40 border border-cyber-cyan/30 p-6 transition-all duration-300 hover:border-cyber-cyan/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] flex flex-col justify-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyber-cyan/5 via-transparent to-cyber-pink/5 animate-pulse" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-cyber-cyan" />
                          Unlock Advanced Customization
                        </h3>
                      </div>
                      <p className="text-sm text-gray-300 mb-4">
                        {user 
                          ? "Access the advanced generator with full customization options"
                          : "Sign up to unlock the advanced generator with premium features"
                        }
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                          onClick={() => user ? window.location.href = "/generate" : signInWithGoogle("/generate")}
                          size="sm"
                          className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41]/10 hover:shadow-[0_0_20px_rgba(0,255,65,0.5)] font-semibold transition-all"
                        >
                          {user ? "Go to Advanced Generator" : "Sign Up & Upgrade"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        {user && (
                          <Button
                            onClick={() => window.location.href = "/credits"}
                            variant="outline"
                            size="sm"
                            className="bg-transparent border-2 border-cyber-pink text-cyber-pink hover:text-cyber-pink hover:bg-cyber-pink/10 hover:shadow-[0_0_20px_rgba(255,0,128,0.5)] font-semibold transition-all"
                          >
                            Buy Credits
                            <ShoppingCart className="w-4 h-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ─────────── preview (right) ─────────── */}
            <div className="lg:col-span-2" id="card-preview-section">
              <Card className="bg-cyber-dark/60 backdrop-blur-sm border border-cyber-cyan/30 h-full flex flex-col">
                <CardHeader className="pb-6 sm:pb-2 px-4 sm:px-6">
                  <CardTitle className="text-white tracking-wider flex items-center justify-between">
                    <span>Card Preview</span>
                  </CardTitle>
                  <p className="text-gray-400 text-sm">
                    {generatedImage
                      ? "Your generated card"
                      : "Generate a card to see the preview"}
                  </p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-4 sm:p-6 pt-0">
                  <div className="flex-1 flex items-center justify-center">
                    <FlippableCardPreview
                      artwork={generatedImage}
                      isLoading={isGenerating}
                      defaultImage="/1756189842550-9b984504.webp"
                      isGenerating={isGenerating}
                      generationComplete={generationComplete}
                      onGenerationComplete={handleViewCard}
                    />
                  </div>

                  {/* Finalize and Download buttons */}
                  <div className="mt-6 space-y-3">
                    <div className="flex gap-3">
                      <Button
                        onClick={handleFinalizeClick}
                        disabled={
                          (!generatedImage && sessionImages.length === 0) ||
                          isUploadingToDatabase
                        }
                        className={`flex-1 text-lg py-6 tracking-wider transition-all duration-300 ${
                          generatedImage || sessionImages.length
                            ? "cyber-button"
                            : "bg-gray-800 text-gray-500 opacity-50"
                        }`}
                      >
                        {isUploadingToDatabase ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin text-cyber-cyan" />
                            Preparing…
                          </>
                        ) : (
                          <>
                            Finalize Card
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleDownload}
                        disabled={!generatedImage && sessionImages.length === 0}
                        className={`py-6 px-6 transition-all duration-300 ${
                          generatedImage || sessionImages.length
                            ? "bg-transparent border-2 border-purple-500 text-purple-500 hover:bg-purple-500/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                            : "bg-gray-800 text-gray-500 opacity-50"
                        }`}
                        title="Download generated card"
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                    </div>

                    {uploadError && (
                      <div className="text-xs text-red-400 bg-red-900/20 border border-red-400/30 rounded p-2">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        {uploadError}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}