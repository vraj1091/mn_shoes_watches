-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "phoneNumber" TEXT,
    "phoneNumberVerified" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "hasAccount" BOOLEAN NOT NULL DEFAULT false,
    "acceptsEmail" BOOLEAN NOT NULL DEFAULT false,
    "acceptsWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "razorpayCustomerId" TEXT,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "firstOrderAt" DATETIME,
    "lastOrderAt" DATETIME,
    "anonymizedAt" DATETIME,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Customer" ("acceptsEmail", "acceptsWhatsapp", "anonymizedAt", "createdAt", "email", "emailVerified", "firstOrderAt", "hasAccount", "id", "image", "lastOrderAt", "name", "orderCount", "phone", "phoneNumber", "phoneNumberVerified", "razorpayCustomerId", "storeId", "totalSpent", "updatedAt") SELECT "acceptsEmail", "acceptsWhatsapp", "anonymizedAt", "createdAt", "email", "emailVerified", "firstOrderAt", "hasAccount", "id", "image", "lastOrderAt", "name", "orderCount", "phone", "phoneNumber", "phoneNumberVerified", "razorpayCustomerId", "storeId", "totalSpent", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE UNIQUE INDEX "Customer_phoneNumber_key" ON "Customer"("phoneNumber");
CREATE INDEX "Customer_storeId_lastOrderAt_idx" ON "Customer"("storeId", "lastOrderAt");
CREATE INDEX "Customer_storeId_totalSpent_idx" ON "Customer"("storeId", "totalSpent");
CREATE INDEX "Customer_storeId_phone_idx" ON "Customer"("storeId", "phone");
CREATE TABLE "new_Brand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoId" TEXT,
    "bannerId" TEXT,
    "intro" TEXT,
    "description" JSONB,
    "descriptionHtml" TEXT,
    "countryOfOrigin" TEXT,
    "website" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "faqs" JSONB,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImageId" TEXT,
    "canonicalUrl" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "contentUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Brand_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Brand_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Brand_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Brand" ("bannerId", "canonicalUrl", "contentUpdatedAt", "countryOfOrigin", "createdAt", "description", "descriptionHtml", "faqs", "id", "intro", "isActive", "isFeatured", "logoId", "metaDescription", "metaTitle", "name", "noindex", "ogImageId", "position", "slug", "storeId", "updatedAt", "website") SELECT "bannerId", "canonicalUrl", "contentUpdatedAt", "countryOfOrigin", "createdAt", "description", "descriptionHtml", "faqs", "id", "intro", "isActive", "isFeatured", "logoId", "metaDescription", "metaTitle", "name", "noindex", "ogImageId", "position", "slug", "storeId", "updatedAt", "website" FROM "Brand";
DROP TABLE "Brand";
ALTER TABLE "new_Brand" RENAME TO "Brand";
CREATE UNIQUE INDEX "Brand_storeId_slug_key" ON "Brand"("storeId", "slug");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishAt" DATETIME,
    "publishedAt" DATETIME,
    "brandId" TEXT,
    "templateId" TEXT,
    "primaryCategoryId" TEXT,
    "gender" TEXT,
    "ageGroup" TEXT NOT NULL DEFAULT 'ADULT',
    "condition" TEXT NOT NULL DEFAULT 'NEW',
    "summary" TEXT,
    "description" JSONB,
    "descriptionHtml" TEXT,
    "highlights" JSONB,
    "specs" JSONB,
    "care" TEXT,
    "warranty" TEXT,
    "warrantyMonths" INTEGER,
    "taxClassId" TEXT,
    "hsnCode" TEXT,
    "sizeChartId" TEXT,
    "replacementProductId" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "isPlaceholderPhoto" BOOLEAN NOT NULL DEFAULT false,
    "videoUrl" TEXT,
    "badges" JSONB,
    "faqs" JSONB,
    "minPrice" INTEGER NOT NULL DEFAULT 0,
    "maxPrice" INTEGER NOT NULL DEFAULT 0,
    "maxDiscountBp" INTEGER NOT NULL DEFAULT 0,
    "inStock" BOOLEAN NOT NULL DEFAULT false,
    "bestsellerScore" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "searchText" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImageId" TEXT,
    "canonicalUrl" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "contentUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AttributeTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_taxClassId_fkey" FOREIGN KEY ("taxClassId") REFERENCES "TaxClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_sizeChartId_fkey" FOREIGN KEY ("sizeChartId") REFERENCES "SizeChart" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_replacementProductId_fkey" FOREIGN KEY ("replacementProductId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("ageGroup", "bestsellerScore", "brandId", "canonicalUrl", "care", "condition", "contentUpdatedAt", "createdAt", "description", "descriptionHtml", "faqs", "gender", "highlights", "hsnCode", "id", "inStock", "isFeatured", "maxDiscountBp", "maxPrice", "metaDescription", "metaTitle", "minPrice", "noindex", "ogImageId", "primaryCategoryId", "publishAt", "publishedAt", "ratingAvg", "ratingCount", "replacementProductId", "searchText", "sizeChartId", "slug", "specs", "status", "storeId", "summary", "taxClassId", "templateId", "title", "updatedAt", "warranty", "warrantyMonths") SELECT "ageGroup", "bestsellerScore", "brandId", "canonicalUrl", "care", "condition", "contentUpdatedAt", "createdAt", "description", "descriptionHtml", "faqs", "gender", "highlights", "hsnCode", "id", "inStock", "isFeatured", "maxDiscountBp", "maxPrice", "metaDescription", "metaTitle", "minPrice", "noindex", "ogImageId", "primaryCategoryId", "publishAt", "publishedAt", "ratingAvg", "ratingCount", "replacementProductId", "searchText", "sizeChartId", "slug", "specs", "status", "storeId", "summary", "taxClassId", "templateId", "title", "updatedAt", "warranty", "warrantyMonths" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_storeId_status_publishedAt_idx" ON "Product"("storeId", "status", "publishedAt");
CREATE INDEX "Product_storeId_status_minPrice_idx" ON "Product"("storeId", "status", "minPrice");
CREATE INDEX "Product_storeId_status_bestsellerScore_idx" ON "Product"("storeId", "status", "bestsellerScore");
CREATE INDEX "Product_storeId_brandId_idx" ON "Product"("storeId", "brandId");
CREATE UNIQUE INDEX "Product_storeId_slug_key" ON "Product"("storeId", "slug");
CREATE TABLE "new_Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'UPLOAD',
    "storage" TEXT,
    "key" TEXT,
    "externalUrl" TEXT,
    "externalId" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" INTEGER,
    "alt" TEXT,
    "caption" TEXT,
    "blurDataUrl" TEXT,
    "crop" JSONB,
    "renditions" JSONB,
    "checksum" TEXT,
    "originalName" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "posterId" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Media_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Media" ("alt", "blurDataUrl", "caption", "checksum", "createdAt", "crop", "durationSec", "externalId", "externalUrl", "height", "id", "key", "kind", "mimeType", "originalName", "posterId", "renditions", "sizeBytes", "source", "storage", "storeId", "updatedAt", "uploadedById", "width") SELECT "alt", "blurDataUrl", "caption", "checksum", "createdAt", "crop", "durationSec", "externalId", "externalUrl", "height", "id", "key", "kind", "mimeType", "originalName", "posterId", "renditions", "sizeBytes", "source", "storage", "storeId", "updatedAt", "uploadedById", "width" FROM "Media";
DROP TABLE "Media";
ALTER TABLE "new_Media" RENAME TO "Media";
CREATE INDEX "Media_storeId_kind_createdAt_idx" ON "Media"("storeId", "kind", "createdAt");
CREATE INDEX "Media_storeId_checksum_idx" ON "Media"("storeId", "checksum");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "number" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "customerId" TEXT,
    "cartId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" INTEGER NOT NULL,
    "discountTotal" INTEGER NOT NULL DEFAULT 0,
    "shippingTotal" INTEGER NOT NULL DEFAULT 0,
    "codFee" INTEGER NOT NULL DEFAULT 0,
    "taxTotal" INTEGER NOT NULL DEFAULT 0,
    "grandTotal" INTEGER NOT NULL,
    "amountRefunded" INTEGER NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "shippingMethod" TEXT,
    "deliveryMinDate" DATETIME,
    "deliveryMaxDate" DATETIME,
    "placeOfSupply" TEXT NOT NULL,
    "buyerGstin" TEXT,
    "customerNote" TEXT,
    "codVerifiedAt" DATETIME,
    "placedAt" DATETIME,
    "confirmedAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "deliveredAt" DATETIME,
    "reviewRequestSentAt" DATETIME,
    "idempotencyKey" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "attribution" JSONB,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("amountRefunded", "attribution", "buyerGstin", "cancelReason", "cancelledAt", "cartId", "codFee", "codVerifiedAt", "confirmedAt", "couponCode", "createdAt", "currency", "customerId", "customerNote", "deliveredAt", "deliveryMaxDate", "deliveryMinDate", "discountTotal", "email", "grandTotal", "id", "idempotencyKey", "ipAddress", "number", "paymentMethod", "paymentStatus", "phone", "placeOfSupply", "placedAt", "publicToken", "reviewRequestSentAt", "shippingMethod", "shippingTotal", "source", "status", "storeId", "subtotal", "taxTotal", "updatedAt", "userAgent") SELECT "amountRefunded", "attribution", "buyerGstin", "cancelReason", "cancelledAt", "cartId", "codFee", "codVerifiedAt", "confirmedAt", "couponCode", "createdAt", "currency", "customerId", "customerNote", "deliveredAt", "deliveryMaxDate", "deliveryMinDate", "discountTotal", "email", "grandTotal", "id", "idempotencyKey", "ipAddress", "number", "paymentMethod", "paymentStatus", "phone", "placeOfSupply", "placedAt", "publicToken", "reviewRequestSentAt", "shippingMethod", "shippingTotal", "source", "status", "storeId", "subtotal", "taxTotal", "updatedAt", "userAgent" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_storeId_status_createdAt_idx" ON "Order"("storeId", "status", "createdAt");
CREATE INDEX "Order_storeId_placedAt_idx" ON "Order"("storeId", "placedAt");
CREATE INDEX "Order_storeId_phone_idx" ON "Order"("storeId", "phone");
CREATE INDEX "Order_storeId_email_idx" ON "Order"("storeId", "email");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE UNIQUE INDEX "Order_storeId_number_key" ON "Order"("storeId", "number");
CREATE TABLE "new_Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "maxDiscount" INTEGER,
    "minOrderValue" INTEGER,
    "minQuantity" INTEGER,
    "buyQuantity" INTEGER,
    "getQuantity" INTEGER,
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "usageLimit" INTEGER,
    "perCustomerLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "firstOrderOnly" BOOLEAN NOT NULL DEFAULT false,
    "prepaidOnly" BOOLEAN NOT NULL DEFAULT false,
    "combinable" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publicLabel" TEXT,
    "showOnProductPage" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Discount" ("buyQuantity", "code", "combinable", "createdAt", "endsAt", "firstOrderOnly", "getQuantity", "id", "isActive", "maxDiscount", "minOrderValue", "minQuantity", "perCustomerLimit", "prepaidOnly", "publicLabel", "scope", "showOnProductPage", "startsAt", "storeId", "title", "type", "updatedAt", "usageCount", "usageLimit", "value") SELECT "buyQuantity", "code", "combinable", "createdAt", "endsAt", "firstOrderOnly", "getQuantity", "id", "isActive", "maxDiscount", "minOrderValue", "minQuantity", "perCustomerLimit", "prepaidOnly", "publicLabel", "scope", "showOnProductPage", "startsAt", "storeId", "title", "type", "updatedAt", "usageCount", "usageLimit", "value" FROM "Discount";
DROP TABLE "Discount";
ALTER TABLE "new_Discount" RENAME TO "Discount";
CREATE INDEX "Discount_storeId_isActive_startsAt_idx" ON "Discount"("storeId", "isActive", "startsAt");
CREATE UNIQUE INDEX "Discount_storeId_code_key" ON "Discount"("storeId", "code");
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "productId" TEXT NOT NULL,
    "customerId" TEXT,
    "orderItemId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorCity" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "fit" TEXT,
    "isVerifiedBuyer" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reply" TEXT,
    "repliedAt" DATETIME,
    "repliedById" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("authorCity", "authorName", "body", "createdAt", "customerId", "fit", "helpfulCount", "id", "isFeatured", "isVerifiedBuyer", "orderItemId", "productId", "publishedAt", "rating", "repliedAt", "repliedById", "reply", "status", "storeId", "title", "updatedAt") SELECT "authorCity", "authorName", "body", "createdAt", "customerId", "fit", "helpfulCount", "id", "isFeatured", "isVerifiedBuyer", "orderItemId", "productId", "publishedAt", "rating", "repliedAt", "repliedById", "reply", "status", "storeId", "title", "updatedAt" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");
CREATE INDEX "Review_productId_status_publishedAt_idx" ON "Review"("productId", "status", "publishedAt");
CREATE INDEX "Review_storeId_status_createdAt_idx" ON "Review"("storeId", "status", "createdAt");
CREATE TABLE "new_Banner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "placement" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "desktopImageId" TEXT,
    "mobileImageId" TEXT,
    "videoId" TEXT,
    "textTone" TEXT NOT NULL DEFAULT 'DARK',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Banner_desktopImageId_fkey" FOREIGN KEY ("desktopImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Banner_mobileImageId_fkey" FOREIGN KEY ("mobileImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Banner_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Banner" ("createdAt", "ctaHref", "ctaLabel", "desktopImageId", "endsAt", "id", "isActive", "mobileImageId", "placement", "position", "startsAt", "storeId", "subtitle", "textTone", "title", "updatedAt", "videoId") SELECT "createdAt", "ctaHref", "ctaLabel", "desktopImageId", "endsAt", "id", "isActive", "mobileImageId", "placement", "position", "startsAt", "storeId", "subtitle", "textTone", "title", "updatedAt", "videoId" FROM "Banner";
DROP TABLE "Banner";
ALTER TABLE "new_Banner" RENAME TO "Banner";
CREATE INDEX "Banner_storeId_placement_position_idx" ON "Banner"("storeId", "placement", "position");
CREATE TABLE "new_Author" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "jobTitle" TEXT,
    "bio" TEXT,
    "avatarId" TEXT,
    "sameAs" JSONB,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Author_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Author" ("avatarId", "bio", "id", "jobTitle", "name", "sameAs", "slug", "storeId") SELECT "avatarId", "bio", "id", "jobTitle", "name", "sameAs", "slug", "storeId" FROM "Author";
DROP TABLE "Author";
ALTER TABLE "new_Author" RENAME TO "Author";
CREATE UNIQUE INDEX "Author_storeId_slug_key" ON "Author"("storeId", "slug");
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" JSONB,
    "contentHtml" TEXT,
    "coverId" TEXT,
    "authorId" TEXT NOT NULL,
    "topicId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "readingMinutes" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "faqs" JSONB,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImageId" TEXT,
    "canonicalUrl" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "contentUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Post_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "PostTopic" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Post_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "canonicalUrl", "content", "contentHtml", "contentUpdatedAt", "coverId", "createdAt", "excerpt", "faqs", "id", "metaDescription", "metaTitle", "noindex", "ogImageId", "publishedAt", "readingMinutes", "slug", "status", "storeId", "title", "topicId", "updatedAt") SELECT "authorId", "canonicalUrl", "content", "contentHtml", "contentUpdatedAt", "coverId", "createdAt", "excerpt", "faqs", "id", "metaDescription", "metaTitle", "noindex", "ogImageId", "publishedAt", "readingMinutes", "slug", "status", "storeId", "title", "topicId", "updatedAt" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE INDEX "Post_storeId_status_publishedAt_idx" ON "Post"("storeId", "status", "publishedAt");
CREATE UNIQUE INDEX "Post_storeId_slug_key" ON "Post"("storeId", "slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

