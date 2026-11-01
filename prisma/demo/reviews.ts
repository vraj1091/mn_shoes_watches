import { DEMO_PRODUCTS, type DummyCategory } from "./products";

/*
 * Demo review text. DummyJSON supplies each product's star ratings and dates, but its comments are
 * filler ("Highly impressed!", "Waste of money!") and its reviewers are not shoppers in Gujarat.
 * These say something a buyer can use: fit, size, how long a scent lasts, what came in the box.
 * They describe the product only and promise nothing about the shop's own service or policies.
 */

type Band = "five" | "four" | "mixed" | "low";

const LINES: Record<DummyCategory, Record<Band, readonly string[]>> = {
  "mens-shoes": {
    five: [
      "Ordered my usual UK 9 and it fits right. The leather was stiff for two days, fine since.",
      "Wore them every day for a month, to work and at weekends. No pinching at the toe.",
      "Exactly the pair in the photos. Box and tags intact, and the stitching is neat all round.",
      "Light for a high-top. I walk to the station in them every day and my feet do not ache.",
      "The colours are exactly as pictured, and they cleaned up well after the rains with a damp cloth.",
      "My third pair from this maker, and the sizing is the same every time.",
    ],
    four: [
      "Good pair. The sole is firmer than I expected but comfortable for a full working day.",
      "Took one size up for my wide feet, and that was the right call.",
      "The colour is a shade darker than the photos. Comfortable and well made.",
    ],
    mixed: [
      "Size was right but the laces are too short for the top eyelets. Swapped them for my own.",
      "Fine for the price. The insole is thin, so I added a gel insole for long days.",
      "Too narrow at the toe for my feet. Someone with a slimmer foot will like them.",
    ],
    low: [
      "The sole started to come away at the toe after three weeks. Disappointed for the price.",
      "Much narrower than my usual UK 9. I could not wear them for more than an hour.",
      "The leather creased badly within a week and the colour rubbed off at the heel.",
    ],
  },
  "mens-watches": {
    five: [
      "Fits my 17 cm wrist well. Came in the maker's box with the warranty card filled in.",
      "Keeps time to a few seconds a day. Looks right with a suit and with jeans.",
      "Bought it as an anniversary gift. The dial looks better in person than in the photos.",
      "Comfortable all day, and the clasp has not opened once in three months.",
      "The case finish is better than I expected, with no rough edges anywhere.",
      "Easy to read at a glance, and the date changes cleanly at midnight.",
    ],
    four: [
      "Lovely dial. The clasp is stiff at first and takes two hands to close.",
      "Wears smaller than the case size suggests, which suits my slim wrist.",
      "Solid watch. It needed sizing to my wrist, so plan for that.",
    ],
    mixed: [
      "Looks good, but the clasp is plainer than the case and dial.",
      "Runs about 10 seconds a day fast. Within the maker's limit, but I noticed.",
      "Heavier on the wrist than I expected. Fine for evenings, too much for every day.",
    ],
    low: [
      "The crown was loose when it arrived and had to go back to the maker for repair.",
      "Lost two minutes in the first week and had to be adjusted.",
      "Scratched within days of normal wear. Not what I expect at this price.",
    ],
  },
  "womens-watches": {
    five: [
      "Fits my 15 cm wrist without taking out a link. The dial catches the light beautifully.",
      "Bought it for my mother's birthday. The maker's box and warranty card were inside.",
      "Light enough to forget I am wearing it, and it goes with saris and office wear alike.",
      "My daughter wears it to college every day and it still looks new after two months.",
      "The dial is easy to read without my glasses, which matters to me.",
      "Dressy enough for weddings, simple enough for work. Exactly what I wanted.",
    ],
    four: [
      "Elegant and light. The clasp is fiddly to close on your own at first.",
      "Smaller dial than it looks in the photos, but it suits a slim wrist.",
      "Pretty watch. The gold tone is warmer than on my screen, which I prefer.",
    ],
    mixed: [
      "Too big for my wrist, so it needs sizing before I can wear it.",
      "Nice to look at, but the numbers are hard to read in dim light.",
      "Fits well, but it pulls at wrist hair a little.",
    ],
    low: [
      "Stopped after ten days and had to go back to the maker under warranty.",
      "The gold tone began to wear off at the clasp within a month.",
      "Far too heavy for my wrist, and it looked nothing like the photos once on.",
    ],
  },
  fragrances: {
    five: [
      "Lasts about six hours on me, even in this heat. The box was sealed with the batch code printed.",
      "Same bottle and same smell as the one I bought abroad years ago. Arrived well wrapped.",
      "My everyday scent now. Two sprays in the morning are still there in the evening.",
      "Bought it for my husband, and people at his office have asked what he is wearing.",
      "Wore it to a December wedding and could still smell it on my shawl the next day.",
      "Fresh in the morning and warmer by evening. Worth the price.",
    ],
    four: [
      "Lovely smell, but it fades after four hours in the afternoon heat.",
      "Genuine, and the batch code on the box matches the bottle. Softer than I remembered.",
      "Good for evenings. A little strong for the office, so I use one spray.",
    ],
    mixed: [
      "Smells right, but softer and shorter-lived than the one I tried at the airport.",
      "Too sweet on my skin. My sister likes it, so it went to her.",
      "The outer box was dented in transit. The bottle itself was fine.",
    ],
    low: [
      "Gone from my skin within two hours. I expected far more at this price.",
      "The spray nozzle sticks and puts out a jet rather than a mist.",
      "Nothing like the tester I tried. Too sharp at first and then gone.",
    ],
  },
  sunglasses: {
    five: [
      "Lenses are properly dark, good for driving at noon. They came with a hard case.",
      "Light on the nose, and they do not slip when I look down at my phone.",
      "Exactly as pictured. The frame feels sturdier than the price suggests.",
      "They fit my broad face without pressing at the temples. Good for long bike rides.",
      "The lenses cut the glare off the road at midday, and my eyes are less tired after driving.",
      "Stylish without being loud. My wife borrowed them and has not given them back.",
    ],
    four: [
      "Good fit, but the frame is wider than my old pair. Fine for a broad face.",
      "Smart glasses. The case is a soft pouch rather than a hard case.",
      "Clear lenses with no distortion at the edges. The arms are a little tight at first.",
    ],
    mixed: [
      "They look smart but press behind the ears after an hour.",
      "Fun for a party, not for every day. The lenses are lighter than I expected.",
      "The frame is a little crooked on my face. Fine once adjusted.",
    ],
    low: [
      "One arm snapped at the hinge within a month of normal use.",
      "The lenses scratch easily. A light wipe with my shirt left marks.",
      "They pinch behind the ears so much that I get a headache after half an hour.",
    ],
  },
};

/* More names than demo products, so the first reviews of any two products never share a name. */
const NAMES = [
  "Rohan P.", "Priya S.", "Hardik D.", "Neha J.", "Karan M.", "Ananya I.", "Vikram C.", "Pooja T.",
  "Arjun N.", "Meera P.", "Siddharth R.", "Kavya P.", "Nikhil S.", "Riya B.", "Aditya K.", "Sneha V.",
  "Jay T.", "Isha G.", "Manav B.", "Divya R.", "Kunal A.", "Tanvi M.", "Yash C.", "Nidhi D.",
  "Parth L.", "Bhavna K.", "Dhruv H.", "Aarti O.",
] as const;

function band(rating: number): Band {
  return rating >= 5 ? "five" : rating >= 4 ? "four" : rating >= 3 ? "mixed" : "low";
}

const KINDS = Object.fromEntries(
  (["mens-shoes", "mens-watches", "womens-watches", "fragrances", "sunglasses"] as const).map((category) => [
    category,
    DEMO_PRODUCTS.flatMap((product) => (product.source === "dummyjson" && product.dummy.category === category ? [product.slug] : [])),
  ]),
) as Record<DummyCategory, string[]>;
const ALL = Object.values(KINDS).flat();

/**
 * The text and reviewer for a product's nth demo review; the same inputs always give the same review.
 * Lines are picked by the product's place among products of its kind, so no two products share
 * their first five-star review (the ones the home page shows side by side).
 */
export function demoReview(category: DummyCategory, slug: string, rating: number, position: number): { body: string; authorName: string } {
  const lines = LINES[category][band(rating)];
  const ordinal = KINDS[category].indexOf(slug);
  if (ordinal < 0) throw new Error(`${slug} is not a DummyJSON demo product in ${category}`);
  const everyone = ALL.indexOf(slug);
  return { body: lines[(ordinal + position) % lines.length]!, authorName: NAMES[(everyone + position * 7) % NAMES.length]! };
}
