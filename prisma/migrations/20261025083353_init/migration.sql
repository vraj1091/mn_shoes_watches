-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "storeId" TEXT NOT NULL PRIMARY KEY DEFAULT 'main',
    "storeName" TEXT NOT NULL,
    "legalName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "gstin" TEXT,
    "gstStateCode" TEXT NOT NULL DEFAULT '24',
    "foundedYear" INTEGER,
    "trustStats" JSONB,
    "socialLinks" JSONB,
    "logoId" TEXT,
    "logoDarkId" TEXT,
    "faviconId" TEXT,
    "defaultOgImageId" TEXT,
    "announcementEnabled" BOOLEAN NOT NULL DEFAULT false,
    "announcementText" TEXT,
    "announcementHref" TEXT,
    "announcementVersion" INTEGER NOT NULL DEFAULT 1,
    "freeShippingThreshold" INTEGER,
    "dispatchCutoffHour" INTEGER NOT NULL DEFAULT 14,
    "processingDays" INTEGER NOT NULL DEFAULT 1,
    "holidays" JSONB,
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "codFee" INTEGER NOT NULL DEFAULT 0,
    "codMinOrder" INTEGER,
    "codMaxOrder" INTEGER,
    "codVerifyAbove" INTEGER,
    "returnsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "exchangesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 7,
    "returnFeeType" TEXT NOT NULL DEFAULT 'FREE',
    "returnFee" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "reviewRequestDelayDays" INTEGER NOT NULL DEFAULT 5,
    "productTitleTemplate" TEXT,
    "productDescriptionTemplate" TEXT,
    "categoryTitleTemplate" TEXT,
    "crawlerRules" JSONB,
    "ga4MeasurementId" TEXT,
    "metaPixelId" TEXT,
    "googleSiteVerification" TEXT,
    "bingSiteVerification" TEXT,
    "webVitalsSampleRate" INTEGER NOT NULL DEFAULT 100,
    "emailFromName" TEXT,
    "emailFromAddress" TEXT,
    "emailReplyTo" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'MN',
    "invoiceFooter" TEXT,
    "privacyPolicyVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "StoreSettings_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StoreSettings_logoDarkId_fkey" FOREIGN KEY ("logoDarkId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StoreSettings_faviconId_fkey" FOREIGN KEY ("faviconId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StoreSettings_defaultOgImageId_fkey" FOREIGN KEY ("defaultOgImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "provider" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "publicConfig" JSONB,
    "secretCipher" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT
);

-- CreateTable
CREATE TABLE "StoreLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "state" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "openingHours" JSONB NOT NULL,
    "mapUrl" TEXT,
    "googlePlaceId" TEXT,
    "directions" TEXT,
    "intro" JSONB,
    "introHtml" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "contentUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StoreLocationPhoto" (
    "locationId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("locationId", "mediaId"),
    CONSTRAINT "StoreLocationPhoto_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StoreLocation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoreLocationPhoto_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ORDER_STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StaffSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StaffUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StaffUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StaffTwoFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "userId" TEXT NOT NULL,
    CONSTRAINT "StaffTwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "StaffUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerVerification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "customerId" TEXT NOT NULL,
    "label" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "customerId" TEXT NOT NULL,
    "staffId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerNote_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "hsnCode" TEXT NOT NULL,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxSlab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "taxClassId" TEXT NOT NULL,
    "maxUnitValue" INTEGER,
    "rateBp" INTEGER NOT NULL,
    CONSTRAINT "TaxSlab_taxClassId_fkey" FOREIGN KEY ("taxClassId") REFERENCES "TaxClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttributeTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TemplateAttribute" (
    "templateId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("templateId", "attributeId"),
    CONSTRAINT "TemplateAttribute_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AttributeTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TemplateAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attribute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unit" TEXT,
    "isVariantAxis" BOOLEAN NOT NULL DEFAULT false,
    "isFilterable" BOOLEAN NOT NULL DEFAULT true,
    "filterStyle" TEXT NOT NULL DEFAULT 'CHECKBOX',
    "helpText" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AttributeValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "swatchHex" TEXT,
    "sortKey" REAL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showInMenu" BOOLEAN NOT NULL DEFAULT true,
    "intro" TEXT,
    "buyingGuide" JSONB,
    "buyingGuideHtml" TEXT,
    "faqs" JSONB,
    "imageId" TEXT,
    "bannerId" TEXT,
    "attributeTemplateId" TEXT,
    "taxClassId" TEXT,
    "sizeChartId" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImageId" TEXT,
    "canonicalUrl" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "contentUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Category_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Category_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Category_attributeTemplateId_fkey" FOREIGN KEY ("attributeTemplateId") REFERENCES "AttributeTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Category_taxClassId_fkey" FOREIGN KEY ("taxClassId") REFERENCES "TaxClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Category_sizeChartId_fkey" FOREIGN KEY ("sizeChartId") REFERENCES "SizeChart" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Category_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryFilter" (
    "categoryId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("categoryId", "attributeId"),
    CONSTRAINT "CategoryFilter_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategoryFilter_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Brand" (
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

-- CreateTable
CREATE TABLE "SizeChart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "table" JSONB NOT NULL,
    "howToMeasure" JSONB,
    "howToMeasureHtml" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
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

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "gtin" TEXT,
    "mpn" TEXT,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "compareAtPrice" INTEGER,
    "costPrice" INTEGER,
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER,
    "weightGrams" INTEGER,
    "lengthCm" INTEGER,
    "breadthCm" INTEGER,
    "heightCm" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VariantOptionValue" (
    "variantId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "valueId" TEXT NOT NULL,

    PRIMARY KEY ("variantId", "optionId"),
    CONSTRAINT "VariantOptionValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VariantOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VariantOptionValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "AttributeValue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "valueId" TEXT,
    "numberValue" REAL,
    "textValue" TEXT,
    CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductAttributeValue_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "AttributeValue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "productId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'GALLERY',
    "position" INTEGER NOT NULL DEFAULT 0,
    "optionValueId" TEXT,
    CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductMedia_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "AttributeValue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryProduct" (
    "categoryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("categoryId", "productId"),
    CONSTRAINT "CategoryProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategoryProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("productId", "tagId"),
    CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductRelation" (
    "productId" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("productId", "relatedId", "type"),
    CONSTRAINT "ProductRelation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductRelation_relatedId_fkey" FOREIGN KEY ("relatedId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
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
    "posterId" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Media_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "mediaId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    CONSTRAINT "MediaUsage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MANUAL',
    "rules" JSONB,
    "matchAll" BOOLEAN NOT NULL DEFAULT true,
    "landingPath" TEXT,
    "isGiftGuide" BOOLEAN NOT NULL DEFAULT false,
    "defaultSort" TEXT NOT NULL DEFAULT 'FEATURED',
    "intro" TEXT,
    "description" JSONB,
    "descriptionHtml" TEXT,
    "imageId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "faqs" JSONB,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImageId" TEXT,
    "canonicalUrl" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "contentUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Collection_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Collection_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionProduct" (
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("collectionId", "productId"),
    CONSTRAINT "CollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchSynonym" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "term" TEXT NOT NULL,
    "synonym" TEXT NOT NULL,
    "twoWay" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "SearchTerm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "term" TEXT NOT NULL,
    "searches" INTEGER NOT NULL DEFAULT 0,
    "lastResultCount" INTEGER NOT NULL DEFAULT 0,
    "lastSearchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "variantId" TEXT NOT NULL,
    "cartId" TEXT,
    "orderId" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockReservation_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "variantId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" TEXT,
    "returnId" TEXT,
    "note" TEXT,
    "staffId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackInStockRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "variantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackInStockRequest_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "tokenHash" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "email" TEXT,
    "phone" TEXT,
    "couponCode" TEXT,
    "pinCode" TEXT,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminder1SentAt" DATETIME,
    "reminder2SentAt" DATETIME,
    "recoveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "cartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "savedForLater" BOOLEAN NOT NULL DEFAULT false,
    "unitPriceSeen" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "customerId" TEXT,
    "guestTokenHash" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishlistItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WishlistItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderAddress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "pinCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    CONSTRAINT "OrderAddress_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "productTitle" TEXT NOT NULL,
    "variantTitle" TEXT,
    "brandName" TEXT,
    "sku" TEXT NOT NULL,
    "imageKey" TEXT,
    "hsnCode" TEXT NOT NULL,
    "gstRateBp" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "compareAtPrice" INTEGER,
    "quantity" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" INTEGER NOT NULL,
    "taxableValue" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL,
    "quantityReturned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "actor" TEXT NOT NULL,
    "staffId" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderEvent_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "method" TEXT,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "errorReason" TEXT,
    "raw" JSONB,
    "capturedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "returnId" TEXT,
    "providerRefundId" TEXT,
    "method" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "staffId" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Refund_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "orderId" TEXT NOT NULL,
    "returnId" TEXT,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL,
    "sellerGstin" TEXT,
    "buyerGstin" TEXT,
    "placeOfSupply" TEXT NOT NULL,
    "taxableTotal" INTEGER NOT NULL,
    "cgstTotal" INTEGER NOT NULL DEFAULT 0,
    "sgstTotal" INTEGER NOT NULL DEFAULT 0,
    "igstTotal" INTEGER NOT NULL DEFAULT 0,
    "grandTotal" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Counter" (
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "key" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("storeId", "key")
);

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "stateCodes" JSONB NOT NULL,
    "pinPrefixes" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "zoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FLAT',
    "price" INTEGER NOT NULL,
    "pricePerKg" INTEGER,
    "minOrderValue" INTEGER,
    "maxOrderValue" INTEGER,
    "freeAbove" INTEGER,
    "minDays" INTEGER NOT NULL,
    "maxDays" INTEGER NOT NULL,
    "codAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ShippingRate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PinCodeRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "pattern" TEXT NOT NULL,
    "isServiceable" BOOLEAN NOT NULL DEFAULT true,
    "codAllowed" BOOLEAN NOT NULL DEFAULT true,
    "extraDays" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PinCode" (
    "pin" TEXT NOT NULL PRIMARY KEY,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "orderId" TEXT NOT NULL,
    "returnId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'FORWARD',
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerShipmentId" TEXT,
    "awb" TEXT,
    "courierName" TEXT,
    "trackingUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "weightGrams" INTEGER,
    "lengthCm" INTEGER,
    "breadthCm" INTEGER,
    "heightCm" INTEGER,
    "labelUrl" TEXT,
    "manifestUrl" TEXT,
    "expectedDeliveryAt" DATETIME,
    "pickedUpAt" DATETIME,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Shipment_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "shipmentId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    PRIMARY KEY ("shipmentId", "orderItemId"),
    CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShipmentItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "shipmentId" TEXT NOT NULL,
    "status" TEXT,
    "rawStatus" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "number" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT NOT NULL,
    "comment" TEXT,
    "refundMethod" TEXT,
    "refundUpiId" TEXT,
    "refundAmount" INTEGER,
    "exchangeOrderId" TEXT,
    "decisionNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "receivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReturnRequest_exchangeOrderId_fkey" FOREIGN KEY ("exchangeOrderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "returnId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "exchangeVariantId" TEXT,
    "restocked" BOOLEAN NOT NULL DEFAULT false,
    "conditionNote" TEXT,
    CONSTRAINT "ReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnItem_exchangeVariantId_fkey" FOREIGN KEY ("exchangeVariantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReturnPhoto" (
    "returnId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("returnId", "mediaId"),
    CONSTRAINT "ReturnPhoto_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReturnPhoto_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Discount" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiscountTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discountId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'QUALIFYING',
    "productId" TEXT,
    "categoryId" TEXT,
    "collectionId" TEXT,
    "brandId" TEXT,
    CONSTRAINT "DiscountTarget_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscountTarget_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscountTarget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscountTarget_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscountTarget_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiscountRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "discountId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscountRedemption_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscountRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiscountRedemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
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
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewPhoto" (
    "reviewId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("reviewId", "mediaId"),
    CONSTRAINT "ReviewPhoto_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewPhoto_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "productId" TEXT NOT NULL,
    "customerId" TEXT,
    "authorName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredById" TEXT,
    "answeredAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductQuestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductQuestion_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "type" TEXT NOT NULL,
    "title" TEXT,
    "settings" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Banner" (
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

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "kind" TEXT NOT NULL DEFAULT 'STANDARD',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "contentHtml" TEXT,
    "faqs" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" DATETIME,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImageId" TEXT,
    "canonicalUrl" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "contentUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Page_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "jobTitle" TEXT,
    "bio" TEXT,
    "avatarId" TEXT,
    "sameAs" JSONB,
    CONSTRAINT "Author_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostTopic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Post" (
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

-- CreateTable
CREATE TABLE "PostProduct" (
    "postId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    PRIMARY KEY ("postId", "productId"),
    CONSTRAINT "PostProduct_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PostCategory" (
    "postId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    PRIMARY KEY ("postId", "categoryId"),
    CONSTRAINT "PostCategory_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PostCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "menuId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "targetId" TEXT,
    "url" TEXT,
    "imageId" TEXT,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItem_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "hits" INTEGER NOT NULL DEFAULT 0,
    "lastHitAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeoIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "key" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "subject" TEXT,
    "preheader" TEXT,
    "intro" TEXT,
    "providerTemplateName" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "channel" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT,
    "providerMessageId" TEXT,
    "error" TEXT,
    "orderId" TEXT,
    "customerId" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "runAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockedAt" DATETIME,
    "lastError" TEXT,
    "dedupeKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBSCRIBED',
    "source" TEXT,
    "consentedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "visitorId" TEXT NOT NULL,
    "customerId" TEXT,
    "analytics" BOOLEAN NOT NULL,
    "marketing" BOOLEAN NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "fileKey" TEXT,
    "handledById" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "DataRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "staffId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "staffId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "data" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdminDraft_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "WebVital" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "rating" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_domain_key" ON "Store"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_storeId_provider_key" ON "Integration"("storeId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "StoreLocation_storeId_slug_key" ON "StoreLocation"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSession_token_key" ON "StaffSession"("token");

-- CreateIndex
CREATE INDEX "StaffSession_userId_idx" ON "StaffSession"("userId");

-- CreateIndex
CREATE INDEX "StaffAccount_userId_idx" ON "StaffAccount"("userId");

-- CreateIndex
CREATE INDEX "StaffVerification_identifier_idx" ON "StaffVerification"("identifier");

-- CreateIndex
CREATE INDEX "StaffTwoFactor_userId_idx" ON "StaffTwoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phoneNumber_key" ON "Customer"("phoneNumber");

-- CreateIndex
CREATE INDEX "Customer_storeId_lastOrderAt_idx" ON "Customer"("storeId", "lastOrderAt");

-- CreateIndex
CREATE INDEX "Customer_storeId_totalSpent_idx" ON "Customer"("storeId", "totalSpent");

-- CreateIndex
CREATE INDEX "Customer_storeId_phone_idx" ON "Customer"("storeId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_token_key" ON "CustomerSession"("token");

-- CreateIndex
CREATE INDEX "CustomerSession_userId_idx" ON "CustomerSession"("userId");

-- CreateIndex
CREATE INDEX "CustomerAccount_userId_idx" ON "CustomerAccount"("userId");

-- CreateIndex
CREATE INDEX "CustomerVerification_identifier_idx" ON "CustomerVerification"("identifier");

-- CreateIndex
CREATE INDEX "CustomerAddress_customerId_idx" ON "CustomerAddress"("customerId");

-- CreateIndex
CREATE INDEX "CustomerNote_customerId_createdAt_idx" ON "CustomerNote"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaxClass_storeId_name_key" ON "TaxClass"("storeId", "name");

-- CreateIndex
CREATE INDEX "TaxSlab_taxClassId_idx" ON "TaxSlab"("taxClassId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeTemplate_storeId_code_key" ON "AttributeTemplate"("storeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_storeId_code_key" ON "Attribute"("storeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeValue_attributeId_slug_key" ON "AttributeValue"("attributeId", "slug");

-- CreateIndex
CREATE INDEX "Category_storeId_parentId_position_idx" ON "Category"("storeId", "parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Category_storeId_path_key" ON "Category"("storeId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_storeId_slug_key" ON "Brand"("storeId", "slug");

-- CreateIndex
CREATE INDEX "Product_storeId_status_publishedAt_idx" ON "Product"("storeId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Product_storeId_status_minPrice_idx" ON "Product"("storeId", "status", "minPrice");

-- CreateIndex
CREATE INDEX "Product_storeId_status_bestsellerScore_idx" ON "Product"("storeId", "status", "bestsellerScore");

-- CreateIndex
CREATE INDEX "Product_storeId_brandId_idx" ON "Product"("storeId", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_slug_key" ON "Product"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_productId_attributeId_key" ON "ProductOption"("productId", "attributeId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_position_idx" ON "ProductVariant"("productId", "position");

-- CreateIndex
CREATE INDEX "ProductVariant_storeId_gtin_idx" ON "ProductVariant"("storeId", "gtin");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_storeId_sku_key" ON "ProductVariant"("storeId", "sku");

-- CreateIndex
CREATE INDEX "VariantOptionValue_valueId_idx" ON "VariantOptionValue"("valueId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_productId_idx" ON "ProductAttributeValue"("productId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_valueId_idx" ON "ProductAttributeValue"("attributeId", "valueId");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_numberValue_idx" ON "ProductAttributeValue"("attributeId", "numberValue");

-- CreateIndex
CREATE INDEX "ProductMedia_productId_role_position_idx" ON "ProductMedia"("productId", "role", "position");

-- CreateIndex
CREATE INDEX "CategoryProduct_productId_idx" ON "CategoryProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_storeId_slug_key" ON "Tag"("storeId", "slug");

-- CreateIndex
CREATE INDEX "ProductTag_tagId_idx" ON "ProductTag"("tagId");

-- CreateIndex
CREATE INDEX "ProductRelation_relatedId_idx" ON "ProductRelation"("relatedId");

-- CreateIndex
CREATE INDEX "Media_storeId_kind_createdAt_idx" ON "Media"("storeId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "Media_storeId_checksum_idx" ON "Media"("storeId", "checksum");

-- CreateIndex
CREATE INDEX "MediaUsage_entityType_entityId_idx" ON "MediaUsage"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_mediaId_entityType_entityId_field_key" ON "MediaUsage"("mediaId", "entityType", "entityId", "field");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_storeId_slug_key" ON "Collection"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_storeId_landingPath_key" ON "Collection"("storeId", "landingPath");

-- CreateIndex
CREATE INDEX "CollectionProduct_productId_idx" ON "CollectionProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchSynonym_storeId_term_synonym_key" ON "SearchSynonym"("storeId", "term", "synonym");

-- CreateIndex
CREATE INDEX "SearchTerm_storeId_searches_idx" ON "SearchTerm"("storeId", "searches");

-- CreateIndex
CREATE UNIQUE INDEX "SearchTerm_storeId_term_key" ON "SearchTerm"("storeId", "term");

-- CreateIndex
CREATE INDEX "StockReservation_variantId_status_expiresAt_idx" ON "StockReservation"("variantId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "StockReservation_cartId_idx" ON "StockReservation"("cartId");

-- CreateIndex
CREATE INDEX "StockReservation_orderId_idx" ON "StockReservation"("orderId");

-- CreateIndex
CREATE INDEX "StockMovement_variantId_createdAt_idx" ON "StockMovement"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "BackInStockRequest_variantId_notifiedAt_idx" ON "BackInStockRequest"("variantId", "notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BackInStockRequest_variantId_email_key" ON "BackInStockRequest"("variantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_tokenHash_key" ON "Cart"("tokenHash");

-- CreateIndex
CREATE INDEX "Cart_storeId_status_lastActivityAt_idx" ON "Cart"("storeId", "status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Cart_customerId_idx" ON "Cart"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_variantId_key" ON "CartItem"("cartId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_storeId_customerId_productId_key" ON "WishlistItem"("storeId", "customerId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_storeId_guestTokenHash_productId_key" ON "WishlistItem"("storeId", "guestTokenHash", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_storeId_status_createdAt_idx" ON "Order"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_storeId_placedAt_idx" ON "Order"("storeId", "placedAt");

-- CreateIndex
CREATE INDEX "Order_storeId_phone_idx" ON "Order"("storeId", "phone");

-- CreateIndex
CREATE INDEX "Order_storeId_email_idx" ON "Order"("storeId", "email");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_storeId_number_key" ON "Order"("storeId", "number");

-- CreateIndex
CREATE INDEX "OrderAddress_pinCode_idx" ON "OrderAddress"("pinCode");

-- CreateIndex
CREATE UNIQUE INDEX "OrderAddress_orderId_type_key" ON "OrderAddress"("orderId", "type");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_providerOrderId_idx" ON "Payment"("providerOrderId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_storeId_type_number_key" ON "Invoice"("storeId", "type", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRate_zoneId_code_key" ON "ShippingRate"("zoneId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PinCodeRule_storeId_pattern_key" ON "PinCodeRule"("storeId", "pattern");

-- CreateIndex
CREATE INDEX "Shipment_storeId_status_idx" ON "Shipment"("storeId", "status");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_awb_idx" ON "Shipment"("awb");

-- CreateIndex
CREATE INDEX "TrackingEvent_shipmentId_occurredAt_idx" ON "TrackingEvent"("shipmentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_exchangeOrderId_key" ON "ReturnRequest"("exchangeOrderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_storeId_status_createdAt_idx" ON "ReturnRequest"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_storeId_number_key" ON "ReturnRequest"("storeId", "number");

-- CreateIndex
CREATE INDEX "ReturnItem_returnId_idx" ON "ReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "Discount_storeId_isActive_startsAt_idx" ON "Discount"("storeId", "isActive", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_storeId_code_key" ON "Discount"("storeId", "code");

-- CreateIndex
CREATE INDEX "DiscountTarget_discountId_idx" ON "DiscountTarget"("discountId");

-- CreateIndex
CREATE INDEX "DiscountRedemption_discountId_email_idx" ON "DiscountRedemption"("discountId", "email");

-- CreateIndex
CREATE INDEX "DiscountRedemption_discountId_phone_idx" ON "DiscountRedemption"("discountId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountRedemption_discountId_orderId_key" ON "DiscountRedemption"("discountId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");

-- CreateIndex
CREATE INDEX "Review_productId_status_publishedAt_idx" ON "Review"("productId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Review_storeId_status_createdAt_idx" ON "Review"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProductQuestion_productId_status_idx" ON "ProductQuestion"("productId", "status");

-- CreateIndex
CREATE INDEX "ProductQuestion_storeId_status_createdAt_idx" ON "ProductQuestion"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "HomeSection_storeId_position_idx" ON "HomeSection"("storeId", "position");

-- CreateIndex
CREATE INDEX "Banner_storeId_placement_position_idx" ON "Banner"("storeId", "placement", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Page_storeId_slug_key" ON "Page"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Author_storeId_slug_key" ON "Author"("storeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PostTopic_storeId_slug_key" ON "PostTopic"("storeId", "slug");

-- CreateIndex
CREATE INDEX "Post_storeId_status_publishedAt_idx" ON "Post"("storeId", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Post_storeId_slug_key" ON "Post"("storeId", "slug");

-- CreateIndex
CREATE INDEX "PostProduct_productId_idx" ON "PostProduct"("productId");

-- CreateIndex
CREATE INDEX "PostCategory_categoryId_idx" ON "PostCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_storeId_handle_key" ON "Menu"("storeId", "handle");

-- CreateIndex
CREATE INDEX "MenuItem_menuId_parentId_position_idx" ON "MenuItem"("menuId", "parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_storeId_fromPath_key" ON "Redirect"("storeId", "fromPath");

-- CreateIndex
CREATE INDEX "SeoIssue_storeId_type_resolvedAt_idx" ON "SeoIssue"("storeId", "type", "resolvedAt");

-- CreateIndex
CREATE INDEX "SeoIssue_entityType_entityId_idx" ON "SeoIssue"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_storeId_key_channel_key" ON "MessageTemplate"("storeId", "key", "channel");

-- CreateIndex
CREATE INDEX "MessageLog_storeId_createdAt_idx" ON "MessageLog"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageLog_orderId_idx" ON "MessageLog"("orderId");

-- CreateIndex
CREATE INDEX "MessageLog_providerMessageId_idx" ON "MessageLog"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_dedupeKey_key" ON "Job"("dedupeKey");

-- CreateIndex
CREATE INDEX "Job_status_runAt_idx" ON "Job"("status", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_storeId_email_key" ON "NewsletterSubscriber"("storeId", "email");

-- CreateIndex
CREATE INDEX "ContactMessage_storeId_status_createdAt_idx" ON "ContactMessage"("storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_visitorId_idx" ON "ConsentRecord"("visitorId");

-- CreateIndex
CREATE INDEX "ConsentRecord_customerId_idx" ON "ConsentRecord"("customerId");

-- CreateIndex
CREATE INDEX "DataRequest_storeId_status_idx" ON "DataRequest"("storeId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_storeId_createdAt_idx" ON "AuditLog"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_staffId_createdAt_idx" ON "AuditLog"("staffId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminDraft_staffId_entityType_entityId_key" ON "AdminDraft"("staffId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

-- CreateIndex
CREATE INDEX "WebhookEvent_processedAt_idx" ON "WebhookEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "WebVital_storeId_name_createdAt_idx" ON "WebVital"("storeId", "name", "createdAt");

-- CreateIndex
CREATE INDEX "WebVital_storeId_pageType_createdAt_idx" ON "WebVital"("storeId", "pageType", "createdAt");
