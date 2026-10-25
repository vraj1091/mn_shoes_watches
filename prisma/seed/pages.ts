/*
 * Policy and information pages. Store structure, not demo data: they are kept when demo data is
 * removed and the owner edits them in the admin. Business details still unknown are in brackets,
 * like the rest of the seed (DECISIONS.md 32). Figures match the seeded settings: free delivery
 * above ₹1,999, ₹99 below; COD fee ₹49; 7-day size exchange and returns.
 */

export type PageSeed = {
  slug: string;
  kind: "POLICY" | "ABOUT" | "CONTACT" | "FAQ" | "STANDARD";
  title: string;
  metaDescription: string;
  html: string;
  faqs?: { question: string; answer: string }[];
};

export const PAGES: PageSeed[] = [
  {
    slug: "shipping",
    kind: "POLICY",
    title: "Shipping policy",
    metaDescription: "Delivery times and charges for orders from MN Shoes & Watches, Kalol: free delivery above ₹1,999, cash on delivery available.",
    html: `<p>We ship across India from our shop in Kalol, Gandhinagar district, Gujarat. Orders placed before 2 pm on a working day are packed the same day; later orders are packed the next working day.</p>
<h2>Delivery times</h2>
<table><thead><tr><th>Where</th><th>Delivery after dispatch</th></tr></thead><tbody>
<tr><td>Kalol and Gandhinagar</td><td>1 day</td></tr>
<tr><td>Rest of Gujarat</td><td>1–2 days</td></tr>
<tr><td>Metro cities (Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, Kolkata, Pune)</td><td>2–4 days</td></tr>
<tr><td>Rest of India</td><td>3–6 days</td></tr>
<tr><td>North-East, Jammu and Kashmir, Ladakh, Andaman and Nicobar</td><td>5–8 days</td></tr>
</tbody></table>
<p>Enter your PIN code on any product page to see the expected delivery date before you order.</p>
<h2>Charges</h2>
<ul><li>Free delivery on orders of ₹1,999 or more.</li><li>₹99 on smaller orders.</li><li>Cash on delivery: ₹49 extra, for orders up to ₹50,000.</li></ul>
<h2>Tracking</h2>
<p>When your order ships we send the courier's tracking number by email and SMS. You can also track it on our <a href="/track">order tracking page</a> with your order number and phone number.</p>`,
  },
  {
    slug: "returns-and-exchanges",
    kind: "POLICY",
    title: "Returns and exchanges",
    metaDescription: "7-day size exchange and returns at MN Shoes & Watches: how to request one, what qualifies and when you get your money back.",
    html: `<p>If something does not fit or is not right, you can exchange it for another size or return it within 7 days of delivery.</p>
<h2>What qualifies</h2>
<ul><li>Unworn shoes, with the original box, tags and any shoe bags.</li><li>Watches with the protective film still on the case back and all links, if the bracelet has not been sized.</li><li>Accessories in their original packaging.</li></ul>
<h2>What cannot be returned</h2>
<ul><li>Perfumes and attars once the seal or cap has been opened, for hygiene reasons.</li><li>Watches with a bracelet shortened at your request.</li><li>Items damaged after delivery.</li></ul>
<h2>How to request</h2>
<p>Write to us at [shop email] or WhatsApp [WhatsApp number] with your order number and a photo of the item. We arrange a free pickup from your address, usually within 2 working days.</p>
<h2>Refunds</h2>
<p>Prepaid orders are refunded to the original payment method within 5–7 working days of the pickup reaching us. Cash-on-delivery orders are refunded to your bank account or UPI ID. Size exchanges ship as soon as the pickup is collected.</p>`,
  },
  {
    slug: "warranty",
    kind: "POLICY",
    title: "Warranty",
    metaDescription: "Warranty on watches, shoes and accessories from MN Shoes & Watches, and how to make a claim.",
    html: `<p>Every product page states its warranty. It covers manufacturing defects, not wear and tear, accidental damage or water damage beyond the stated water resistance.</p>
<h2>Watches</h2>
<p>Watches carry the maker's warranty, from 1 year on everyday quartz watches to 5 years on some automatic watches. Keep the warranty card that comes in the box; we stamp it with the date of purchase.</p>
<h2>Shoes and accessories</h2>
<p>Shoes are covered for 3 to 6 months against stitching and sole-bonding defects. Belts and wallets are covered for 6 months against buckle and stitching defects.</p>
<h2>How to claim</h2>
<p>Bring the item to our shop in Kalol, or write to [shop email] with your order number and photos. We repair, replace or refund, in that order, depending on the defect.</p>`,
  },
  {
    slug: "privacy",
    kind: "POLICY",
    title: "Privacy policy",
    metaDescription: "How MN Shoes & Watches collects, uses and protects your personal data.",
    html: `<p>This policy explains what personal data [Registered business name] ("we") collects when you shop at MN Shoes & Watches, why, and how you can control it. It follows the Digital Personal Data Protection Act, 2023.</p>
<h2>What we collect</h2>
<ul><li>Your name, phone number, email and delivery address, to deliver your order and contact you about it.</li><li>Your order history, to handle returns, warranty claims and your account.</li><li>Payment details are handled by our payment provider; we never see or store your card number.</li></ul>
<h2>What we do not do</h2>
<p>We do not sell your data. We share it only with the courier delivering your order and the payment provider processing your payment.</p>
<h2>Your choices</h2>
<p>You can ask us to correct or delete your data at any time by writing to [shop email]. Marketing emails and WhatsApp messages are sent only if you agree, and every message has a way to stop them.</p>
<h2>Grievance officer</h2>
<p>[Name], [shop email], [shop address].</p>`,
  },
  {
    slug: "terms",
    kind: "POLICY",
    title: "Terms of use",
    metaDescription: "Terms that apply when you shop at MN Shoes & Watches.",
    html: `<p>These terms apply when you browse or buy from MN Shoes & Watches, run by [Registered business name], [shop address], GSTIN [GSTIN].</p>
<h2>Prices and orders</h2>
<p>All prices are in Indian rupees and include GST. An order is confirmed when we send the confirmation email or SMS. If a price is shown wrongly because of an error, we will tell you before dispatch and you may cancel for a full refund.</p>
<h2>Stock</h2>
<p>We show stock as it stands, but a product can sell out between your order and our confirmation. If that happens we refund you in full the same day.</p>
<h2>Disputes</h2>
<p>These terms are governed by Indian law and the courts of Gandhinagar, Gujarat.</p>`,
  },
  {
    slug: "about",
    kind: "ABOUT",
    title: "About MN Shoes & Watches",
    metaDescription: "MN Shoes & Watches is a shoe, watch and perfume shop in Kalol, Gujarat, now delivering across India.",
    html: `<p>MN Shoes & Watches is a shop in Kalol, Gandhinagar district, Gujarat, selling men's shoes, watches for men and women, perfumes and attars, and the accessories that go with them.</p>
<p>We started as a single counter of formal shoes and watches. Customers kept asking for the same things: shoes that fit Indian feet, watches with honest water-resistance ratings, and perfumes that last through a wedding. That is still what we stock.</p>
<h2>What we promise</h2>
<ul><li>Prices that include GST, with nothing added at checkout except delivery below ₹1,999.</li><li>7-day size exchange, with free pickup.</li><li>Plain advice: every product page says what the product is, how it fits and how to care for it.</li></ul>
<p>Visit us at [shop address], open [opening hours].</p>`,
  },
  {
    slug: "contact",
    kind: "CONTACT",
    title: "Contact us",
    metaDescription: "Phone, WhatsApp, email and address for MN Shoes & Watches in Kalol, Gujarat.",
    html: `<p>We reply to messages within one working day, usually much sooner.</p>
<ul><li>Phone: [phone number]</li><li>WhatsApp: [WhatsApp number]</li><li>Email: [shop email]</li><li>Shop: [shop address], Kalol, Gandhinagar district, Gujarat [PIN code]</li></ul>
<p>For an order, please include your order number. You can also <a href="/track">track your order</a> yourself.</p>`,
  },
  {
    slug: "faq",
    kind: "FAQ",
    title: "Questions and answers",
    metaDescription: "Answers about delivery, cash on delivery, sizes, returns and warranty at MN Shoes & Watches.",
    html: `<p>The questions customers ask us most. Anything else: write to [shop email] or WhatsApp [WhatsApp number].</p>`,
    faqs: [
      { question: "Do you offer cash on delivery?", answer: "Yes, on orders up to ₹50,000, for an extra ₹49. You pay the courier in cash or by UPI when the parcel arrives." },
      { question: "How much is delivery?", answer: "Free on orders of ₹1,999 or more, and ₹99 below that. Enter your PIN code on a product page to see the delivery date." },
      { question: "Are Indian shoe sizes the same as UK sizes?", answer: "Yes. Indian sizes follow the UK system, so a UK 8 is an Indian 8. Each shoe page has a size guide with the foot length in centimetres." },
      { question: "Can I exchange shoes for another size?", answer: "Yes, within 7 days of delivery, if the shoes are unworn and in their box. We pick them up from your address free and ship the new size once they are collected." },
      { question: "Can a watch bracelet be shortened?", answer: "Yes. We remove links free at the shop, or a local watch repairer can do it in minutes. A shortened bracelet cannot be returned, so check the fit first." },
      { question: "Are the prices inclusive of GST?", answer: "Yes. Every price on the site includes GST, and your invoice shows the GST amount separately." },
    ],
  },
];
