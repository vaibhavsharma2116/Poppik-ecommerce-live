import { pgTable, text, integer, numeric, boolean, serial, jsonb, varchar, timestamp, json, real} from "drizzle-orm/pg-core";
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
  trackingNumber: text("tracking_number"),
  estimatedDelivery: timestamp("estimated_delivery"),
  shiprocketOrderId: text("shiprocket_order_id"),
  shiprocketShipmentId: text("shiprocket_shipment_id"),
  cashfreeOrderId: text("cashfree_order_id"),
  paymentSessionId: text("payment_session_id"),
  paymentId: text("payment_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cashfreePayments = pgTable("cashfree_payments", {
  id: serial("id").primaryKey(),
  cashfreeOrderId: varchar("cashfree_order_id", { length: 100 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  amount: real("amount").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("created"),
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
  qualifications: jsonb("qualifications"), // Array of strings
  skills: jsonb("skills").notNull(), // Array of strings
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  productImage: text("product_image").notNull(),
  quantity: integer("quantity").notNull(),
  price: text("price").notNull(),
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
  sortOrder: integer("sort_order").default(0).notNull(),
  categoryIds: jsonb("category_ids"),
  subcategoryIds: jsonb("subcategory_ids"),
  productIds: jsonb("product_ids"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
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

// Testimonials Table
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerImage: text("customer_image"),
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
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  detailedDescription: text("detailed_description"),
  productsIncluded: text("products_included"),
  benefits: text("benefits"),
  howToUse: text("how_to_use"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }).notNull(),
  discount: text("discount").notNull(),
  imageUrl: text("image_url").notNull(),
  products: jsonb("products").notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("5.0"),
  reviewCount: integer("review_count").default(0),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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