/*
 * Demo content besides products: home hero banners, customers, orders in every status over the
 * last 14 days, coupons and Journal buying guides. All of it is created with isDemo: true.
 * Customer emails use example.com, which is reserved for examples and never delivers mail.
 */

export const DEMO_BANNERS = [
  {
    title: "Automatic watches that wind themselves",
    subtitle: "Rolex, Longines and IWC, with the maker's warranty. Free delivery, and COD up to ₹50,000.",
    ctaLabel: "Shop automatic watches",
    ctaHref: "/watches/men/automatic",
    productSlug: "rolex-submariner-date-two-tone",
  },
  {
    title: "Sneakers for every day",
    subtitle: "Nike, Puma and Off-White in UK sizes 6 to 11, with a 7-day size exchange.",
    ctaLabel: "Shop sneakers",
    ctaHref: "/mens-shoes/casual/sneakers",
    productSlug: "air-jordan-1-high-red-white-black",
  },
  {
    title: "Perfumes that last the evening",
    subtitle: "Eau de parfum from Chanel, Dior and Gucci, and attars from Kannauj.",
    ctaLabel: "Shop perfumes",
    ctaHref: "/perfumes",
    productSlug: "chanel-coco-noir-edp-100ml",
  },
] as const;

export type DemoAddress = { name: string; phone: string; line1: string; line2?: string; city: string; state: string; stateCode: string; pinCode: string };

export const DEMO_CUSTOMERS: { name: string; email: string; phone: string; address: DemoAddress }[] = [
  {
    name: "Priya Shah",
    email: "priya.shah@example.com",
    phone: "+919876500001",
    address: { name: "Priya Shah", phone: "+919876500001", line1: "B-402, Shanti Residency", line2: "Satellite Road", city: "Ahmedabad", state: "Gujarat", stateCode: "24", pinCode: "380015" },
  },
  {
    name: "Rohan Mehta",
    email: "rohan.mehta@example.com",
    phone: "+919876500002",
    address: { name: "Rohan Mehta", phone: "+919876500002", line1: "12, Sea Breeze Apartments", line2: "Bandra West", city: "Mumbai", state: "Maharashtra", stateCode: "27", pinCode: "400050" },
  },
  {
    name: "Aarav Patel",
    email: "aarav.patel@example.com",
    phone: "+919876500003",
    address: { name: "Aarav Patel", phone: "+919876500003", line1: "7, Sardar Society", line2: "Near Railway Station", city: "Kalol", state: "Gujarat", stateCode: "24", pinCode: "382721" },
  },
  {
    name: "Neha Iyer",
    email: "neha.iyer@example.com",
    phone: "+919876500004",
    address: { name: "Neha Iyer", phone: "+919876500004", line1: "45, 2nd Cross, Indiranagar", city: "Bengaluru", state: "Karnataka", stateCode: "29", pinCode: "560038" },
  },
];

type OrderStatus =
  | "PENDING_PAYMENT"
  | "AWAITING_COD_CONFIRMATION"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED_TO_ORIGIN";

export type DemoOrder = {
  number: string;
  customer: number; // index into DEMO_CUSTOMERS
  daysAgo: number;
  status: OrderStatus;
  payment: "PREPAID" | "COD";
  /** [product slug, variant index] */
  items: [string, number][];
  coupon?: "WELCOME10" | "FLAT500";
  note?: string;
};

/** Ten orders covering every status, newest first. Demo order numbers start with MND. */
export const DEMO_ORDERS: DemoOrder[] = [
  { number: "MND1001", customer: 0, daysAgo: 0, status: "PENDING_PAYMENT", payment: "PREPAID", items: [["dior-jadore-edp-100ml", 0]] },
  { number: "MND1002", customer: 2, daysAgo: 0, status: "AWAITING_COD_CONFIRMATION", payment: "COD", items: [["handstitched-kolhapuri-chappal", 3], ["mitti-attar", 0]] },
  { number: "MND1003", customer: 3, daysAgo: 1, status: "CONFIRMED", payment: "PREPAID", items: [["aurelle-gold-tone-blue-dial-watch", 0]], coupon: "WELCOME10" },
  { number: "MND1004", customer: 1, daysAgo: 2, status: "PACKED", payment: "COD", items: [["puma-future-rider-yellow-blue", 3]] },
  { number: "MND1005", customer: 0, daysAgo: 4, status: "SHIPPED", payment: "PREPAID", items: [["air-jordan-1-high-red-white-black", 3], ["solaris-hexagonal-aviator-black-green", 0]], coupon: "FLAT500" },
  { number: "MND1006", customer: 2, daysAgo: 5, status: "OUT_FOR_DELIVERY", payment: "COD", items: [["calvin-klein-ck-one-edt-100ml", 0]] },
  { number: "MND1007", customer: 3, daysAgo: 8, status: "DELIVERED", payment: "PREPAID", items: [["heritage-time-moonphase-chronograph-gold", 0], ["leather-watch-strap-tan", 1]] },
  { number: "MND1008", customer: 1, daysAgo: 10, status: "DELIVERED", payment: "COD", items: [["kensington-plain-toe-oxford", 3], ["formal-leather-belt-black-30mm", 1]] },
  { number: "MND1009", customer: 0, daysAgo: 12, status: "CANCELLED", payment: "PREPAID", items: [["chanel-coco-noir-edp-100ml", 0]], note: "Customer ordered the wrong size bottle and asked to cancel." },
  { number: "MND1010", customer: 2, daysAgo: 14, status: "RETURNED_TO_ORIGIN", payment: "COD", items: [["off-white-arrow-low-sneaker-white-red", 2]], note: "Courier could not reach the customer after three attempts." },
];

export const DEMO_COUPONS = [
  {
    code: "WELCOME10",
    title: "Welcome 10% off",
    type: "PERCENT" as const,
    value: 10_00, // basis points
    minOrderValue: 999_00,
    publicLabel: "10% off orders above ₹999 with code WELCOME10",
  },
  {
    code: "FLAT500",
    title: "Flat ₹500 off",
    type: "FLAT" as const,
    value: 500_00, // paise
    minOrderValue: 4_999_00,
    publicLabel: "₹500 off orders above ₹4,999 with code FLAT500",
  },
];

export const DEMO_AUTHOR = { name: "MN Shoes & Watches team", slug: "mn-team", jobTitle: "Shop staff, Kalol" };

export const DEMO_POSTS: {
  slug: string;
  title: string;
  excerpt: string;
  readingMinutes: number;
  daysAgo: number;
  coverProductSlug: string;
  html: string;
}[] = [
  {
    slug: "watch-size-for-your-wrist",
    title: "How to choose a watch size for your wrist",
    excerpt: "Measure your wrist, then match it to a case diameter. A table for men's and women's wrists, plus the two other measurements that matter.",
    readingMinutes: 4,
    daysAgo: 6,
    coverProductSlug: "rolex-datejust-41-two-tone-grey",
    html: `<p>Watch size means the diameter of the case, measured across the dial without the crown, in millimetres. The right size depends mostly on your wrist, so start there.</p>
<h2>1. Measure your wrist</h2>
<p>Wrap a soft tape measure, or a strip of paper you then lay against a ruler, around your wrist just below the wrist bone. Most adult men in India measure 16–18 cm; most women 14–16 cm.</p>
<h2>2. Match it to a case size</h2>
<table><thead><tr><th>Wrist</th><th>Case diameter</th></tr></thead><tbody>
<tr><td>Under 15 cm</td><td>26–34 mm</td></tr>
<tr><td>15–16.5 cm</td><td>34–38 mm</td></tr>
<tr><td>16.5–18 cm</td><td>38–42 mm</td></tr>
<tr><td>18–19.5 cm</td><td>40–44 mm</td></tr>
<tr><td>Over 19.5 cm</td><td>42–46 mm</td></tr>
</tbody></table>
<p>Dress watches look right at the small end of the range; sports and dive watches at the large end.</p>
<h2>3. Check lug-to-lug length</h2>
<p>Lug-to-lug is the length from the top strap end to the bottom one. If it is longer than the flat top of your wrist, the lugs hang over the edges and the watch looks too big, even when the diameter is right. As a rule, keep it under 48 mm on a 16 cm wrist.</p>
<h2>4. Mind the thickness</h2>
<p>A watch under 10 mm thick slides under a shirt cuff. Automatic and chronograph watches are usually 11–14 mm, which suits a casual sleeve better.</p>
<p>Every watch page in our shop shows the dial drawn to scale on a 16–17 cm wrist. Or visit us in Kalol and try a few on: it takes two minutes to see the difference.</p>`,
  },
  {
    slug: "edp-vs-edt-vs-attar",
    title: "EDP, EDT or attar: what is the difference?",
    excerpt: "The difference is how much fragrance oil each holds, which decides how long it lasts. Which to choose for Indian weather, the office and weddings.",
    readingMinutes: 4,
    daysAgo: 13,
    coverProductSlug: "chanel-coco-noir-edp-100ml",
    html: `<p>Eau de parfum (EDP), eau de toilette (EDT) and attar differ mainly in strength: how much fragrance oil is in the bottle. More oil means the scent lasts longer and stays closer to the skin.</p>
<table><thead><tr><th>Type</th><th>Fragrance oil</th><th>Lasts on skin</th></tr></thead><tbody>
<tr><td>Parfum</td><td>20–30%</td><td>8–12 hours</td></tr>
<tr><td>Eau de parfum (EDP)</td><td>15–20%</td><td>6–8 hours</td></tr>
<tr><td>Eau de toilette (EDT)</td><td>5–15%</td><td>3–5 hours</td></tr>
<tr><td>Attar</td><td>Pure oil, no alcohol</td><td>6–12 hours</td></tr>
</tbody></table>
<h2>Eau de toilette</h2>
<p>Light and fresh, often citrus or green. A good choice for hot afternoons, college and the office, where a strong scent can bother people near you. Reapply after lunch if you want it to last.</p>
<h2>Eau de parfum</h2>
<p>Richer and longer-lasting. Two or three sprays in the morning carry through a working day, or an evening function. Suits the cooler months and air-conditioned spaces best.</p>
<h2>Attar</h2>
<p>A perfume oil distilled into sandalwood oil, with no alcohol, made in India for centuries, especially in Kannauj. A single drop on the wrist lasts most of the day, and because there is no alcohol it does not sting and is preferred by many for prayer.</p>
<h2>How to apply</h2>
<p>Spray or dab on pulse points: the neck, behind the ears and the inside of the wrists. Do not rub your wrists together; it heats the skin and wears off the top notes faster.</p>`,
  },
  {
    slug: "indian-shoe-size-chart",
    title: "Indian shoe size chart: UK, EU and US sizes explained",
    excerpt: "Indian sizes are UK sizes. A chart with EU, US and foot length in centimetres, how to measure your foot at home, and why sneakers sometimes run small.",
    readingMinutes: 3,
    daysAgo: 20,
    coverProductSlug: "air-jordan-1-high-red-white-black",
    html: `<p>Indian shoe sizes follow the UK system: a UK 8 is an Indian 8. Brands from Europe label EU sizes and American brands often label US sizes, which run one size higher than UK.</p>
<table><thead><tr><th>UK / India</th><th>EU</th><th>US</th><th>Foot length (cm)</th></tr></thead><tbody>
<tr><td>6</td><td>39</td><td>7</td><td>24.5</td></tr>
<tr><td>7</td><td>40–41</td><td>8</td><td>25.4</td></tr>
<tr><td>8</td><td>42</td><td>9</td><td>26.2</td></tr>
<tr><td>9</td><td>43</td><td>10</td><td>27.1</td></tr>
<tr><td>10</td><td>44</td><td>11</td><td>27.9</td></tr>
<tr><td>11</td><td>45</td><td>12</td><td>28.8</td></tr>
</tbody></table>
<h2>Measure your foot at home</h2>
<ol><li>Stand on a sheet of paper with your heel against a wall, wearing the socks you will wear with the shoes.</li><li>Mark the tip of your longest toe and measure from the wall to the mark.</li><li>Measure both feet in the evening, when they are largest, and use the longer one.</li><li>Choose the first size whose foot length is the same as or longer than yours.</li></ol>
<h2>Why sneakers sometimes feel small</h2>
<p>Many sneakers are cut narrow, and padded collars take up room. If your feet are wide, or you are between sizes, choose one size up in sneakers and your usual size in leather formal shoes, which stretch a little with wear.</p>
<p>Not sure? Order your usual size: our 7-day size exchange is free, with pickup from your address.</p>`,
  },
];
