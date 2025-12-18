import { pgTable, text, integer, numeric, boolean, serial, jsonb, varchar, timestamp, json, real, decimal} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  password: varchar("password", { length: 255 }).notNull(),
  dateOfBirth: varchar("date_of_birth", { length: 10 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 10 }),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric('original_price', { precision: 10, scale: 2 }),
  discount: numeric('discount', { precision: 10, scale: 2 }), // Discount percentage
  cashbackPercentage: numeric('cashback_percentage', { precision: 5, scale: 2 }), // Cashback percentage
  cashbackPrice: numeric('cashback_price', { precision: 10, scale: 2 }), // Auto-calculated cashback amount
    affiliateCommission: numeric('affiliate_commission', { precision: 5, scale: 2 }).default(0), // commission % for affiliates on this product
  affiliateUserDiscount: numeric('affiliate_user_discount', { precision: 5, scale: 2 }).default(0), // discount % given to customer when affiliate code used
  category: text('category').notNull(),
  subcategory: text("subcategory"),
  imageUrl: text("image_url").notNull(),
  videoUrl: text("video_url"),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("4.0"),
  reviewCount: integer("review_count").default(0),
  inStock: boolean("in_stock").default(true),
  featured: boolean("featured").default(false),
  bestseller: boolean("bestseller").default(false),
  newLaunch: boolean("new_launch").default(false),
  saleOffer: text("sale_offer"),
  variants: text("variants"),
  ingredients: text("ingredients"),
  benefits: text("benefits"),
  howToUse: text("how_to_use"),
  size: text("size"),
  tags: text("tags"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  status: text("status").notNull().default("Active"),
  productCount: integer("product_count").notNull().default(0),
});

export const subcategories = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("Active"),
  productCount: integer("product_count").notNull().default(0),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertSubcategorySchema = createInsertSchema(subcategories).omit({
  id: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// Orders table
export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  totalAmount: real("total_amount").notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  estimatedDelivery: timestamp("estimated_delivery"),
  deliveryInstructions: text("delivery_instructions"),
  saturdayDelivery: boolean("saturday_delivery").default(true),
  sundayDelivery: boolean("sunday_delivery").default(true),
  shiprocketOrderId: integer("shiprocket_order_id"),
  shiprocketShipmentId: integer("shiprocket_shipment_id"),
  paymentSessionId: varchar("payment_session_id", { length: 255 }),
  paymentId: varchar("payment_id", { length: 255 }),
  cashfreeOrderId: varchar("cashfree_order_id", { length: 255 }),
  affiliateCode: text("affiliate_code"),
  affiliateDiscount: integer("affiliate_discount").default(0),
  promoCode: text("promo_code"),
  promoDiscount: integer("promo_discount").default(0),
  redeemAmount: integer("redeem_amount").default(0),
  affiliateWalletAmount: integer("affiliate_wallet_amount").default(0),
  isMultiAddress: boolean("is_multi_address").default(false),
  notes: text("notes"),
  deliveryPartner: varchar("delivery_partner", { length: 50 }),
  deliveryType: varchar("delivery_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cashfreePayments = pgTable("cashfree_payments", {
  id: serial("id").primaryKey(),
  cashfreeOrderId: varchar("cashfree_order_id", { length: 100 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  amount: real("amount").notNull(),
  status: varchar("status", { length: 20 }).default("created").notNull(),
  paymentId: varchar("payment_id", { length: 100 }),
  orderData: jsonb("order_data"),
  customerInfo: jsonb("customer_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const jobPositions = pgTable("job_positions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  department: varchar("department", { length: 100 }).notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // Full-time, Part-time, Contract
  jobId: varchar("job_id", { length: 50 }).unique(),
  experienceLevel: varchar("experience_level", { length: 50 }).notNull(),
  workExperience: varchar("work_experience", { length: 50 }).notNull(),
  education: varchar("education", { length: 200 }).notNull(),
  description: text("description").notNull(),
  aboutRole: text("about_role").notNull(),
  responsibilities: jsonb("responsibilities").notNull(), // Array of strings
  requirements: jsonb("requirements").notNull(), // Array of strings
  skills: jsonb("skills").notNull(), // Array of strings
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type JobPosition = typeof jobPositions.$inferSelect;
export type InsertJobPosition = typeof jobPositions.$inferInsert;
export type SelectJobPosition = typeof jobPositions.$inferSelect;

export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  position: varchar("position", { length: 200 }).notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  isFresher: boolean("is_fresher").default(false).notNull(),
  experienceYears: varchar("experience_years", { length: 10 }),
  experienceMonths: varchar("experience_months", { length: 10 }),
  coverLetter: text("cover_letter").notNull(),
  resumeUrl: text("resume_url").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = typeof jobApplications.$inferInsert;

export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  country: varchar("country").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: text("website"),
  hours: text("hours"),
  latitude: numeric("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: numeric("longitude", { precision: 11, scale: 8 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;

export const insertOrderSchema = createInsertSchema(ordersTable);
export const selectOrderSchema = createSelectSchema(ordersTable);

// Order items table
export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => ordersTable.id).notNull(),
  productId: integer("product_id").references(() => products.id), // Nullable for combos
  comboId: integer("combo_id").references(() => combos.id),
  productName: text("product_name").notNull(),
  productImage: text("product_image").notNull(),
  quantity: integer("quantity").notNull(),
  price: text("price").notNull(),
  cashbackPrice: decimal("cashback_price", { precision: 10, scale: 2 }),
  cashbackPercentage: decimal("cashback_percentage", { precision: 5, scale: 2 }),
  deliveryAddress: text("delivery_address"),
  recipientName: text("recipient_name"),
  recipientPhone: text("recipient_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItemsTable);
export const selectOrderItemSchema = createSelectSchema(orderItemsTable);

// Order notifications table
export const orderNotificationsTable = pgTable("order_notifications", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => ordersTable.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // email, sms, push
  status: text("status").notNull(), // sent, failed, pending
  message: text("message").notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderNotificationSchema = createInsertSchema(orderNotificationsTable);
export const selectOrderNotificationSchema = createSelectSchema(orderNotificationsTable);

export const sliders = pgTable("sliders", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  subject: text("subject"),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("unread").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});

export const shades = pgTable("shades", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  colorCode: text("color_code").notNull(),
  value: text("value").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  inStock: boolean("in_stock").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  categoryIds: jsonb("category_ids"),
  subcategoryIds: jsonb("subcategory_ids"),
  productIds: jsonb("product_ids"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Shade = typeof shades.$inferSelect;
export type InsertShade = typeof shades.$inferInsert;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  imageUrl: text("image_url"),
  isVerified: boolean("is_verified").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// Product Shades Junction Table
export const productShades = pgTable("product_shades", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  shadeId: integer("shade_id").notNull().references(() => shades.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProductShade = typeof productShades.$inferSelect;
export type InsertProductShade = typeof productShades.$inferInsert;

// Product Images Table
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = typeof productImages.$inferInsert;

// Blog Posts Table
export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  author: text('author').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  imageUrl: text('image_url'),
  thumbnailUrl: text('thumbnail_url'),
  heroImageUrl: text('hero_image_url'),
  videoUrl: text('video_url'),
  featured: boolean('featured').default(false),
  published: boolean('published').default(true),
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  readTime: text('read_time').default('5 min read'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});



// Blog Categories Table
export const blogCategories = pgTable('blog_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const blogSubcategories = pgTable('blog_subcategories', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull().references(() => blogCategories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = typeof blogCategories.$inferInsert;
export type BlogSubcategory = typeof blogSubcategories.$inferSelect;
export type InsertBlogSubcategory = typeof blogSubcategories.$inferInsert;

// Category Sliders Table
export const categorySliders = pgTable("category_sliders", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  title: text("title"),
  subtitle: text("subtitle"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type CategorySlider = typeof categorySliders.$inferSelect;
export type InsertCategorySlider = typeof categorySliders.$inferInsert;

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerImage: text("customer_image"),
  instagramUrl: text("instagram_url"),
  rating: integer("rating").notNull().default(5),
  reviewText: text("review_text").notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = typeof testimonials.$inferInsert;

// Combos Table
export const combos = pgTable("combos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  discount: text("discount"),
  imageUrl: text("image_url").array(),
  videoUrl: text("video_url"),
  products: text("products").notNull(), // JSON string of product IDs
  productShades: text("product_shades"), // JSON string mapping product IDs to shade IDs
  rating: numeric("rating", { precision: 3, scale: 1 }).default("5.0"),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  detailedDescription: text("detailed_description"),
  productsIncluded: text("products_included"),
  benefits: text("benefits"),
  howToUse: text("how_to_use"),
  cashbackPercentage: numeric("cashback_percentage", { precision: 5, scale: 2 }),
  cashbackPrice: numeric("cashback_price", { precision: 10, scale: 2 }),
  affiliateCommission: numeric('affiliate_commission', { precision: 5, scale: 2 }).default(0), // commission % for affiliates on this combo
  affiliateUserDiscount: numeric('affiliate_user_discount', { precision: 5, scale: 2 }).default(0), // discount % given to customer when affiliate code used on combo
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Combo = typeof combos.$inferSelect;
export type InsertCombo = typeof combos.$inferInsert;

// Combo Images Table
export const comboImages = pgTable("combo_images", {
  id: serial("id").primaryKey(),
  comboId: integer("combo_id").notNull().references(() => combos.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ComboImage = typeof comboImages.$inferSelect;
export type InsertComboImage = typeof comboImages.$inferInsert;

export const comboSliders = pgTable('combo_sliders', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  title: text('title'),
  subtitle: text('subtitle'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const videoTestimonials = pgTable("video_testimonials", {
  id: serial("id").primaryKey(),
  customerImage: text("customer_image").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Combo Reviews Table
export const comboReviews = pgTable("combo_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  comboId: integer("combo_id").notNull().references(() => combos.id),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  userName: text("user_name"),
  isVerified: boolean("is_verified").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ComboReview = typeof comboReviews.$inferSelect;
export type InsertComboReview = typeof comboReviews.$inferInsert;

// Influencer Applications Table
export const influencerApplications = pgTable("influencer_applications", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  contactNumber: varchar("contact_number", { length: 20 }).notNull(),
  fullAddress: text("full_address").notNull(),
  landmark: varchar("landmark", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  pinCode: varchar("pin_code", { length: 10 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  instagramProfile: varchar("instagram_profile", { length: 255 }),
  youtubeChannel: varchar("youtube_channel", { length: 255 }),
  facebookProfile: varchar("facebook_profile", { length: 255 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

export type InfluencerApplication = typeof influencerApplications.$inferSelect;
export type InsertInfluencerApplication = typeof influencerApplications.$inferInsert;

// Affiliate Applications Table
export const affiliateApplications = pgTable("affiliate_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 10 }),
  landmark: text("landmark"),
  country: text("country").notNull(),
  bankName: varchar("bank_name", { length: 255 }),
  branchName: varchar("branch_name", { length: 255 }),
  ifscCode: varchar("ifsc_code", { length: 20 }),
  accountNumber: varchar("account_number", { length: 50 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

export type AffiliateApplication = typeof affiliateApplications.$inferSelect;
export type InsertAffiliateApplication = typeof affiliateApplications.$inferInsert;

// Offers Table
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  bannerImageUrl: text("banner_image_url"),
  bannerImages: jsonb("banner_images").$type<string[]>(),
  images: jsonb("images").$type<string[]>(),
  price: numeric("price", { precision: 10, scale: 2 }), // Offer price set by admin
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }), // Original price before discount
  discountType: varchar("discount_type", { length: 20 }).default("none"), // 'percentage' | 'flat' | 'none'
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }),
  discountText: varchar("discount_text", { length: 100 }),
  cashbackPercentage: numeric("cashback_percentage", { precision: 5, scale: 2 }), // Cashback percentage
  cashbackPrice: numeric("cashback_price", { precision: 10, scale: 2 }), // Auto-calculated cashback amount
  affiliateCommission: numeric('affiliate_commission', { precision: 5, scale: 2 }).default(0), // commission % for affiliates on this offer
  affiliateUserDiscount: numeric('affiliate_user_discount', { precision: 5, scale: 2 }).default(0), // discount % given to customer when affiliate code used on offer
  validFrom: timestamp("valid_from", { mode: "date" }).notNull(),
  validUntil: timestamp("valid_until", { mode: "date" }).notNull(),
  linkUrl: text("link_url"),
  buttonText: varchar("button_text", { length: 50 }).default("Shop Now"),
  productIds: jsonb("product_ids").$type<number[]>(),
  detailedDescription: text("detailed_description"), // Detailed description for Description tab
  productsIncluded: text("products_included"), // Products included details
  benefits: text("benefits"), // Benefits information
  videoUrl: text("video_url"), // Video URL for offer
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

// Affiliate Wallet Table
export const affiliateWallet = pgTable("affiliate_wallet", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  cashbackBalance: decimal("cashback_balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  commissionBalance: decimal("commission_balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AffiliateWallet = typeof affiliateWallet.$inferSelect;
export type InsertAffiliateWallet = typeof affiliateWallet.$inferInsert;

// Affiliate Transactions Table
export const affiliateTransactions = pgTable("affiliate_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // 'commission', 'withdrawal', 'refund'
  amount: varchar("amount", { length: 20 }).notNull(),
  balanceType: varchar("balance_type", { length: 50 }), // 'cashback', 'commission', 'mixed'
  description: text("description"),
  orderId: integer("order_id"),
  status: varchar("status", { length: 50 }).default('completed'), // 'pending', 'completed', 'failed'
  transactionId: varchar("transaction_id", { length: 200 }), // Bank transaction ID
  notes: text("notes"), // Admin notes for withdrawals
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AffiliateTransaction = typeof affiliateTransactions.$inferSelect;
export type InsertAffiliateTransaction = typeof affiliateTransactions.$inferInsert;
// Affiliate Clicks Table - Track all clicks on affiliate links
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  affiliateUserId: integer("affiliate_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  affiliateCode: varchar("affiliate_code", { length: 50 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  productId: integer("product_id").references(() => products.id),
  comboId: integer("combo_id").references(() => combos.id),
  converted: boolean("converted").default(false).notNull(),
  orderId: integer("order_id").references(() => ordersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type InsertAffiliateClick = typeof affiliateClicks.$inferInsert;

// Affiliate Sales Table - Track completed sales from affiliate links
export const affiliateSales = pgTable("affiliate_sales", {
  id: serial("id").primaryKey(),
  affiliateUserId: integer("affiliate_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  affiliateCode: varchar("affiliate_code", { length: 50 }).notNull(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => users.id),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }),
  productId: integer("product_id").references(() => products.id),
  comboId: integer("combo_id").references(() => combos.id),
  productName: text("product_name").notNull(),
  saleAmount: decimal("sale_amount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10.00").notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, confirmed, paid
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  converted: boolean("converted").default(true).notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AffiliateSale = typeof affiliateSales.$inferSelect;
export type InsertAffiliateSale = typeof affiliateSales.$inferInsert;

// User Wallet Table - for regular user cashback from orders
export const userWallet = pgTable("user_wallet", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  cashbackBalance: decimal("cashback_balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalRedeemed: decimal("total_redeemed", { precision: 10, scale: 2 }).default("0.00").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserWallet = typeof userWallet.$inferSelect;
export type InsertUserWallet = typeof userWallet.$inferInsert;

// User Wallet Transactions Table
export const userWalletTransactions = pgTable("user_wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // 'credit', 'debit', 'redeem', 'pending'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  orderId: integer("order_id").references(() => ordersTable.id),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("completed").notNull(), // 'completed', 'pending', 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserWalletTransaction = typeof userWalletTransactions.$inferSelect;
export type InsertUserWalletTransaction = typeof userWalletTransactions.$inferInsert;

// Promo Codes Table
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description").notNull(),
  discountType: varchar("discount_type", { length: 20 }).notNull(), // 'percentage' or 'flat'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("0.00"),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }), // Max discount for percentage type
  usageLimit: integer("usage_limit"), // Total usage limit
  usageCount: integer("usage_count").default(0).notNull(),
  userUsageLimit: integer("user_usage_limit").default(1).notNull(), // Per user limit
  isActive: boolean("is_active").default(true).notNull(),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;

// Promo Code Usage Tracking
export const promoCodeUsage = pgTable("promo_code_usage", {
  id: serial("id").primaryKey(),
  promoCodeId: integer("promo_code_id").notNull().references(() => promoCodes.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  orderId: integer("order_id").references(() => ordersTable.id),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type InsertPromoCodeUsage = typeof promoCodeUsage.$inferInsert;

// Cart Table Structure (Recommended)
export const cartItemsTable = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: integer("product_id").references(() => products.id),
  offerId: integer("offer_id").references(() => offers.id), // Jisse pata lage kaunsi offer lagi thi
  qty: integer("qty").notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  discountedPrice: numeric("discounted_price", { precision: 10, scale: 2 }),
  discountType: varchar("discount_type", { length: 50 }),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }),
  addedAt: timestamp("added_at").defaultNow(),
});

export type CartItem = typeof cartItemsTable.$inferSelect;
export type InsertCartItem = typeof cartItemsTable.$inferInsert;

// Schema for Zod validation
export const insertCartItemSchema = createInsertSchema(cartItemsTable).omit({
  id: true,
  userId: true, // User ID is handled by authentication
});
export const selectCartItemSchema = createSelectSchema(cartItemsTable);

// Updated CartItem interface to include offer details
interface CartItem {
  id: number;
  name: string;
  price: string;
  originalPrice?: string;
  image: string;
  quantity: number;
  variant?: string;
  inStock: boolean;
  cashbackPercentage?: string;
  cashbackPrice?: string;
  selectedShade?: {
    id: number;
    name: string;
    colorCode: string;
    imageUrl?: string;
  };
  // Offer-specific fields
  offerId?: number;
  offerTitle?: string;
  productId?: number;
  discountType?: string; // 'percentage' | 'flat' | 'fixed'
  discountAmount?: number;
  discountValue?: number; // percentage value or flat amount
  isOfferItem?: boolean;
  itemKey?: string;
}


// Delivery Addresses Table
export const deliveryAddresses = pgTable("delivery_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientName: varchar("recipient_name", { length: 255 }).notNull(),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  country: varchar("country", { length: 100 }).notNull().default('India'),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  deliveryInstructions: text("delivery_instructions"),
  saturdayDelivery: boolean("saturday_delivery").default(true),
  sundayDelivery: boolean("sunday_delivery").default(true),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DeliveryAddress = typeof deliveryAddresses.$inferSelect;
export type InsertDeliveryAddress = typeof deliveryAddresses.$inferInsert;

// Gift Milestones Table - For dynamic gift settings
export const giftMilestones = pgTable("gift_milestones", {
  id: serial("id").primaryKey(),
  minAmount: decimal("min_amount", { precision: 10, scale: 2 }).notNull(),
  maxAmount: decimal("max_amount", { precision: 10, scale: 2 }),
  giftCount: integer("gift_count").notNull(),
  giftDescription: text("gift_description"),
  discountType: varchar("discount_type", { length: 20 }).default("none"), // 'percentage' | 'flat' | 'none'
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }), // Discount amount or percentage
  cashbackPercentage: decimal("cashback_percentage", { precision: 5, scale: 2 }), // Cashback percentage
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GiftMilestone = typeof giftMilestones.$inferSelect;
export type InsertGiftMilestone = typeof giftMilestones.$inferInsert;

// User Gift Eligibility - Track which users have received gifts
export const userGiftEligibility = pgTable("user_gift_eligibility", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: 'cascade' }),
  orderAmount: decimal("order_amount", { precision: 10, scale: 2 }).notNull(),
  giftsEarned: integer("gifts_earned").notNull(),
  giftsClaimed: boolean("gifts_claimed").default(false).notNull(),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserGiftEligibility = typeof userGiftEligibility.$inferSelect;
export type InsertUserGiftEligibility = typeof userGiftEligibility.$inferInsert;

// Media Links Table - For managing clickable media with redirect links
export const mediaLinks = pgTable("media_links", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  videoUrl: text("video_url"), // Optional video URL
  redirectUrl: text("redirect_url").notNull(), // URL where users will be redirected on click
  category: varchar("category", { length: 100 }).notNull().default("media"), // e.g., 'media', 'press', 'featured'
  type: varchar("type", { length: 50 }).notNull().default("image"), // 'image', 'video', 'carousel'
  clickCount: integer("click_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  metadata: jsonb("metadata"), // Additional metadata like alt text, tags, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MediaLink = typeof mediaLinks.$inferSelect;
export type InsertMediaLink = typeof mediaLinks.$inferInsert;

export const insertMediaLinkSchema = createInsertSchema(mediaLinks).omit({
  id: true,
});

// Contests Table
export const contests = pgTable("contests", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  content: text("content").notNull(), // Rich content with HTML
  imageUrl: text("image_url").notNull(), // Banner image
  bannerImageUrl: text("banner_image_url"), // Large banner for detail page
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Contest = typeof contests.$inferSelect;
export type InsertContest = typeof contests.$inferInsert;

export const insertContestSchema = createInsertSchema(contests).omit({
  id: true,
});
export const selectContestSchema = createSelectSchema(contests);
export const selectMediaLinkSchema = createSelectSchema(mediaLinks);
export const influencerVideos = pgTable("influencer_videos", {
  id: serial("id").primaryKey(),
  influencerName: varchar("influencer_name", { length: 255 }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  redirectUrl: text("redirect_url"),
  category: text("category").default("influencer"),
  type: text("type").default("video"),
  clickCount: integer("click_count").default(0),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InfluencerVideo = typeof influencerVideos.$inferSelect;
export type InsertInfluencerVideo = typeof influencerVideos.$inferInsert;
export const insertInfluencerVideoSchema = createInsertSchema(influencerVideos);
export const selectInfluencerVideoSchema = createSelectSchema(influencerVideos);

// Affiliate Videos Table (similar to influencer videos but for affiliate-driven content)
export const affiliateVideos = pgTable("affiliate_videos", {
  id: serial("id").primaryKey(),
  affiliateName: varchar("affiliate_name", { length: 255 }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  redirectUrl: text("redirect_url"),
  category: text("category").default("affiliate"),
  type: text("type").default("video"),
  clickCount: integer("click_count").default(0),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AffiliateVideo = typeof affiliateVideos.$inferSelect;
export type InsertAffiliateVideo = typeof affiliateVideos.$inferInsert;
export const insertAffiliateVideoSchema = createInsertSchema(affiliateVideos);
export const selectAffiliateVideoSchema = createSelectSchema(affiliateVideos);

// Channel Partner Videos Table (separate table for channel partner content)
export const channelPartnerVideos = pgTable("channel_partner_videos", {
  id: serial("id").primaryKey(),
  partnerName: varchar("partner_name", { length: 255 }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  redirectUrl: text("redirect_url"),
  category: text("category").default("channel-partner"),
  type: text("type").default("video"),
  clickCount: integer("click_count").default(0),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ChannelPartnerVideo = typeof channelPartnerVideos.$inferSelect;
export type InsertChannelPartnerVideo = typeof channelPartnerVideos.$inferInsert;
export const insertChannelPartnerVideoSchema = createInsertSchema(channelPartnerVideos);
export const selectChannelPartnerVideoSchema = createSelectSchema(channelPartnerVideos);

// Push Subscriptions Table for Web Push Notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  auth: text("auth").notNull(),
  p256dh: text("p256dh").notNull(),
  email: varchar("email", { length: 255 }),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true });
export const selectPushSubscriptionSchema = createSelectSchema(pushSubscriptions);


export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  description: text("description").notNull(),
  targetType: varchar("target_type", { length: 50 }),
  targetId: integer("target_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  status: varchar("status", { length: 20 }).default("success"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminActivityLog = typeof adminActivityLogs.$inferSelect;
export type InsertAdminActivityLog = typeof adminActivityLogs.$inferInsert;

// System Settings - Master Admin can control all system settings
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  settingValue: text("setting_value"),
  settingType: varchar("setting_type", { length: 20 }).default("string"),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  isEditable: boolean("is_editable").default(true),
  lastModifiedBy: integer("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

// Admin Permissions - Role-based access control
export const adminPermissions = pgTable("admin_permissions", {
  id: serial("id").primaryKey(),
  role: varchar("role", { length: 30 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  canCreate: boolean("can_create").default(false),
  canRead: boolean("can_read").default(true),
  canUpdate: boolean("can_update").default(false),
  canDelete: boolean("can_delete").default(false),
  canExport: boolean("can_export").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AdminPermission = typeof adminPermissions.$inferSelect;
export type InsertAdminPermission = typeof adminPermissions.$inferInsert;

// Login History - Track all login attempts
export const loginHistory = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  email: varchar("email", { length: 255 }).notNull(),
  loginStatus: varchar("login_status", { length: 20 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  location: varchar("location", { length: 100 }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LoginHistory = typeof loginHistory.$inferSelect;
export type InsertLoginHistory = typeof loginHistory.$inferInsert;

// Feature Toggles - Master Admin can enable/disable features
export const featureToggles = pgTable("feature_toggles", {
  id: serial("id").primaryKey(),
  featureKey: varchar("feature_key", { length: 100 }).notNull().unique(),
  featureName: varchar("feature_name", { length: 100 }).notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true),
  enabledForRoles: jsonb("enabled_for_roles").$type<string[]>().default([]),
  lastModifiedBy: integer("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type FeatureToggle = typeof featureToggles.$inferSelect;
export type InsertFeatureToggle = typeof featureToggles.$inferInsert;

// Backup Logs - Track system backups
export const backupLogs = pgTable("backup_logs", {
  id: serial("id").primaryKey(),
  backupType: varchar("backup_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  fileSize: integer("file_size"),
  filePath: text("file_path"),
  initiatedBy: integer("initiated_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BackupLog = typeof backupLogs.$inferSelect;
export type InsertBackupLog = typeof backupLogs.$inferInsert;

// Role-based access control configuration
export const ROLES = {
  MASTER_ADMIN: 'master_admin',
  ADMIN: 'admin',
  ECOMMERCE: 'ecommerce',
  MARKETING: 'marketing',
  DIGITAL_MARKETING: 'digital_marketing',
  HR: 'hr',
  ACCOUNT: 'account',
  USER: 'user'
} as const;

export const ROLE_PERMISSIONS = {
  dashboard: ['master_admin', 'admin', 'ecommerce', 'marketing', 'digital_marketing', 'hr', 'account'],
  categories: ['master_admin', 'admin', 'ecommerce'],
  products: ['master_admin', 'admin', 'ecommerce'],
  orders: ['master_admin', 'admin', 'ecommerce'],
  customers: ['master_admin', 'admin', 'ecommerce', 'marketing'],
  announcements: ['master_admin', 'admin', 'marketing'],
  shades: ['master_admin', 'admin', 'ecommerce'],
  sliders: ['master_admin', 'admin', 'digital_marketing'],
  stores: ['master_admin', 'admin', 'ecommerce'],
  'contact-submissions': ['master_admin', 'admin', 'marketing'],
  testimonials: ['master_admin', 'admin', 'digital_marketing'],
  'video-testimonials': ['master_admin', 'admin', 'digital_marketing'],
  'influencer-videos': ['master_admin', 'admin', 'digital_marketing'],
  'affiliate-videos': ['master_admin', 'admin', 'digital_marketing'],
  'channel-partner-videos': ['master_admin', 'admin', 'digital_marketing'],
  blog: ['master_admin', 'admin', 'digital_marketing'],
  combos: ['master_admin', 'admin', 'ecommerce'],
  'combo-sliders': ['master_admin', 'admin', 'ecommerce'],
  'job-positions': ['master_admin', 'admin', 'hr'],
  'job-applications': ['master_admin', 'admin', 'hr'],
  'influencer-applications': ['master_admin', 'admin', 'digital_marketing'],
  'affiliate-applications': ['master_admin', 'admin', 'marketing'],
  'affiliate-withdrawals': ['master_admin', 'admin', 'account'],
  'promo-codes': ['master_admin'],
  'promo-code-usage': ['master_admin'],
  'gift-settings': ['master_admin'],
  offers: ['master_admin', 'admin', 'marketing'],
  contests: ['master_admin', 'admin', 'marketing'],
  media: ['master_admin', 'admin', 'digital_marketing'],
  settings: ['master_admin'],
  // Master admin exclusive features
  'master': ['master_admin'],
  'master/users': ['master_admin'],
  'master/settings': ['master_admin'],
  'master/logs': ['master_admin']
} as const;