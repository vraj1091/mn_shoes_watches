/*
 * Store structure: the category tree from the brief, attribute templates, starter tax classes, a
 * size chart, search synonyms and collections. Everything here is editable in the admin and is
 * kept when demo data is removed. Demo products, brands and orders live in prisma/demo.
 */

export type TemplateCode = "shoes" | "watches" | "perfumes" | "accessories";

// ─── Tax classes ────────────────────────────────────────────────────────────
// Starting points only: HSN codes and GST rates must be confirmed by the owner's accountant
// (TaxClass.verifiedAt stays empty until then and the admin shows a warning).
// maxUnitValue is the taxable value per unit, in paise, up to which a slab applies.
export const TAX_CLASSES = [
  { name: "Footwear", hsnCode: "6403", slabs: [{ maxUnitValue: 2_500_00, rateBp: 500 }, { maxUnitValue: null, rateBp: 1800 }] },
  { name: "Watches", hsnCode: "9102", slabs: [{ maxUnitValue: null, rateBp: 1800 }] },
  { name: "Perfumes", hsnCode: "3303", slabs: [{ maxUnitValue: null, rateBp: 1800 }] },
  { name: "Leather goods", hsnCode: "4203", slabs: [{ maxUnitValue: null, rateBp: 1800 }] },
  { name: "Sunglasses", hsnCode: "9004", slabs: [{ maxUnitValue: null, rateBp: 1800 }] },
  { name: "Socks", hsnCode: "6115", slabs: [{ maxUnitValue: 2_500_00, rateBp: 500 }, { maxUnitValue: null, rateBp: 1800 }] },
  { name: "Shoe care", hsnCode: "3405", slabs: [{ maxUnitValue: null, rateBp: 1800 }] },
  { name: "Watch straps", hsnCode: "9113", slabs: [{ maxUnitValue: null, rateBp: 1800 }] },
  { name: "Gift boxes", hsnCode: "4819", slabs: [{ maxUnitValue: null, rateBp: 1800 }] },
] as const;

export type TaxClassName = (typeof TAX_CLASSES)[number]["name"];

// ─── Attributes ─────────────────────────────────────────────────────────────

type AttributeSeed = {
  code: string;
  name: string;
  type: "SELECT" | "MULTI_SELECT" | "NUMBER" | "TEXT" | "BOOLEAN";
  unit?: string;
  isVariantAxis?: boolean;
  filterStyle?: "CHECKBOX" | "SWATCH" | "RANGE" | "TOGGLE";
  isFilterable?: boolean;
  helpText?: string;
  values?: (string | { value: string; swatchHex?: string; sortKey?: number })[];
};

const COLOURS = [
  { value: "Black", swatchHex: "#1c1c1c" },
  { value: "Brown", swatchHex: "#5b3a24" },
  { value: "Dark brown", swatchHex: "#3d261a" },
  { value: "Tan", swatchHex: "#a8693a" },
  { value: "Burgundy", swatchHex: "#5e1f2a" },
  { value: "Navy", swatchHex: "#1f2a44" },
  { value: "White", swatchHex: "#f4f2ee" },
  { value: "Grey", swatchHex: "#8a8a8a" },
  { value: "Olive", swatchHex: "#5c5a33" },
  { value: "Beige", swatchHex: "#d8c7a8" },
  { value: "Natural tan", swatchHex: "#c08a55" },
  { value: "White and navy", swatchHex: "#e9e7e2" },
  { value: "Black and brown", swatchHex: "#2b2119" },
  { value: "Red, white and black", swatchHex: "#b3202a" },
  { value: "White and red", swatchHex: "#d8392f" },
  { value: "White and green", swatchHex: "#2e6b4a" },
  { value: "Multicolour", swatchHex: "#e2b33c" },
  { value: "Gold", swatchHex: "#c9a54a" },
  { value: "Silver", swatchHex: "#c7c9cc" },
  { value: "Tortoiseshell", swatchHex: "#6b4226" },
  { value: "Clear", swatchHex: "#e8ecef" },
];

export const UK_SIZES = [5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12];

const NOTES = [
  "Bergamot", "Lemon", "Pink pepper", "Cardamom", "Saffron", "Mint", "Green apple", "Lavender",
  "Rose", "Jasmine", "Orange blossom", "Oud", "Geranium", "Petrichor", "Leather", "Tobacco",
  "Sandalwood", "Vetiver", "Amber", "Musk", "Vanilla", "Patchouli", "Cedarwood", "Benzoin",
  "Grapefruit", "Pear", "Melon", "Pineapple", "Mango", "Green tea", "Tuberose", "Orris", "Violet", "Tonka bean",
  "Rangoon creeper", "Neroli", "Ginger",
];

export const ATTRIBUTES: AttributeSeed[] = [
  {
    code: "size_uk",
    name: "Size (UK/India)",
    type: "SELECT",
    isVariantAxis: true,
    helpText: "UK and Indian shoe sizes are the same.",
    values: UK_SIZES.map((size) => ({ value: `UK ${size}`, sortKey: size })),
  },
  { code: "width", name: "Width", type: "SELECT", values: ["Standard", "Wide"] },
  { code: "colour", name: "Colour", type: "SELECT", isVariantAxis: true, filterStyle: "SWATCH", values: COLOURS },
  {
    code: "upper_material",
    name: "Upper material",
    type: "SELECT",
    values: ["Full-grain leather", "Suede", "Patent leather", "Nubuck", "Canvas", "Knit mesh", "Synthetic leather", "Vegetable-tanned leather", "Nylon and suede", "Embroidered leather"],
  },
  { code: "sole_material", name: "Sole material", type: "SELECT", values: ["Leather", "Rubber", "Crepe rubber", "TPR", "EVA", "PU"] },
  { code: "closure", name: "Closure", type: "SELECT", values: ["Lace-up", "Slip-on", "Buckle", "Elastic sides", "Hook and loop", "Toe loop"] },
  {
    code: "occasion",
    name: "Occasion",
    type: "MULTI_SELECT",
    values: ["Formal", "Office", "Wedding", "Party", "Casual", "Festive", "Sports", "Travel", "Daily wear"],
  },
  { code: "heel_height_cm", name: "Heel height", type: "NUMBER", unit: "cm", filterStyle: "RANGE", isFilterable: false },
  {
    code: "dial_size_mm",
    name: "Dial size",
    type: "NUMBER",
    unit: "mm",
    filterStyle: "RANGE",
    helpText: "Case diameter without the crown.",
  },
  {
    code: "dial_colour",
    name: "Dial colour",
    type: "SELECT",
    isVariantAxis: true,
    filterStyle: "SWATCH",
    values: [
      { value: "Black", swatchHex: "#1c1c1c" },
      { value: "Navy", swatchHex: "#1f2a44" },
      { value: "White", swatchHex: "#f4f2ee" },
      { value: "Silver", swatchHex: "#c7c9cc" },
      { value: "Green", swatchHex: "#2f4a3a" },
      { value: "Blush", swatchHex: "#e8c9bd" },
      { value: "Champagne", swatchHex: "#d9c7a0" },
      { value: "Grey", swatchHex: "#6b6f75" },
      { value: "Blue", swatchHex: "#2c4a7a" },
    ],
  },
  {
    code: "case_material",
    name: "Case material",
    type: "SELECT",
    values: ["Stainless steel", "Rose-gold-tone steel", "Gold-tone steel", "Titanium", "Ceramic", "Brass", "Aluminium", "18 ct rose gold", "Steel and 18 ct gold"],
  },
  {
    code: "strap_material",
    name: "Strap material",
    type: "SELECT",
    values: ["Leather", "Stainless steel bracelet", "Steel mesh", "Silicone", "Nylon", "Ceramic"],
  },
  {
    code: "strap_colour",
    name: "Strap colour",
    type: "SELECT",
    isVariantAxis: true,
    filterStyle: "SWATCH",
    values: [
      { value: "Black", swatchHex: "#1c1c1c" },
      { value: "Brown", swatchHex: "#5b3a24" },
      { value: "Tan", swatchHex: "#a8693a" },
      { value: "Steel", swatchHex: "#b9bcc0" },
      { value: "Rose gold", swatchHex: "#c99a86" },
      { value: "Navy", swatchHex: "#1f2a44" },
      { value: "Two-tone", swatchHex: "#b9a77a" },
      { value: "Gold", swatchHex: "#c9a54a" },
    ],
  },
  { code: "movement", name: "Movement", type: "SELECT", values: ["Quartz", "Automatic", "Hand-wound mechanical", "Solar quartz", "Smart"] },
  { code: "display", name: "Display", type: "SELECT", values: ["Analog", "Digital", "Analog-digital", "Touchscreen"] },
  {
    code: "water_resistance_m",
    name: "Water resistance",
    type: "NUMBER",
    unit: "m",
    filterStyle: "RANGE",
    helpText: "30 m = splash-proof, 50 m = brief swimming, 100 m = swimming and snorkelling.",
  },
  {
    code: "volume_ml",
    name: "Volume",
    type: "SELECT",
    isVariantAxis: true,
    values: [6, 12, 30, 50, 75, 100, 150, 200].map((ml) => ({ value: `${ml} ml`, sortKey: ml })),
  },
  {
    code: "concentration",
    name: "Concentration",
    type: "SELECT",
    values: ["Parfum", "Eau de parfum", "Eau de toilette", "Attar", "Body mist", "Deodorant"],
  },
  { code: "top_notes", name: "Top notes", type: "MULTI_SELECT", isFilterable: false, values: NOTES },
  { code: "heart_notes", name: "Heart notes", type: "MULTI_SELECT", isFilterable: false, values: NOTES },
  { code: "base_notes", name: "Base notes", type: "MULTI_SELECT", isFilterable: false, values: NOTES },
  {
    code: "longevity",
    name: "Longevity",
    type: "SELECT",
    values: [
      { value: "Moderate (4–6 hours)", sortKey: 1 },
      { value: "Long-lasting (6–8 hours)", sortKey: 2 },
      { value: "Very long-lasting (8+ hours)", sortKey: 3 },
    ],
  },
  {
    code: "material",
    name: "Material",
    type: "SELECT",
    values: ["Full-grain leather", "Genuine leather", "Canvas", "Cotton blend", "Acetate", "Metal", "Polycarbonate", "Cardboard", "Cedar wood", "Wax and brushes"],
  },
  {
    code: "frame_material",
    name: "Frame",
    type: "SELECT",
    values: ["Acetate", "Acetate and metal", "Metal", "Polycarbonate"],
  },
  {
    code: "lens",
    name: "Lenses",
    type: "SELECT",
    helpText: "UV400 blocks UVA and UVB rays up to 400 nm.",
    values: ["Tinted, UV400", "Gradient, UV400", "Polarised, UV400", "Clear, no UV filter", "Novelty print, not for driving"],
  },
  {
    code: "size",
    name: "Size",
    type: "SELECT",
    isVariantAxis: true,
    values: [
      ...["Free size", "S", "M", "L", "XL"].map((value, index) => ({ value, sortKey: index })),
      ...[30, 32, 34, 36, 38, 40, 42].map((waist) => ({ value: `${waist} in`, sortKey: 100 + waist })),
      ...[18, 20, 22].map((lug) => ({ value: `${lug} mm`, sortKey: 200 + lug })),
    ],
  },
];

export const TEMPLATES: { code: TemplateCode; name: string; attributes: string[] }[] = [
  {
    code: "shoes",
    name: "Shoes",
    attributes: ["size_uk", "width", "colour", "upper_material", "sole_material", "closure", "occasion", "heel_height_cm"],
  },
  {
    code: "watches",
    name: "Watches",
    attributes: ["dial_size_mm", "dial_colour", "case_material", "strap_material", "strap_colour", "movement", "display", "water_resistance_m"],
  },
  {
    code: "perfumes",
    name: "Perfumes",
    attributes: ["volume_ml", "concentration", "top_notes", "heart_notes", "base_notes", "longevity", "occasion"],
  },
  { code: "accessories", name: "Accessories", attributes: ["material", "colour", "size", "frame_material", "lens"] },
];

// ─── Categories ─────────────────────────────────────────────────────────────

export type CategorySeed = {
  name: string;
  slug: string;
  intro?: string;
  template?: TemplateCode;
  taxClass?: TaxClassName;
  filters?: string[];
  sizeChart?: boolean;
  children?: CategorySeed[];
};

const SHOE_FILTERS = ["size_uk", "colour", "upper_material", "closure", "occasion", "width"];
const WATCH_FILTERS = ["dial_size_mm", "movement", "display", "dial_colour", "case_material", "strap_material", "water_resistance_m"];
const PERFUME_FILTERS = ["concentration", "volume_ml", "longevity", "occasion"];
const ACCESSORY_FILTERS = ["material", "colour", "size"];

const leaf = (name: string, slug: string, intro?: string): CategorySeed => ({ name, slug, intro });

const watchStyles = (gender: "men" | "women"): CategorySeed[] => [
  leaf("Analog", "analog"),
  leaf(
    "Chronograph",
    "chronograph",
    "A chronograph is a watch with a built-in stopwatch, worked by the pushers beside the crown and read on small sub-dials. Besides timing laps or cooking, the extra dials give a sporty, detailed look. Quartz chronographs are accurate and affordable; mechanical ones are rarer and cost more. Check the dial size before you buy, because the extra pushers make a chronograph wear slightly larger than a plain watch of the same case diameter.",
  ),
  leaf(
    "Automatic",
    "automatic",
    gender === "men"
      ? "An automatic watch is a mechanical watch that winds itself from the movement of your wrist, so it needs no battery. A rotor inside turns as you move and tightens the mainspring, which keeps the watch running for a day or two after you take it off. Automatics are prized for their craftsmanship and the smooth sweep of the seconds hand. They gain or lose a few seconds a day, which is normal."
      : undefined,
  ),
  leaf("Digital", "digital"),
  leaf("Smartwatches", "smartwatches"),
  leaf("Premium", "premium"),
];

export const CATEGORY_TREE: CategorySeed[] = [
  {
    name: "Men's shoes",
    slug: "mens-shoes",
    template: "shoes",
    taxClass: "Footwear",
    filters: SHOE_FILTERS,
    sizeChart: true,
    intro:
      "Men's shoes here run from leather Oxfords and Derbys for office and weddings to sneakers, running shoes, boots and Kolhapuri chappals. All sizes are UK sizes, which are the same as Indian sizes. Leather formal shoes are lined in leather and many have stitched soles that a cobbler can replace, so they last for years. If you are between two sizes, the larger one is usually the safer choice; the size guide on each product shows the foot length in centimetres for every size.",
    children: [
      {
        name: "Formal",
        slug: "formal",
        intro:
          "Formal shoes are closed leather shoes worn with suits, trousers and ethnic wear to the office, weddings and functions. The main styles are Oxfords, with closed lacing for the most formal look; Derbys, with open lacing that suits a wider foot; brogues, decorated with punched patterns; loafers, which slip on without laces; and monk straps, fastened with a buckle. Black goes with everything formal, while brown and tan suit daytime and smart-casual outfits.",
        children: [
          leaf(
            "Oxfords",
            "oxfords",
            "Oxford shoes are formal lace-up shoes with closed lacing, where the eyelet tabs are stitched under the front of the shoe. The closed lacing gives a clean, slim look, which is why Oxfords are the most formal men's shoe and the usual choice with a suit or sherwani. Black Oxfords suit evening and formal events; brown suits daytime. Because the lacing is closed, Oxfords fit best on a slim to regular foot.",
          ),
          leaf(
            "Derbys",
            "derbys",
            "Derby shoes are lace-up shoes with open lacing, where the eyelet tabs are sewn on top of the front of the shoe. The open lacing adjusts further, so Derbys suit a wider foot or a high instep better than Oxfords. They are a little less formal than Oxfords and work with suits, trousers and chinos, which makes a Derby a good single pair for both office and weekends.",
          ),
          leaf(
            "Brogues",
            "brogues",
            "Brogues are leather shoes decorated with rows of small punched holes along the seams and toe. The pattern can sit on an Oxford or a Derby: a full brogue has a wing-shaped toe cap, a half brogue a straight toe cap with a punched edge. Brogues are a little less formal than plain shoes and look best in brown and tan, with trousers, chinos and tweed or linen jackets.",
          ),
          leaf(
            "Loafers",
            "loafers",
            "Loafers are slip-on leather shoes without laces. Penny loafers have a strap across the top, tassel loafers small leather tassels, and horsebit loafers a metal bar. Leather loafers are smart enough for the office and easy to wear with trousers or ethnic wear. A loafer should fit snugly at first, because it has no laces to tighten and the leather eases with wear.",
          ),
          leaf("Monk straps", "monk-straps"),
        ],
      },
      {
        name: "Casual",
        slug: "casual",
        intro:
          "Casual shoes are everyday shoes for college, weekends, travel and relaxed offices. Sneakers in leather or canvas are the most versatile; slip-ons and loafers save time with no laces; boat shoes, with soft leather and grippy soles, suit summer and holidays. Look for a cushioned insole if you walk a lot, and pick white or tan if you want one pair that goes with both jeans and chinos.",
        children: [leaf("Sneakers", "sneakers"), leaf("Slip-ons", "slip-ons"), leaf("Boat shoes", "boat-shoes"), leaf("Loafers", "loafers")],
      },
      {
        name: "Sports",
        slug: "sports",
        intro:
          "Sports shoes are built for movement. Running shoes have cushioned, flexible soles for repeated foot strikes; training shoes have flatter, wider soles for stability in the gym; walking shoes balance comfort and support for long daily walks. Choose by the activity you do most. Running shoes often feel best half a size larger than your formal shoes, because feet swell on longer runs.",
        children: [leaf("Running", "running"), leaf("Training", "training"), leaf("Walking", "walking")],
      },
      {
        name: "Boots",
        slug: "boots",
        intro:
          "Boots are shoes that cover the ankle. Chelsea boots have elastic side panels and pull on without laces; chukka boots are ankle-high with two or three eyelets; desert boots are chukkas made in suede with a crepe rubber sole. In India they work best in the cooler months and in air-conditioned offices, with jeans, chinos or slim trousers. Wear them with medium-thick socks and try them on in the evening, when feet are at their largest.",
        children: [
          leaf(
            "Chelsea",
            "chelsea",
            "Chelsea boots are ankle-high slip-on boots with elastic side panels and a pull tab at the back. With no laces they go on in seconds, and their slim shape works with jeans, chinos and slim trousers. Suede Chelsea boots look relaxed; polished leather ones are smart enough for the office in the cooler months. Choose your usual shoe size: the elastic sides give a little, but the boot should hold your heel firmly.",
          ),
          leaf("Chukka", "chukka"),
          leaf("Desert", "desert"),
        ],
      },
      {
        name: "Ethnic",
        slug: "ethnic",
        intro:
          "Ethnic footwear is traditional Indian footwear worn with kurtas, sherwanis and festive outfits. Mojaris, also called juttis, are closed slip-ons with a pointed toe, often embroidered for weddings. Kolhapuris are open leather sandals from Maharashtra, hand-stitched and plaited, and comfortable for daily wear once the leather softens. Both are made of leather that shapes itself to your foot over the first few wears.",
        children: [
          leaf("Mojaris", "mojaris"),
          leaf(
            "Kolhapuris",
            "kolhapuris",
            "Kolhapuri chappals are open leather sandals made by hand in and around Kolhapur in Maharashtra, with a plaited toe loop and stitched layers of vegetable-tanned leather. They feel stiff for the first few days and then soften to the shape of your foot. Avoid soaking them in water; if they get wet, dry them in the shade rather than in the sun, which hardens the leather.",
          ),
        ],
      },
      {
        name: "Sandals, slides and flip-flops",
        slug: "sandals-slides-flip-flops",
        intro:
          "Sandals, slides and flip-flops are open footwear for hot weather, the beach and quick errands. Sandals have straps across the foot and usually a back strap for a secure fit; slides have one wide strap and slip on; flip-flops are held by a thong between the toes. Choose rubber or EVA soles if they will get wet, and leather for a smarter look.",
        children: [leaf("Sandals", "sandals"), leaf("Slides", "slides"), leaf("Flip-flops", "flip-flops")],
      },
    ],
  },
  {
    name: "Watches",
    slug: "watches",
    template: "watches",
    taxClass: "Watches",
    filters: WATCH_FILTERS,
    intro:
      "Watches here include analog, chronograph, automatic, digital and smart watches for men and women, plus matching couple sets. Analog and chronograph watches mostly use quartz movements, which run on a battery and keep accurate time; automatic watches wind themselves as you move. Dial size decides how a watch sits on the wrist: 38–42 mm suits most men, 28–34 mm most women. Each watch page states its water resistance in plain words, so you know whether it is safe for hand washing, swimming or neither.",
    children: [
      {
        name: "Men",
        slug: "men",
        intro:
          "Men's watches range from slim dress watches to sporty chronographs and automatics. For a formal look choose a plain dial of 38–40 mm on a leather strap; for daily wear, a 40–42 mm steel watch with 50 m or more water resistance is the most practical. If you plan to change straps later, note the lug width on the product page.",
        children: watchStyles("men"),
      },
      {
        name: "Women",
        slug: "women",
        intro:
          "Women's watches range from small, fine dress watches to bolder steel and smart watches. A 26–32 mm case suits most women's wrists, while a 34–38 mm case gives a bolder, more current look. Mesh and steel bracelets adjust easily and suit daily wear; leather straps are lighter and cooler in summer. Rose-gold and gold-tone cases match jewellery, and plain steel goes with everything.",
        children: watchStyles("women"),
      },
      leaf("Couple sets", "couple-sets"),
    ],
  },
  {
    name: "Perfumes",
    slug: "perfumes",
    template: "perfumes",
    taxClass: "Perfumes",
    filters: PERFUME_FILTERS,
    intro:
      "Perfumes here include eau de parfum, eau de toilette, attar, deodorants and body mists for men, women and everyone. The difference between them is strength: eau de parfum holds more fragrance oil and lasts longer on the skin than eau de toilette, and attar is a concentrated, alcohol-free perfume oil traditional in India. Each product page lists the top, heart and base notes, so you can tell how the scent changes through the day.",
    children: [
      leaf("Men", "men"),
      leaf("Women", "women"),
      leaf("Unisex", "unisex"),
      leaf(
        "Eau de parfum",
        "eau-de-parfum",
        "Eau de parfum is perfume with roughly 15–20% fragrance oil in alcohol, stronger than eau de toilette. It usually lasts six to eight hours on the skin, so two or three sprays in the morning cover a working day. Spray on the neck and the inside of the wrists, and do not rub your wrists together afterwards, which wears off the top notes faster.",
      ),
      leaf("Eau de toilette", "eau-de-toilette"),
      leaf(
        "Attar",
        "attar",
        "Attar is a concentrated perfume oil without alcohol, traditionally distilled in India, especially in Kannauj. A drop or two on the wrist or behind the ears lasts most of the day, and because there is no alcohol it does not sting, which is why many people prefer it for prayer and festive wear. Attars come in small bottles, usually 6 or 12 ml, because so little is needed each time.",
      ),
      leaf("Deodorants and body mists", "deodorants-body-mists"),
      leaf("Gift sets", "gift-sets"),
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    template: "accessories",
    filters: ACCESSORY_FILTERS,
    intro:
      "Accessories are the small things that finish an outfit or look after what you already own: leather belts and wallets, sunglasses, socks, shoe polish and care kits, spare watch straps and gift boxes. Match your belt to your shoes, brown with brown and black with black, and keep a care kit for leather shoes, because regular polish stops the leather drying out and cracking.",
    children: [
      { ...leaf("Belts", "belts"), taxClass: "Leather goods" },
      { ...leaf("Wallets", "wallets"), taxClass: "Leather goods" },
      { ...leaf("Sunglasses", "sunglasses"), taxClass: "Sunglasses", filters: ["frame_material", "lens", "colour"] },
      { ...leaf("Socks", "socks"), taxClass: "Socks" },
      { ...leaf("Shoe care", "shoe-care"), taxClass: "Shoe care" },
      { ...leaf("Watch straps", "watch-straps"), taxClass: "Watch straps" },
      { ...leaf("Gift boxes", "gift-boxes"), taxClass: "Gift boxes" },
    ],
  },
];

// Men's shoe size chart. Foot lengths are typical values; fit varies a little between brands.
export const SHOE_SIZE_CHART = {
  name: "Men's shoes (UK/India)",
  table: {
    columns: ["UK / India", "EU", "US", "Foot length (cm)"],
    rows: [
      ["5", "38", "6", "23.7"],
      ["6", "39", "7", "24.5"],
      ["7", "40–41", "8", "25.4"],
      ["8", "42", "9", "26.2"],
      ["9", "43", "10", "27.1"],
      ["10", "44", "11", "27.9"],
      ["11", "45", "12", "28.8"],
      ["12", "46", "13", "29.6"],
    ],
  },
  howToMeasure: [
    "Stand on a sheet of paper with your heel against a wall, in the socks you will wear.",
    "Mark the tip of your longest toe, then measure from the wall to the mark in centimetres.",
    "Measure both feet in the evening, when feet are largest, and use the longer one.",
    "Find the first size whose foot length is the same as or longer than yours. Between two sizes, choose the larger.",
  ],
};

// Products, brands and pairings are demo data: see prisma/demo/products.ts.

export const sizes = (from: number, to: number) => UK_SIZES.filter((size) => size >= from && size <= to && Number.isInteger(size)).map((size) => `UK ${size}`);

// ─── Search synonyms ────────────────────────────────────────────────────────
// One-way entries correct a common misspelling; two-way entries treat both words as the same.
// "Did you mean" also corrects typos on its own; this list is for words it cannot guess.
export const SYNONYMS: { term: string; synonym: string; twoWay: boolean }[] = [
  { term: "sneker", synonym: "sneakers", twoWay: false },
  { term: "snekers", synonym: "sneakers", twoWay: false },
  { term: "sneekers", synonym: "sneakers", twoWay: false },
  { term: "parfume", synonym: "perfume", twoWay: false },
  { term: "perfum", synonym: "perfume", twoWay: false },
  { term: "kolapuri", synonym: "kolhapuri", twoWay: false },
  { term: "chappel", synonym: "chappal", twoWay: false },
  { term: "chrono", synonym: "chronograph", twoWay: true },
  { term: "edp", synonym: "eau de parfum", twoWay: true },
  { term: "edt", synonym: "eau de toilette", twoWay: true },
  { term: "chappal", synonym: "sandal", twoWay: true },
  { term: "jutti", synonym: "mojari", twoWay: true },
  { term: "juti", synonym: "mojari", twoWay: true },
  { term: "ittar", synonym: "attar", twoWay: true },
  { term: "itr", synonym: "attar", twoWay: true },
  { term: "scent", synonym: "perfume", twoWay: true },
  { term: "fragrance", synonym: "perfume", twoWay: true },
  { term: "trainers", synonym: "sneakers", twoWay: true },
  { term: "smartwatch", synonym: "smart watch", twoWay: true },
];

// ─── Collections ────────────────────────────────────────────────────────────
// Rule-based, so they stay correct as products change. A landingPath makes an indexable page
// at that URL (Part 6: attribute landing pages only where people search for them).
export const COLLECTIONS = [
  {
    title: "New arrivals",
    slug: "new-arrivals",
    rules: [{ field: "publishedWithinDays", op: "lte", value: 60 }],
    defaultSort: "NEWEST",
    landingPath: null,
    intro:
      "New arrivals are the shoes, watches, perfumes and accessories added to the shop in the last 60 days, newest first. Stock of new styles is often limited to a few pieces per size in the first weeks, so if you see your size, it is worth ordering or visiting the shop in Kalol to try it on. Each product page shows the sizes in stock right now and when it can reach you.",
  },
  {
    title: "Bestsellers",
    slug: "bestsellers",
    rules: [],
    defaultSort: "BESTSELLING",
    landingPath: null,
    intro:
      "Bestsellers are the products our customers buy most often, ranked by units sold in the last 90 days and updated every night. It is a quick way to find the shoes, watches and perfumes that people come back for: the leather formal shoes worn to office and weddings, everyday watches with good water resistance, and long-lasting perfumes and attars. Sold-out sizes are listed after the ones you can order today.",
  },
  {
    title: "Watches under ₹10,000",
    slug: "watches-under-10000",
    rules: [
      { field: "category", op: "in", value: ["watches"] },
      { field: "price", op: "lte", value: 10_000_00 },
    ],
    defaultSort: "PRICE_ASC",
    landingPath: "watches/under-10000",
    intro:
      "Watches under ₹10,000 are analog, chronograph and quartz watches for men and women that cost less than ten thousand rupees, including GST. In this range you get a stainless steel case, mineral glass and a reliable quartz movement; water resistance runs from 30 m, which handles hand washing and rain, to 100 m, which is enough for swimming. Each watch page lists the dial size, movement and warranty, so you can compare them side by side.",
  },
] as const;
