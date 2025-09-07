var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc3) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc3 = __getOwnPropDesc(from, key)) || desc3.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  blogCategories: () => blogCategories,
  blogPosts: () => blogPosts,
  cashfreePayments: () => cashfreePayments,
  categories: () => categories,
  contactSubmissions: () => contactSubmissions,
  insertCategorySchema: () => insertCategorySchema,
  insertOrderItemSchema: () => insertOrderItemSchema,
  insertOrderNotificationSchema: () => insertOrderNotificationSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertProductSchema: () => insertProductSchema,
  insertSubcategorySchema: () => insertSubcategorySchema,
  insertUserSchema: () => insertUserSchema,
  orderItemsTable: () => orderItemsTable,
  orderNotificationsTable: () => orderNotificationsTable,
  ordersTable: () => ordersTable,
  productImages: () => productImages,
  products: () => products,
  reviews: () => reviews,
  selectOrderItemSchema: () => selectOrderItemSchema,
  selectOrderNotificationSchema: () => selectOrderNotificationSchema,
  selectOrderSchema: () => selectOrderSchema,
  selectUserSchema: () => selectUserSchema,
  shades: () => shades,
  sliders: () => sliders,
  subcategories: () => subcategories,
  users: () => users
});
import { pgTable, text, integer, numeric, boolean, serial, jsonb, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
var users, products, categories, subcategories, insertProductSchema, insertCategorySchema, insertSubcategorySchema, insertUserSchema, selectUserSchema, ordersTable, cashfreePayments, insertOrderSchema, selectOrderSchema, orderItemsTable, insertOrderItemSchema, selectOrderItemSchema, orderNotificationsTable, insertOrderNotificationSchema, selectOrderNotificationSchema, sliders, contactSubmissions, shades, reviews, productImages, blogPosts, blogCategories;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
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
    products = pgTable("products", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      slug: text("slug").notNull().unique(),
      description: text("description").notNull(),
      shortDescription: text("short_description").notNull(),
      price: numeric("price", { precision: 10, scale: 2 }).notNull(),
      originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
      category: text("category").notNull(),
      subcategory: text("subcategory"),
      imageUrl: text("image_url").notNull(),
      rating: numeric("rating", { precision: 2, scale: 1 }).notNull(),
      reviewCount: integer("review_count").notNull().default(0),
      inStock: boolean("in_stock").notNull().default(true),
      featured: boolean("featured").notNull().default(false),
      bestseller: boolean("bestseller").notNull().default(false),
      newLaunch: boolean("new_launch").notNull().default(false),
      saleOffer: text("sale_offer"),
      variants: jsonb("variants"),
      ingredients: text("ingredients"),
      benefits: text("benefits"),
      howToUse: text("how_to_use"),
      size: text("size"),
      tags: text("tags")
    });
    categories = pgTable("categories", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      slug: text("slug").notNull().unique(),
      description: text("description").notNull(),
      imageUrl: text("image_url").notNull(),
      status: text("status").notNull().default("Active"),
      productCount: integer("product_count").notNull().default(0)
    });
    subcategories = pgTable("subcategories", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      slug: text("slug").notNull().unique(),
      description: text("description").notNull(),
      categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
      status: text("status").notNull().default("Active"),
      productCount: integer("product_count").notNull().default(0)
    });
    insertProductSchema = createInsertSchema(products).omit({
      id: true
    });
    insertCategorySchema = createInsertSchema(categories).omit({
      id: true
    });
    insertSubcategorySchema = createInsertSchema(subcategories).omit({
      id: true
    });
    insertUserSchema = createInsertSchema(users);
    selectUserSchema = createSelectSchema(users);
    ordersTable = pgTable("orders", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id).notNull(),
      totalAmount: integer("total_amount").notNull(),
      status: text("status").notNull().default("pending"),
      paymentMethod: text("payment_method").notNull(),
      shippingAddress: text("shipping_address").notNull(),
      trackingNumber: text("tracking_number"),
      estimatedDelivery: timestamp("estimated_delivery"),
      cashfreeOrderId: text("cashfree_order_id"),
      paymentSessionId: text("payment_session_id"),
      paymentId: text("payment_id"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    cashfreePayments = pgTable("cashfree_payments", {
      id: serial("id").primaryKey(),
      cashfreeOrderId: text("cashfree_order_id").notNull().unique(),
      userId: integer("user_id").references(() => users.id).notNull(),
      amount: integer("amount").notNull(),
      status: text("status").notNull().default("created"),
      // created, completed, failed
      orderData: jsonb("order_data").notNull(),
      customerInfo: jsonb("customer_info").notNull(),
      paymentId: text("payment_id"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      completedAt: timestamp("completed_at")
    });
    insertOrderSchema = createInsertSchema(ordersTable);
    selectOrderSchema = createSelectSchema(ordersTable);
    orderItemsTable = pgTable("order_items", {
      id: serial("id").primaryKey(),
      orderId: integer("order_id").references(() => ordersTable.id).notNull(),
      productId: integer("product_id").references(() => products.id),
      productName: text("product_name").notNull(),
      productImage: text("product_image").notNull(),
      quantity: integer("quantity").notNull(),
      price: text("price").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertOrderItemSchema = createInsertSchema(orderItemsTable);
    selectOrderItemSchema = createSelectSchema(orderItemsTable);
    orderNotificationsTable = pgTable("order_notifications", {
      id: serial("id").primaryKey(),
      orderId: integer("order_id").references(() => ordersTable.id).notNull(),
      userId: integer("user_id").references(() => users.id).notNull(),
      type: text("type").notNull(),
      // email, sms, push
      status: text("status").notNull(),
      // sent, failed, pending
      message: text("message").notNull(),
      sentAt: timestamp("sent_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertOrderNotificationSchema = createInsertSchema(orderNotificationsTable);
    selectOrderNotificationSchema = createSelectSchema(orderNotificationsTable);
    sliders = pgTable("sliders", {
      id: serial("id").primaryKey(),
      imageUrl: text("image_url").notNull(),
      isActive: boolean("is_active").notNull().default(true),
      sortOrder: integer("sort_order").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    contactSubmissions = pgTable("contact_submissions", {
      id: serial("id").primaryKey(),
      firstName: varchar("first_name", { length: 100 }).notNull(),
      lastName: varchar("last_name", { length: 100 }).notNull(),
      email: varchar("email", { length: 255 }).notNull(),
      phone: varchar("phone", { length: 20 }),
      subject: text("subject"),
      message: text("message").notNull(),
      status: varchar("status", { length: 20 }).default("unread").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      respondedAt: timestamp("responded_at")
    });
    shades = pgTable("shades", {
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
      updatedAt: timestamp("updated_at").defaultNow()
    });
    reviews = pgTable("reviews", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").notNull().references(() => users.id),
      productId: integer("product_id").notNull().references(() => products.id),
      orderId: integer("order_id").notNull().references(() => ordersTable.id),
      rating: integer("rating").notNull(),
      reviewText: text("review_text"),
      imageUrl: text("image_url"),
      isVerified: boolean("is_verified").default(true).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    productImages = pgTable("product_images", {
      id: serial("id").primaryKey(),
      productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
      imageUrl: text("image_url").notNull(),
      altText: text("alt_text"),
      isPrimary: boolean("is_primary").default(false).notNull(),
      sortOrder: integer("sort_order").default(0).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    blogPosts = pgTable("blog_posts", {
      id: serial("id").primaryKey(),
      title: varchar("title", { length: 255 }).notNull(),
      slug: varchar("slug", { length: 255 }).notNull().unique(),
      excerpt: text("excerpt"),
      content: text("content").notNull(),
      author: varchar("author", { length: 100 }).notNull(),
      category: varchar("category", { length: 100 }).notNull(),
      tags: text("tags").default("[]"),
      // Store as JSON string
      imageUrl: varchar("image_url", { length: 500 }),
      videoUrl: varchar("video_url", { length: 500 }),
      featured: boolean("featured").default(false),
      published: boolean("published").default(true),
      likes: integer("likes").default(0),
      comments: integer("comments").default(0),
      readTime: varchar("read_time", { length: 50 }).default("5 min read"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    blogCategories = pgTable("blog_categories", {
      id: serial("id").primaryKey(),
      name: varchar("name", { length: 255 }).notNull().unique(),
      slug: varchar("slug", { length: 255 }).notNull().unique(),
      description: text("description"),
      isActive: boolean("is_active").default(true),
      sortOrder: integer("sort_order").default(0),
      createdAt: timestamp("created_at").defaultNow()
    });
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  DatabaseStorage: () => DatabaseStorage,
  pool: () => pool,
  storage: () => storage
});
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, like, asc, or, sql } from "drizzle-orm";
import { Pool } from "pg";
import dotenv from "dotenv";
async function getDb() {
  return db;
}
var pool, db, DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    dotenv.config();
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgresql://31.97.226.116:5432/my_pgdb?sslmode=disable",
      ssl: false,
      max: 3,
      // Further reduced connections
      idleTimeoutMillis: 1e4,
      connectionTimeoutMillis: 5e3,
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
      allowExitOnIdle: true
    });
    db = drizzle(pool);
    (async () => {
      try {
        const client = await pool.connect();
        await client.query("SELECT 1");
        client.release();
        console.log("\u2705 Database connected successfully");
      } catch (error) {
        console.error("\u274C Database connection failed:", error);
      }
    })();
    DatabaseStorage = class {
      constructor() {
      }
      // Users
      async getUser(id) {
        const db3 = await getDb();
        const result = await db3.select().from(users).where(eq(users.id, id)).limit(1);
        return result[0];
      }
      async getUserByEmail(email) {
        const db3 = await getDb();
        const result = await db3.select().from(users).where(eq(users.email, email)).limit(1);
        return result[0];
      }
      async createUser(userData) {
        try {
          console.log("Storage: Creating user with data:", {
            ...userData,
            password: "[HIDDEN]"
          });
          if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
            throw new Error("Missing required fields: firstName, lastName, email, and password are required");
          }
          const database = await getDb();
          const [user] = await database.insert(users).values({
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone || null,
            password: userData.password,
            dateOfBirth: userData.dateOfBirth || null,
            address: userData.address || null,
            city: userData.city || null,
            state: userData.state || null,
            pincode: userData.pincode || null,
            role: userData.role || "customer",
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          }).returning();
          console.log("Storage: User created successfully with ID:", user.id);
          return user;
        } catch (error) {
          console.error("Storage: Error creating user:", {
            message: error.message,
            code: error.code,
            constraint: error.constraint,
            detail: error.detail
          });
          if (error.code === "23505") {
            throw new Error("A user with this email already exists");
          } else if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
            throw new Error("Database connection failed");
          } else if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
            throw new Error("Database tables not found. Please run database migrations.");
          }
          throw error;
        }
      }
      async updateUser(id, userData) {
        const db3 = await getDb();
        const result = await db3.update(users).set(userData).where(eq(users.id, id)).returning();
        return result[0];
      }
      async deleteUser(id) {
        const db3 = await getDb();
        const result = await db3.delete(users).where(eq(users.id, id)).returning();
        return result.length > 0;
      }
      // Products
      async getProduct(id) {
        const db3 = await getDb();
        const result = await db3.select().from(products).where(eq(products.id, id)).limit(1);
        return result[0];
      }
      async getProductBySlug(slug) {
        const db3 = await getDb();
        const result = await db3.select().from(products).where(eq(products.slug, slug)).limit(1);
        return result[0];
      }
      async getProducts() {
        const db3 = await getDb();
        return await db3.select().from(products);
      }
      async getProductsByCategory(category) {
        const db3 = await getDb();
        let result = await db3.select().from(products).where(eq(products.category, category));
        if (result.length === 0) {
          const allProducts = await db3.select().from(products);
          const searchCategory = category.toLowerCase();
          result = allProducts.filter((product) => {
            if (!product.category) return false;
            const productCategory = product.category.toLowerCase();
            if (productCategory.includes(searchCategory) || searchCategory.includes(productCategory)) return true;
            const categoryMappings = {
              "skincare": ["skin", "face", "facial"],
              "haircare": ["hair"],
              "makeup": ["cosmetics", "beauty"],
              "bodycare": ["body"],
              "eyecare": ["eye", "eyes"],
              "eye-drama": ["eye", "eyes", "eyecare"],
              "beauty": ["makeup", "cosmetics", "skincare"]
            };
            const mappedCategories = categoryMappings[searchCategory] || [];
            return mappedCategories.some((mapped) => productCategory.includes(mapped));
          });
        }
        return result;
      }
      async getFeaturedProducts() {
        const db3 = await getDb();
        return await db3.select().from(products).where(eq(products.featured, true));
      }
      async getBestsellerProducts() {
        const db3 = await getDb();
        return await db3.select().from(products).where(eq(products.bestseller, true));
      }
      async getNewLaunchProducts() {
        const db3 = await getDb();
        return await db3.select().from(products).where(eq(products.newLaunch, true));
      }
      async createProduct(productData) {
        const db3 = await getDb();
        try {
          console.log("Creating product with data:", productData);
          const { name, price, category, description } = productData;
          if (!name || !price || !category || !description) {
            throw new Error("Missing required fields: name, price, category, and description are required");
          }
          if (typeof name !== "string" || name.trim().length === 0) {
            throw new Error("Product name must be a non-empty string");
          }
          if (isNaN(Number(price)) || Number(price) <= 0) {
            throw new Error("Price must be a valid positive number");
          }
          if (typeof category !== "string" || category.trim().length === 0) {
            throw new Error("Category must be a non-empty string");
          }
          if (typeof description !== "string" || description.trim().length === 0) {
            throw new Error("Description must be a non-empty string");
          }
          const slug = productData.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const productToInsert = {
            name: String(name).trim(),
            slug,
            description: String(description).trim(),
            shortDescription: productData.shortDescription ? String(productData.shortDescription).trim() : String(description).slice(0, 100),
            price: Number(price),
            originalPrice: productData.originalPrice ? Number(productData.originalPrice) : null,
            category: String(category).trim(),
            subcategory: productData.subcategory ? String(productData.subcategory).trim() : null,
            imageUrl: productData.imageUrl ? String(productData.imageUrl).trim() : "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400",
            rating: Number(productData.rating) || 4,
            reviewCount: Number(productData.reviewCount) || 0,
            inStock: Boolean(productData.inStock ?? true),
            featured: Boolean(productData.featured ?? false),
            bestseller: Boolean(productData.bestseller ?? false),
            newLaunch: Boolean(productData.newLaunch ?? false),
            saleOffer: productData.saleOffer ? String(productData.saleOffer).trim() : null,
            variants: productData.variants ? String(productData.variants).trim() : null,
            ingredients: productData.ingredients ? String(productData.ingredients).trim() : null,
            benefits: productData.benefits ? String(productData.benefits).trim() : null,
            howToUse: productData.howToUse ? String(productData.howToUse).trim() : null,
            size: productData.size ? String(productData.size).trim() : null,
            tags: productData.tags ? String(productData.tags).trim() : null
          };
          console.log("Inserting product data:", productToInsert);
          const result = await db3.insert(products).values(productToInsert).returning();
          if (!result || result.length === 0) {
            throw new Error("Product was not created - no result returned");
          }
          console.log("Product created successfully:", result[0]);
          return result[0];
        } catch (error) {
          console.error("Error creating product:", error);
          if (error.message.includes("unique constraint")) {
            throw new Error("A product with this name or slug already exists");
          } else if (error.message.includes("not null constraint")) {
            throw new Error("Missing required product information");
          } else {
            throw new Error(error.message || "Failed to create product");
          }
        }
      }
      async updateProduct(id, productData) {
        try {
          const db3 = await getDb();
          const cleanData = { ...productData };
          if (cleanData.price !== void 0) {
            cleanData.price = parseFloat(cleanData.price) || 0;
          }
          if (cleanData.rating !== void 0) {
            cleanData.rating = parseFloat(cleanData.rating) || 0;
          }
          if (cleanData.reviewCount !== void 0) {
            cleanData.reviewCount = parseInt(cleanData.reviewCount) || 0;
          }
          const stringFields = ["subcategory", "saleOffer", "size", "ingredients", "benefits", "howToUse", "tags"];
          stringFields.forEach((field) => {
            if (cleanData[field] === "") {
              cleanData[field] = null;
            }
          });
          if (cleanData.name) {
            cleanData.slug = cleanData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          }
          const [updatedProduct] = await db3.update(products).set(cleanData).where(eq(products.id, id)).returning();
          return updatedProduct || null;
        } catch (error) {
          console.error("Error updating product:", error);
          throw error;
        }
      }
      async deleteProduct(id) {
        try {
          console.log(`DatabaseStorage: Attempting to delete product with ID: ${id}`);
          const db3 = await getDb();
          const existingProduct = await db3.select().from(products).where(eq(products.id, id)).limit(1);
          if (existingProduct.length === 0) {
            console.log(`Product with ID ${id} not found in database`);
            return false;
          }
          console.log(`Found product to delete: ${existingProduct[0].name}`);
          try {
            await db3.delete(reviews).where(eq(reviews.productId, id));
            console.log(`Deleted reviews for product ${id}`);
          } catch (relatedError) {
            console.warn(`Warning: Failed to delete related data for product ${id}:`, relatedError);
          }
          const result = await db3.delete(products).where(eq(products.id, id)).returning();
          const success = result.length > 0;
          if (success) {
            console.log(`Successfully deleted product ${id} from database. Deleted ${result.length} rows.`);
            console.log(`Deleted product details:`, result[0]);
          } else {
            console.log(`Failed to delete product ${id} - no rows affected`);
          }
          return success;
        } catch (error) {
          console.error(`Error deleting product ${id}:`, error);
          console.error(`Error details:`, error.message);
          throw error;
        }
      }
      // Categories
      async getCategory(id) {
        const db3 = await getDb();
        const result = await db3.select().from(categories).where(eq(categories.id, id)).limit(1);
        return result[0];
      }
      async getCategoryBySlug(slug) {
        const db3 = await getDb();
        const result = await db3.select().from(categories).where(eq(categories.slug, slug)).limit(1);
        return result[0];
      }
      async getCategories() {
        const db3 = await getDb();
        return await db3.select().from(categories);
      }
      async createCategory(category) {
        try {
          const db3 = await getDb();
          console.log("Creating category with data:", category);
          if (!category.name || !category.description || !category.slug) {
            throw new Error("Missing required fields: name, description, and slug are required");
          }
          const existingCategory = await db3.select().from(categories).where(eq(categories.slug, category.slug)).limit(1);
          if (existingCategory.length > 0) {
            throw new Error(`Category with slug '${category.slug}' already exists`);
          }
          const result = await db3.insert(categories).values(category).returning();
          if (!result || result.length === 0) {
            throw new Error("Failed to insert category into database");
          }
          console.log("Category created successfully:", result[0]);
          return result[0];
        } catch (error) {
          console.error("Error creating category:", error);
          if (error.message.includes("unique constraint")) {
            throw new Error("A category with this name or slug already exists");
          } else if (error.message.includes("not null constraint")) {
            throw new Error("Missing required category information");
          } else {
            throw new Error(error.message || "Failed to create category");
          }
        }
      }
      async updateCategory(id, category) {
        const db3 = await getDb();
        const result = await db3.update(categories).set(category).where(eq(categories.id, id)).returning();
        return result[0];
      }
      async deleteCategory(id) {
        const db3 = await getDb();
        const result = await db3.delete(categories).where(eq(categories.id, id)).returning();
        return result.length > 0;
      }
      // Subcategories
      async getSubcategory(id) {
        const db3 = await getDb();
        const result = await db3.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);
        return result[0];
      }
      async getSubcategoryBySlug(slug) {
        const db3 = await getDb();
        const result = await db3.select().from(subcategories).where(eq(subcategories.slug, slug)).limit(1);
        return result[0];
      }
      async getSubcategoryById(id) {
        const db3 = await getDb();
        const result = await db3.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);
        return result[0];
      }
      async getSubcategories() {
        const db3 = await getDb();
        return await db3.select().from(subcategories);
      }
      async getSubcategoriesByCategory(categoryId) {
        const db3 = await getDb();
        return await db3.select().from(subcategories).where(eq(subcategories.categoryId, categoryId));
      }
      async createSubcategory(subcategoryData) {
        try {
          const db3 = await getDb();
          console.log("Creating subcategory with data:", subcategoryData);
          if (!subcategoryData.name || !subcategoryData.categoryId || !subcategoryData.description) {
            throw new Error("Missing required fields: name, categoryId, and description are required");
          }
          const existingSubcategory = await db3.select().from(subcategories).where(eq(subcategories.slug, subcategoryData.slug)).limit(1);
          if (existingSubcategory.length > 0) {
            throw new Error(`Subcategory with slug '${subcategoryData.slug}' already exists`);
          }
          const result = await db3.insert(subcategories).values(subcategoryData).returning();
          if (!result || result.length === 0) {
            throw new Error("Failed to insert subcategory into database");
          }
          console.log("Subcategory created successfully:", result[0]);
          return result[0];
        } catch (error) {
          console.error("Error creating subcategory:", error);
          if (error.message.includes("unique constraint")) {
            throw new Error("A subcategory with this name or slug already exists");
          } else if (error.message.includes("foreign key constraint")) {
            throw new Error("Invalid category selected. Please choose a valid category.");
          } else if (error.message.includes("not null constraint")) {
            throw new Error("Missing required subcategory information");
          } else {
            throw new Error(error.message || "Failed to create subcategory");
          }
        }
      }
      async updateSubcategory(id, subcategory) {
        const db3 = await getDb();
        const result = await db3.update(subcategories).set(subcategory).where(eq(subcategories.id, id)).returning();
        return result[0];
      }
      async deleteSubcategory(id) {
        const db3 = await getDb();
        const result = await db3.delete(subcategories).where(eq(subcategories.id, id)).returning();
        return result.length > 0;
      }
      async searchProducts(query) {
        const db3 = await getDb();
        const searchTerm = `%${query.toLowerCase()}%`;
        const result = await db3.select().from(products).where(
          sql`LOWER(${products.name}) LIKE ${searchTerm}
          OR LOWER(${products.category}) LIKE ${searchTerm}
          OR LOWER(${products.subcategory}) LIKE ${searchTerm}
          OR LOWER(${products.tags}) LIKE ${searchTerm}`
        ).limit(10);
        return result;
      }
      async getUserById(id) {
        const db3 = await getDb();
        const result = await db3.select().from(users).where(eq(users.id, id)).limit(1);
        return result[0];
      }
      async updateUserPassword(id, hashedPassword) {
        const db3 = await getDb();
        const result = await db3.update(users).set({ password: hashedPassword }).where(eq(users.id, id)).returning();
        return result.length > 0;
      }
      async createContactSubmission(submissionData) {
        const db3 = await getDb();
        const contactData = {
          firstName: submissionData.firstName,
          lastName: submissionData.lastName,
          email: submissionData.email,
          phone: submissionData.phone || null,
          subject: submissionData.subject || null,
          message: submissionData.message,
          status: submissionData.status || "unread"
        };
        const result = await db3.insert(contactSubmissions).values(contactData).returning();
        return result[0];
      }
      async getContactSubmissions() {
        const db3 = await getDb();
        const result = await db3.select().from(contactSubmissions).orderBy(sql`${contactSubmissions.createdAt} DESC`);
        return result;
      }
      async getContactSubmission(id) {
        const db3 = await getDb();
        const result = await db3.select().from(contactSubmissions).where(eq(contactSubmissions.id, id)).limit(1);
        return result[0] || null;
      }
      async updateContactSubmissionStatus(id, status, respondedAt) {
        const db3 = await getDb();
        const updateData = { status };
        if (respondedAt) {
          updateData.respondedAt = respondedAt;
        }
        const result = await db3.update(contactSubmissions).set(updateData).where(eq(contactSubmissions.id, id)).returning();
        return result[0] || null;
      }
      async deleteContactSubmission(id) {
        const db3 = await getDb();
        const result = await db3.delete(contactSubmissions).where(eq(contactSubmissions.id, id)).returning();
        return result.length > 0;
      }
      // Shades - Consolidated methods (removed duplicates)
      async getShade(id) {
        const db3 = await getDb();
        const result = await db3.select().from(shades).where(eq(shades.id, id)).limit(1);
        return result[0];
      }
      async getShades() {
        try {
          const db3 = await getDb();
          const result = await db3.select().from(shades).orderBy(asc(shades.sortOrder));
          return result;
        } catch (error) {
          console.error("Database connection failed:", error);
          throw error;
        }
      }
      async getActiveShades() {
        try {
          const db3 = await getDb();
          const result = await db3.select().from(shades).where(eq(shades.isActive, true)).orderBy(asc(shades.sortOrder));
          return result;
        } catch (error) {
          console.error("Database connection failed:", error);
          throw error;
        }
      }
      async getShadesByCategory(categoryId) {
        const db3 = await getDb();
        return await db3.select().from(shades).where(and(
          eq(shades.isActive, true),
          sql`json_extract(${shades.categoryIds}, '$') LIKE '%${categoryId}%'`
        )).orderBy(shades.sortOrder);
      }
      async getShadesBySubcategory(subcategoryId) {
        const db3 = await getDb();
        return await db3.select().from(shades).where(and(
          eq(shades.isActive, true),
          sql`json_extract(${shades.subcategoryIds}, '$') LIKE '%${subcategoryId}%'`
        )).orderBy(shades.sortOrder);
      }
      async createShade(shadeData) {
        try {
          const db3 = await getDb();
          const [shade] = await db3.insert(shades).values(shadeData).returning();
          return shade;
        } catch (error) {
          console.error("Database connection failed:", error);
          throw error;
        }
      }
      async updateShade(id, shadeData) {
        try {
          const db3 = await getDb();
          const updateData = {
            ...shadeData,
            updatedAt: /* @__PURE__ */ new Date()
          };
          console.log("Updating shade in database:", { id, updateData });
          const result = await db3.update(shades).set(updateData).where(eq(shades.id, id)).returning();
          if (!result || result.length === 0) {
            console.log("No shade found with ID:", id);
            return void 0;
          }
          console.log("Shade updated successfully in database:", result[0]);
          return result[0];
        } catch (error) {
          console.error("Database error updating shade:", error);
          throw error;
        }
      }
      async deleteShade(id) {
        try {
          const db3 = await getDb();
          const result = await db3.delete(shades).where(eq(shades.id, id));
          return result.rowCount > 0;
        } catch (error) {
          console.error("Database connection failed:", error);
          throw error;
        }
      }
      // Get shades for a specific product based on its category/subcategory or individual assignment
      async getProductShades(productId) {
        try {
          const db3 = await getDb();
          const product = await this.getProduct(productId);
          if (!product) return [];
          const allShades = await this.getActiveShades();
          const allCategories = await this.getCategories();
          const allSubcategories = await this.getSubcategories();
          const productShades2 = allShades.filter((shade) => {
            if (shade.productIds && Array.isArray(shade.productIds)) {
              if (shade.productIds.includes(productId)) return true;
            }
            if (shade.categoryIds && Array.isArray(shade.categoryIds)) {
              const hasMatchingCategory = shade.categoryIds.some((catId) => {
                const category = allCategories.find((cat) => cat.id === catId);
                return category && category.name.toLowerCase() === product.category.toLowerCase();
              });
              if (hasMatchingCategory) return true;
            }
            if (shade.subcategoryIds && Array.isArray(shade.subcategoryIds) && product.subcategory) {
              const hasMatchingSubcategory = shade.subcategoryIds.some((subId) => {
                const subcategory = allSubcategories.find((sub) => sub.id === subId);
                return subcategory && subcategory.name.toLowerCase() === product.subcategory.toLowerCase();
              });
              if (hasMatchingSubcategory) return true;
            }
            return false;
          });
          return productShades2;
        } catch (error) {
          console.error("Error getting product shades:", error);
          return [];
        }
      }
      // Helper function to check if shade has references
      async checkShadeReferences(shadeId) {
        return false;
      }
      // Review Management Functions
      async createReview(reviewData) {
        const db3 = await getDb();
        const [review] = await db3.insert(reviews).values(reviewData).returning();
        console.log("Review created:", review);
        return review;
      }
      async getProductReviews(productId) {
        const db3 = await getDb();
        const productReviews = await db3.select({
          id: reviews.id,
          userId: reviews.userId,
          productId: reviews.productId,
          orderId: reviews.orderId,
          rating: reviews.rating,
          reviewText: reviews.reviewText,
          imageUrl: reviews.imageUrl,
          isVerified: reviews.isVerified,
          createdAt: reviews.createdAt,
          userName: sql`${users.firstName} || ' ' || ${users.lastName}`,
          userEmail: users.email
        }).from(reviews).innerJoin(users, eq(reviews.userId, users.id)).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt));
        return productReviews;
      }
      async getUserReviews(userId) {
        const db3 = await getDb();
        const userReviews = await db3.select({
          id: reviews.id,
          userId: reviews.userId,
          productId: reviews.productId,
          orderId: reviews.orderId,
          rating: reviews.rating,
          reviewText: reviews.reviewText,
          imageUrl: reviews.imageUrl,
          isVerified: reviews.isVerified,
          createdAt: reviews.createdAt,
          productName: products.name,
          productImage: products.imageUrl
        }).from(reviews).innerJoin(products, eq(reviews.productId, products.id)).where(eq(reviews.userId, userId)).orderBy(desc(reviews.createdAt));
        return userReviews;
      }
      async checkUserCanReview(userId, productId) {
        const db3 = await getDb();
        const userOrders = await db3.select({
          orderId: ordersTable.id,
          orderStatus: ordersTable.status
        }).from(ordersTable).innerJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.orderId)).where(
          and(
            eq(ordersTable.userId, userId),
            eq(orderItemsTable.productId, productId),
            eq(ordersTable.status, "delivered")
          )
        );
        if (userOrders.length === 0) {
          return {
            canReview: false,
            message: "You can only review products that you have purchased and received."
          };
        }
        const existingReview = await db3.select().from(reviews).where(
          and(
            eq(reviews.userId, userId),
            eq(reviews.productId, productId)
          )
        ).limit(1);
        if (existingReview.length > 0) {
          return {
            canReview: false,
            message: "You have already reviewed this product."
          };
        }
        return {
          canReview: true,
          orderId: userOrders[0].orderId,
          message: "You can review this product."
        };
      }
      async deleteReview(reviewId, userId) {
        try {
          const db3 = await getDb();
          const result = await db3.delete(reviews).where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId))).returning();
          return result.length > 0;
        } catch (error) {
          console.error("Error deleting review:", error);
          throw error;
        }
      }
      // Blog Management Functions
      // Get all blog posts
      async getBlogPosts() {
        try {
          const db3 = await getDb();
          const posts = await db3.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
          return posts;
        } catch (error) {
          console.error("Error fetching blog posts:", error);
          throw error;
        }
      }
      // Get published blog posts
      async getPublishedBlogPosts() {
        try {
          const db3 = await getDb();
          const posts = await db3.select().from(blogPosts).where(eq(blogPosts.published, true)).orderBy(desc(blogPosts.createdAt));
          return posts;
        } catch (error) {
          console.error("Error fetching published blog posts:", error);
          throw error;
        }
      }
      // Get featured blog posts
      async getFeaturedBlogPosts() {
        try {
          const db3 = await getDb();
          const posts = await db3.select().from(blogPosts).where(and(eq(blogPosts.published, true), eq(blogPosts.featured, true))).orderBy(desc(blogPosts.createdAt));
          return posts;
        } catch (error) {
          console.error("Error fetching featured blog posts:", error);
          throw error;
        }
      }
      // Get blog post by slug
      async getBlogPostBySlug(slug) {
        try {
          const db3 = await getDb();
          const post = await db3.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
          return post[0] || null;
        } catch (error) {
          console.error("Error fetching blog post by slug:", error);
          throw error;
        }
      }
      // Create blog post
      async createBlogPost(postData) {
        try {
          const db3 = await getDb();
          const slug = postData.title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
          const tags = Array.isArray(postData.tags) ? JSON.stringify(postData.tags) : typeof postData.tags === "string" ? postData.tags : "[]";
          const postToInsert = {
            ...postData,
            slug,
            tags,
            likes: 0,
            comments: 0,
            published: postData.published ?? true,
            featured: postData.featured ?? false,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          };
          const result = await db3.insert(blogPosts).values(postToInsert).returning();
          return result[0];
        } catch (error) {
          console.error("Database error in createBlogPost:", error);
          throw error;
        }
      }
      // Update blog post
      async updateBlogPost(id, postData) {
        try {
          const db3 = await getDb();
          const updateData = { ...postData };
          if (postData.title) {
            updateData.slug = postData.title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
          }
          if (postData.tags) {
            updateData.tags = JSON.stringify(postData.tags);
          }
          updateData.updatedAt = /* @__PURE__ */ new Date();
          const [post] = await db3.update(blogPosts).set(updateData).where(eq(blogPosts.id, id)).returning();
          return post;
        } catch (error) {
          console.error("Error updating blog post:", error);
          throw error;
        }
      }
      // Delete blog post
      async deleteBlogPost(id) {
        try {
          const db3 = await getDb();
          const result = await db3.delete(blogPosts).where(eq(blogPosts.id, id)).returning();
          return result.length > 0;
        } catch (error) {
          console.error("Error deleting blog post:", error);
          throw error;
        }
      }
      // Search blog posts
      async searchBlogPosts(query) {
        try {
          const db3 = await getDb();
          const searchTerm = `%${query.toLowerCase()}%`;
          const posts = await db3.select().from(blogPosts).where(
            and(
              eq(blogPosts.published, true),
              or(
                like(sql`LOWER(${blogPosts.title})`, searchTerm),
                like(sql`LOWER(${blogPosts.excerpt})`, searchTerm),
                like(sql`LOWER(${blogPosts.content})`, searchTerm),
                like(sql`LOWER(${blogPosts.author})`, searchTerm),
                like(sql`LOWER(${blogPosts.category})`, searchTerm)
              )
            )
          ).orderBy(desc(blogPosts.createdAt));
          return posts;
        } catch (error) {
          console.error("Error searching blog posts:", error);
          throw error;
        }
      }
      // Blog Categories
      // Get all blog categories
      async getBlogCategories() {
        try {
          const db3 = await getDb();
          return await db3.select().from(blogCategories).where(eq(blogCategories.isActive, true)).orderBy(asc(blogCategories.sortOrder));
        } catch (error) {
          console.error("Database error in getBlogCategories:", error);
          return [
            { id: 1, name: "Beauty Tips", slug: "beauty-tips", isActive: true, sortOrder: 1 },
            { id: 2, name: "Product Reviews", slug: "product-reviews", isActive: true, sortOrder: 2 },
            { id: 3, name: "Tutorials", slug: "tutorials", isActive: true, sortOrder: 3 },
            { id: 4, name: "Skincare", slug: "skincare", isActive: true, sortOrder: 4 },
            { id: 5, name: "Makeup", slug: "makeup", isActive: true, sortOrder: 5 }
          ];
        }
      }
      // Create blog category
      async createBlogCategory(categoryData) {
        try {
          const db3 = await getDb();
          const slug = categoryData.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
          const [category] = await db3.insert(blogCategories).values({
            ...categoryData,
            slug,
            createdAt: /* @__PURE__ */ new Date()
          }).returning();
          return category;
        } catch (error) {
          console.error("Error creating blog category:", error);
          throw error;
        }
      }
      // Update blog category
      async updateBlogCategory(id, categoryData) {
        try {
          const db3 = await getDb();
          const updateData = { ...categoryData };
          if (categoryData.name) {
            updateData.slug = categoryData.name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
          }
          const [category] = await db3.update(blogCategories).set(updateData).where(eq(blogCategories.id, id)).returning();
          return category;
        } catch (error) {
          console.error("Error updating blog category:", error);
          throw error;
        }
      }
      // Delete blog category
      async deleteBlogCategory(id) {
        try {
          const db3 = await getDb();
          const result = await db3.delete(blogCategories).where(eq(blogCategories.id, id)).returning();
          return result.length > 0;
        } catch (error) {
          console.error("Error deleting blog category:", error);
          throw error;
        }
      }
      // Toggle blog post like
      async toggleBlogPostLike(postId, userId) {
        try {
          const db3 = await getDb();
          const existingLike = await db3.select().from(sql`blog_post_likes`).where(sql`post_id = ${postId} AND user_id = ${userId}`).limit(1);
          let liked = false;
          if (existingLike.length > 0) {
            await db3.delete(sql`blog_post_likes`).where(sql`post_id = ${postId} AND user_id = ${userId}`);
            await db3.update(blogPosts).set({
              likes: sql`${blogPosts.likes} - 1`
            }).where(eq(blogPosts.id, postId));
            liked = false;
          } else {
            await db3.insert(sql`blog_post_likes`).values({
              post_id: postId,
              user_id: userId,
              created_at: /* @__PURE__ */ new Date()
            });
            await db3.update(blogPosts).set({
              likes: sql`${blogPosts.likes} + 1`
            }).where(eq(blogPosts.id, postId));
            liked = true;
          }
          const post = await db3.select({ likes: blogPosts.likes }).from(blogPosts).where(eq(blogPosts.id, postId)).limit(1);
          const likesCount = post[0]?.likes || 0;
          return { liked, likesCount };
        } catch (error) {
          console.error("Error toggling blog post like:", error);
          throw error;
        }
      }
      // Slider Management Functions
      async getSliders() {
        try {
          const db3 = await getDb();
          return await db3.select().from(sliders).orderBy(asc(sliders.sortOrder));
        } catch (error) {
          console.error("Error fetching sliders:", error);
          return [];
        }
      }
      async getActiveSliders() {
        try {
          const db3 = await getDb();
          return await db3.select().from(sliders).where(eq(sliders.isActive, true)).orderBy(asc(sliders.sortOrder));
        } catch (error) {
          console.error("Error fetching active sliders:", error);
          return [];
        }
      }
      async createSlider(sliderData) {
        try {
          const db3 = await getDb();
          const [slider] = await db3.insert(sliders).values(sliderData).returning();
          return slider;
        } catch (error) {
          console.error("Error creating slider:", error);
          throw error;
        }
      }
      async updateSlider(id, sliderData) {
        try {
          const db3 = await getDb();
          const [slider] = await db3.update(sliders).set(sliderData).where(eq(sliders.id, id)).returning();
          return slider;
        } catch (error) {
          console.error("Error updating slider:", error);
          throw error;
        }
      }
      async deleteSlider(id) {
        try {
          const db3 = await getDb();
          const result = await db3.delete(sliders).where(eq(sliders.id, id)).returning();
          return result.length > 0;
        } catch (error) {
          console.error("Error deleting slider:", error);
          throw error;
        }
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/index.ts
import express2 from "express";
import compression from "compression";
import { config } from "dotenv";

// server/routes.ts
init_storage();
import { createServer } from "http";
import multer from "multer";

// server/otp-service.ts
import crypto from "crypto";
import nodemailer from "nodemailer";
var otpStorage = /* @__PURE__ */ new Map();
var OTPService = class {
  // Expose storage for development endpoint access
  static get otpStorage() {
    return otpStorage;
  }
  // Mobile OTP methods
  static async sendMobileOTP(phoneNumber) {
    try {
      const cleanedPhone = phoneNumber.replace(/\D/g, "");
      const formattedPhone = cleanedPhone.startsWith("91") && cleanedPhone.length === 12 ? cleanedPhone.substring(2) : cleanedPhone;
      if (formattedPhone.length !== 10) {
        return {
          success: false,
          message: "Please enter a valid 10-digit mobile number"
        };
      }
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1e3);
      otpStorage.set(formattedPhone, {
        otp,
        email: formattedPhone,
        // Using email field for phone number
        expiresAt,
        verified: false
      });
      const smsSent = await this.sendSMS(`91${formattedPhone}`, otp);
      if (!smsSent) {
        console.error("Failed to send SMS via MDSSEND.IN");
      }
      console.log("\n" + "=".repeat(50));
      console.log("\u{1F4F1} MOBILE OTP SENT");
      console.log("=".repeat(50));
      console.log(`\u{1F4F1} Phone: +91 ${formattedPhone}`);
      console.log(`\u{1F510} OTP Code: ${otp}`);
      console.log(`\u23F0 Valid for: 5 minutes`);
      console.log(`\u{1F4C5} Generated at: ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
      console.log("=".repeat(50) + "\n");
      return {
        success: true,
        message: "OTP sent to your mobile number successfully"
      };
    } catch (error) {
      console.error("Error sending mobile OTP:", error);
      return {
        success: false,
        message: "Failed to send mobile OTP"
      };
    }
  }
  static async verifyMobileOTP(phoneNumber, otp) {
    try {
      const cleanedPhone = phoneNumber.replace(/\D/g, "");
      const formattedPhone = cleanedPhone.startsWith("91") && cleanedPhone.length === 12 ? cleanedPhone.substring(2) : cleanedPhone;
      const otpData = otpStorage.get(formattedPhone);
      if (!otpData) {
        return {
          success: false,
          message: "OTP not found or expired"
        };
      }
      if (/* @__PURE__ */ new Date() > otpData.expiresAt) {
        otpStorage.delete(formattedPhone);
        return {
          success: false,
          message: "OTP has expired"
        };
      }
      if (otpData.otp !== otp) {
        return {
          success: false,
          message: "Invalid OTP"
        };
      }
      otpData.verified = true;
      otpStorage.set(formattedPhone, otpData);
      return {
        success: true,
        message: "Mobile OTP verified successfully"
      };
    } catch (error) {
      console.error("Error verifying mobile OTP:", error);
      return {
        success: false,
        message: "Failed to verify mobile OTP"
      };
    }
  }
  // Create email transporter
  static createTransporter() {
    const config2 = {
      service: "gmail",
      // Use Gmail service instead of manual SMTP config
      auth: {
        user: process.env.EMAIL_USER?.replace(/"/g, "").trim(),
        pass: process.env.EMAIL_PASS?.replace(/"/g, "").trim()
      },
      tls: {
        rejectUnauthorized: false
      }
    };
    console.log("\u{1F4E7} Email transporter config:", {
      service: "gmail",
      user: config2.auth.user,
      passLength: config2.auth.pass?.length || 0,
      passPreview: config2.auth.pass ? `${config2.auth.pass.substring(0, 4)}****` : "undefined"
    });
    return nodemailer.createTransporter(config2);
  }
  static generateOTP() {
    if (process.env.STATIC_OTP === "true") {
      return "123456";
    }
    return crypto.randomInt(1e5, 999999).toString();
  }
  static async sendOTP(email) {
    try {
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1e3);
      otpStorage.set(email, {
        otp,
        email,
        expiresAt,
        verified: false
      });
      const emailSent = await this.sendEmail(email, otp);
      if (!emailSent) {
        console.error("Failed to send OTP email");
        return {
          success: false,
          message: "Failed to send OTP email"
        };
      }
      return {
        success: true,
        message: "OTP sent to your email successfully"
      };
    } catch (error) {
      console.error("Error sending OTP:", error);
      return {
        success: false,
        message: "Failed to send OTP"
      };
    }
  }
  static async verifyOTP(email, otp) {
    const otpData = otpStorage.get(email);
    if (!otpData) {
      return {
        success: false,
        message: "OTP not found or expired"
      };
    }
    if (/* @__PURE__ */ new Date() > otpData.expiresAt) {
      otpStorage.delete(email);
      return {
        success: false,
        message: "OTP has expired"
      };
    }
    if (otpData.otp !== otp) {
      return {
        success: false,
        message: "Invalid OTP"
      };
    }
    otpData.verified = true;
    otpStorage.set(email, otpData);
    return {
      success: true,
      message: "OTP verified successfully"
    };
  }
  static isVerified(email) {
    const otpData = otpStorage.get(email);
    return otpData?.verified === true;
  }
  static clearOTP(email) {
    otpStorage.delete(email);
  }
  // SMS sending using the specific API format with route=OTP
  static async sendSMS(phoneNumber, otp) {
    try {
      console.log("\u{1F4F1} Mobile OTP request for:", phoneNumber);
      const username = "Poppik";
      const apikey = "IF2ppgKwK0Mm";
      const senderid = "POPPIK";
      const mobile = phoneNumber;
      const TID = "1707175646621729117";
      const PEID = "1701175575743853955";
      const message = `Dear Poppik, your OTP for completing your registration is ${otp}. Please do not share this OTP with anyone. Visit us at www.poppik.in \u2013 Team Poppik`;
      const apiUrl = `http://13.234.156.238/api.php?username=${username}&apikey=${apikey}&senderid=${senderid}&route=OTP&mobile=${mobile}&text=${encodeURIComponent(message)}&TID=${TID}&PEID=${PEID}`;
      console.log("\u{1F50D} Sending SMS...");
      console.log(`\u{1F4F1} To: ${mobile}`);
      console.log(`\u{1F4DD} Message: ${message}`);
      console.log(`\u{1F517} API URL: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Poppik-Beauty-Store/1.0",
          "Accept": "text/plain, application/json, */*"
        }
      });
      const responseText = await response.text();
      console.log(`\u{1F4F1} SMS API Response Status:`, response.status);
      console.log(`\u{1F4F1} SMS API Response:`, responseText);
      const successIndicators = [
        "success",
        "sent",
        "delivered",
        "submitted",
        "accepted",
        "message sent",
        "sms sent",
        "ok",
        "queued"
      ];
      const errorIndicators = [
        "error",
        "failed",
        "invalid",
        "unauthorized",
        "insufficient",
        "expired",
        "blocked",
        "rejected"
      ];
      const responseTextLower = responseText.toLowerCase();
      const hasSuccess = successIndicators.some(
        (indicator) => responseTextLower.includes(indicator)
      );
      const hasError = errorIndicators.some(
        (indicator) => responseTextLower.includes(indicator)
      );
      const isNumericResponse = /^\d+$/.test(responseText.trim());
      if (response.ok && hasSuccess) {
        console.log(`\u2705 SMS sent successfully`);
        console.log(`\u{1F4F1} Success response: ${responseText}`);
        return true;
      } else if (response.ok && isNumericResponse && !hasError) {
        console.log(`\u2705 SMS sent successfully (message ID: ${responseText})`);
        return true;
      } else if (hasError) {
        console.log(`\u274C SMS API returned error: ${responseText}`);
      } else {
        console.log(`\u26A0\uFE0F SMS API unclear response: ${responseText}`);
      }
      console.log("\u{1F504} Development mode - OTP will work via console display");
      console.log("\n" + "=".repeat(60));
      console.log("\u{1F4F1} SMS FAILED - DEVELOPMENT OTP DISPLAY");
      console.log("=".repeat(60));
      console.log(`\u{1F4F1} Phone: ${phoneNumber}`);
      console.log(`\u{1F510} OTP Code: ${otp}`);
      console.log(`\u23F0 Valid for: 5 minutes`);
      console.log(`\u{1F4C5} Generated at: ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
      console.log("=".repeat(60) + "\n");
      return true;
    } catch (error) {
      console.log("\u{1F4F1} SMS service error:", error.message);
      console.log("\u{1F504} Development mode - OTP will work via console display");
      console.log("\n" + "=".repeat(60));
      console.log("\u{1F4F1} SMS ERROR - DEVELOPMENT OTP DISPLAY");
      console.log("=".repeat(60));
      console.log(`\u{1F4F1} Phone: ${phoneNumber}`);
      console.log(`\u{1F510} OTP Code: ${otp}`);
      console.log(`\u23F0 Valid for: 5 minutes`);
      console.log(`\u{1F4C5} Generated at: ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
      console.log("=".repeat(60) + "\n");
      return true;
    }
  }
  // Email-based OTP system using Nodemailer
  static async sendEmail(email, otp) {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("\u26A0\uFE0F  Email configuration missing - using console output only");
        console.log("\n" + "=".repeat(50));
        console.log("\u{1F4E7} EMAIL OTP (Console Only)");
        console.log("=".repeat(50));
        console.log(`\u{1F4E7} Email: ${email}`);
        console.log(`\u{1F510} OTP Code: ${otp}`);
        console.log(`\u23F0 Valid for: 5 minutes`);
        console.log(`\u{1F4C5} Generated at: ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
        console.log("=".repeat(50) + "\n");
        return true;
      }
      const transporter = this.createTransporter();
      console.log("\u{1F50D} Verifying email connection...");
      await transporter.verify();
      console.log("\u2705 Email connection verified successfully");
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code - Beauty Store",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #e74c3c, #c0392b); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Beauty Store</h1>
              <p style="color: white; margin: 5px 0; opacity: 0.9;">Your OTP Verification Code</p>
            </div>

            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Hello!</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6;">
                You requested an OTP for verification. Please use the code below to complete your action:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <div style="background: #e74c3c; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 8px; display: inline-block;">
                  ${otp}
                </div>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>\u23F0 Important:</strong> This OTP is valid for 5 minutes only.
                </p>
              </div>

              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                If you didn't request this OTP, please ignore this email. For security reasons, please do not share this code with anyone.
              </p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

              <div style="text-align: center; color: #999; font-size: 12px;">
                <p>Beauty Store - Premium Beauty & Skincare Products</p>
                <p>Generated at: ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
              </div>
            </div>
          </div>
        `,
        text: `
Your OTP Code: ${otp}

This code is valid for 5 minutes only.
Generated at: ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}

Beauty Store - Premium Beauty & Skincare Products
        `
      };
      await transporter.sendMail(mailOptions);
      console.log("\n" + "=".repeat(50));
      console.log("\u{1F4E7} EMAIL OTP SENT");
      console.log("=".repeat(50));
      console.log(`\u{1F4E7} Email: ${email}`);
      console.log(`\u{1F510} OTP Code: ${otp}`);
      console.log(`\u23F0 Valid for: 5 minutes`);
      console.log(`\u{1F4C5} Generated at: ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
      console.log("=".repeat(50) + "\n");
      return true;
    } catch (error) {
      console.error("\u{1F4E7} Email sending failed with detailed error:");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Response code:", error.responseCode);
      console.error("Command:", error.command);
      console.error("Full error:", error);
      console.log("\n" + "=".repeat(50));
      console.log("\u{1F4E7} EMAIL OTP (Fallback - Console Output)");
      console.log("=".repeat(50));
      console.log(`\u{1F4E7} Email: ${email}`);
      console.log(`\u{1F510} OTP Code: ${otp}`);
      console.log(`\u23F0 Valid for: 5 minutes`);
      console.log(`\u{1F4C5} Generated at: ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
      console.log("=".repeat(50) + "\n");
      return true;
    }
  }
};

// server/routes.ts
init_schema();
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { drizzle as drizzle2 } from "drizzle-orm/node-postgres";
import { eq as eq2, desc as desc2, sql as sql2 } from "drizzle-orm";
import { Pool as Pool2 } from "pg";

// server/db-monitor.ts
var DatabaseMonitor = class {
  pool;
  constructor(pool3) {
    this.pool = pool3;
  }
  // Check slow queries
  async getSlowQueries(minDuration = 1e3) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          min_time,
          max_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        WHERE mean_time > $1
        ORDER BY total_time DESC
        LIMIT 20;
      `, [minDuration]);
      return result.rows;
    } catch (error) {
      console.log("pg_stat_statements extension not available");
      return [];
    } finally {
      client.release();
    }
  }
  // Check active connections
  async getActiveConnections() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          pid,
          usename,
          application_name,
          client_addr,
          backend_start,
          query_start,
          state,
          query,
          EXTRACT(EPOCH FROM (now() - query_start)) as query_duration_seconds
        FROM pg_stat_activity 
        WHERE state != 'idle'
        ORDER BY query_start DESC;
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }
  // Check for missing indexes
  async suggestIndexes() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats
        WHERE schemaname = 'public'
          AND n_distinct > 100
          AND correlation < 0.1
        ORDER BY n_distinct DESC;
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }
  // Kill long running queries
  async killLongRunningQueries(maxDurationMinutes = 30) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          pg_terminate_backend(pid),
          pid,
          query,
          EXTRACT(EPOCH FROM (now() - query_start))/60 as duration_minutes
        FROM pg_stat_activity 
        WHERE state != 'idle'
          AND EXTRACT(EPOCH FROM (now() - query_start))/60 > $1
          AND pid != pg_backend_pid();
      `, [maxDurationMinutes]);
      return result.rows;
    } finally {
      client.release();
    }
  }
};

// server/routes.ts
var rateLimitMap = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW = 6e4;
var RATE_LIMIT_MAX = 100;
function rateLimit(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  if (!rateLimitMap.has(clientIP)) {
    rateLimitMap.set(clientIP, []);
  }
  const requests = rateLimitMap.get(clientIP) || [];
  const recentRequests = requests.filter((time) => time > windowStart);
  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests" });
  }
  recentRequests.push(now);
  rateLimitMap.set(clientIP, recentRequests);
  if (Math.random() < 0.01) {
    const cutoff = now - RATE_LIMIT_WINDOW * 2;
    rateLimitMap.forEach((times, ip) => {
      const validTimes = times.filter((time) => time > cutoff);
      if (validTimes.length === 0) {
        rateLimitMap.delete(ip);
      } else {
        rateLimitMap.set(ip, validTimes);
      }
    });
  }
  next();
}
var pool2 = new Pool2({
  connectionString: process.env.DATABASE_URL || "postgresql://31.97.226.11:5432/my_pgdb?sslmode=disable",
  ssl: false,
  // force disable SSL
  max: 20,
  min: 2,
  idleTimeoutMillis: 3e5,
  // 5 minutes
  connectionTimeoutMillis: 1e4,
  acquireTimeoutMillis: 1e4,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
  allowExitOnIdle: false
});
var db2 = drizzle2(pool2);
var dbMonitor = new DatabaseMonitor(pool2);
pool2.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});
pool2.on("connect", () => {
  console.log("New database connection established");
});
pool2.on("remove", () => {
  console.log("Database connection removed from pool");
});
var CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || "cashfree_app_id";
var CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || "cashfree_secret_key";
var isProduction = process.env.CASHFREE_BASE_URL === "production" || process.env.CASHFREE_SECRET_KEY && process.env.CASHFREE_SECRET_KEY.includes("prod");
var CASHFREE_BASE_URL = isProduction ? "https://api.cashfree.com" : "https://sandbox.cashfree.com";
var CASHFREE_MODE = isProduction ? "production" : "sandbox";
var uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
var upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const timestamp2 = Date.now();
      const extension = path.extname(file.originalname);
      const filename = `${timestamp2}-${Math.random().toString(36).substring(7)}${extension}`;
      cb(null, filename);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024
    // 50MB limit for videos
  }
});
async function registerRoutes(app2) {
  app2.use("/api", rateLimit);
  app2.get("/api/health", async (req, res) => {
    let dbStatus = "disconnected";
    let poolStats = {};
    try {
      await db2.select().from(users).limit(1);
      dbStatus = "connected";
      poolStats = {
        totalCount: pool2.totalCount,
        idleCount: pool2.idleCount,
        waitingCount: pool2.waitingCount
      };
    } catch (error) {
      dbStatus = "disconnected";
    }
    res.json({
      status: "OK",
      message: "API server is running",
      database: dbStatus,
      poolStats,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime()
    });
  });
  app2.get("/api/admin/db/slow-queries", async (req, res) => {
    try {
      const minDuration = parseInt(req.query.minDuration) || 1e3;
      const slowQueries = await dbMonitor.getSlowQueries(minDuration);
      res.json(slowQueries);
    } catch (error) {
      console.error("Error fetching slow queries:", error);
      res.status(500).json({ error: "Failed to fetch slow queries" });
    }
  });
  app2.get("/api/admin/db/active-connections", async (req, res) => {
    try {
      const connections = await dbMonitor.getActiveConnections();
      res.json(connections);
    } catch (error) {
      console.error("Error fetching active connections:", error);
      res.status(500).json({ error: "Failed to fetch active connections" });
    }
  });
  app2.get("/api/admin/db/suggest-indexes", async (req, res) => {
    try {
      const suggestions = await dbMonitor.suggestIndexes();
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting index suggestions:", error);
      res.status(500).json({ error: "Failed to get index suggestions" });
    }
  });
  app2.post("/api/admin/db/kill-long-queries", async (req, res) => {
    try {
      const maxDuration = parseInt(req.body.maxDurationMinutes) || 30;
      const killedQueries = await dbMonitor.killLongRunningQueries(maxDuration);
      res.json({
        message: `Killed ${killedQueries.length} long running queries`,
        killedQueries
      });
    } catch (error) {
      console.error("Error killing long queries:", error);
      res.status(500).json({ error: "Failed to kill long running queries" });
    }
  });
  app2.get("/api/sliders", async (req, res) => {
    try {
      const activeSliders = await storage.getActiveSliders();
      res.json(activeSliders);
    } catch (error) {
      console.error("Error fetching public sliders:", error);
      console.log("Database unavailable, using sample slider data");
      res.json([
        {
          id: 1,
          imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400",
          isActive: true,
          sortOrder: 1
        },
        {
          id: 2,
          imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400",
          isActive: true,
          sortOrder: 2
        }
      ]);
    }
  });
  app2.post("/api/auth/signup", async (req, res) => {
    try {
      console.log("Signup request received:", {
        ...req.body,
        password: req.body.password ? "[HIDDEN]" : void 0,
        confirmPassword: req.body.confirmPassword ? "[HIDDEN]" : void 0
      });
      const { firstName, lastName, email, phone, password, confirmPassword, dateOfBirth, address, city, state, pinCode } = req.body;
      if (!firstName || !lastName || !email || !password || !dateOfBirth || !address) {
        console.log("Missing required fields:", { firstName: !!firstName, lastName: !!lastName, email: !!email, password: !!password, dateOfBirth: !!dateOfBirth, address: !!address });
        return res.status(400).json({ error: "All required fields must be provided" });
      }
      if (password !== confirmPassword) {
        console.log("Password mismatch during signup");
        return res.status(400).json({ error: "Passwords don't match" });
      }
      if (password.length < 6) {
        console.log("Password too short:", password.length);
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log("Invalid email format:", email);
        return res.status(400).json({ error: "Please provide a valid email address" });
      }
      console.log("Checking if user exists with email:", email);
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("User already exists with email:", email);
        return res.status(400).json({ error: "User already exists with this email" });
      }
      console.log("Hashing password...");
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log("Creating user in database...");
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        password: hashedPassword,
        dateOfBirth: dateOfBirth.trim(),
        address: `${address.trim()}${city ? `, ${city.trim()}` : ""}${state ? `, ${state.trim()}` : ""}${pinCode ? ` - ${pinCode.trim()}` : ""}`
      };
      console.log("User data to create:", {
        ...userData,
        password: "[HIDDEN]"
      });
      const user = await storage.createUser(userData);
      console.log("User created successfully with ID:", user.id);
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );
      const { password: _, ...userWithoutPassword } = user;
      console.log("Signup successful for user:", userWithoutPassword.email);
      res.status(201).json({
        message: "User created successfully",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error("Signup error details:", {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail,
        stack: process.env.NODE_ENV === "development" ? error.stack : void 0
      });
      if (error.code === "23505") {
        if (error.constraint && error.constraint.includes("email")) {
          return res.status(400).json({ error: "A user with this email already exists" });
        }
        return res.status(400).json({ error: "A user with this information already exists" });
      }
      if (error.code === "ECONNREFUSED") {
        return res.status(500).json({ error: "Database connection error. Please try again." });
      }
      if (error.message && error.message.includes("relation") && error.message.includes("does not exist")) {
        return res.status(500).json({ error: "Database table not found. Please contact support." });
      }
      res.status(500).json({
        error: "Failed to create user",
        details: process.env.NODE_ENV === "development" ? error.message : "Please try again or contact support if the problem persists."
      });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: "Login successful",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  app2.post("/api/auth/logout", (res) => {
    res.json({ message: "Logged out successfully" });
  });
  app2.post("/api/payments/cashfree/create-order", async (req, res) => {
    try {
      const { amount, orderId, currency, customerDetails, orderNote, orderData } = req.body;
      if (!amount || !orderId || !currency || !customerDetails) {
        return res.status(400).json({
          error: "Missing required fields: amount, orderId, currency, and customerDetails are required"
        });
      }
      if (!customerDetails.customerId || !customerDetails.customerName || !customerDetails.customerEmail) {
        return res.status(400).json({
          error: "customerDetails must include customerId, customerName, and customerEmail"
        });
      }
      if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY || CASHFREE_APP_ID === "cashfree_app_id" || CASHFREE_SECRET_KEY === "cashfree_secret_key") {
        console.log("Cashfree not configured properly");
        return res.status(400).json({
          error: "Cashfree payment gateway is not configured",
          configError: true
        });
      }
      console.log("Creating Cashfree order:", {
        orderId,
        amount,
        currency,
        customer: customerDetails.customerName
      });
      const host = req.get("host");
      let protocol = "https";
      if (host && (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("0.0.0.0"))) {
        protocol = req.protocol;
      }
      const forwardedProto = req.get("x-forwarded-proto") || req.get("x-forwarded-protocol") || req.get("x-url-scheme");
      if (forwardedProto === "https") {
        protocol = "https";
      }
      const cashfreePayload = {
        order_id: orderId,
        order_amount: amount,
        order_currency: currency,
        customer_details: {
          customer_id: customerDetails.customerId,
          customer_name: customerDetails.customerName,
          customer_email: customerDetails.customerEmail,
          customer_phone: customerDetails.customerPhone || "9999999999"
        },
        order_meta: {
          return_url: `${protocol}://${host}/checkout?payment=processing&orderId=${orderId}`,
          notify_url: `${protocol}://${host}/api/payments/cashfree/webhook`
        },
        order_note: orderNote || "Beauty Store Purchase"
      };
      console.log("Cashfree API URL:", `${CASHFREE_BASE_URL}/pg/orders`);
      console.log("Cashfree payload:", JSON.stringify(cashfreePayload, null, 2));
      const cashfreeResponse = await fetch(`${CASHFREE_BASE_URL}/pg/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY
        },
        body: JSON.stringify(cashfreePayload)
      });
      const cashfreeResult = await cashfreeResponse.json();
      console.log("Cashfree API response status:", cashfreeResponse.status);
      console.log("Cashfree API response:", JSON.stringify(cashfreeResult, null, 2));
      if (!cashfreeResponse.ok) {
        console.error("Cashfree API error:", cashfreeResult);
        return res.status(400).json({
          error: cashfreeResult.message || "Failed to create Cashfree order",
          cashfreeError: true,
          details: cashfreeResult
        });
      }
      try {
        await db2.insert(cashfreePayments).values({
          cashfreeOrderId: orderId,
          userId: parseInt(customerDetails.customerId),
          amount,
          status: "created",
          orderData: orderData || {},
          customerInfo: customerDetails
        });
      } catch (dbError) {
        console.error("Database error storing payment:", dbError);
      }
      res.json({
        orderId,
        paymentSessionId: cashfreeResult.payment_session_id,
        environment: CASHFREE_MODE,
        message: "Order created successfully"
      });
    } catch (error) {
      console.error("Cashfree create order error:", error);
      res.status(500).json({
        error: "Failed to create payment order",
        details: error.message
      });
    }
  });
  app2.post("/api/payments/cashfree/verify", async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }
      console.log("Verifying payment for order:", orderId);
      if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY || CASHFREE_APP_ID === "cashfree_app_id" || CASHFREE_SECRET_KEY === "cashfree_secret_key") {
        return res.status(400).json({
          error: "Cashfree payment gateway is not configured",
          verified: false
        });
      }
      const statusResponse = await fetch(`${CASHFREE_BASE_URL}/pg/orders/${orderId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY
        }
      });
      const statusResult = await statusResponse.json();
      console.log("Payment verification response:", JSON.stringify(statusResult, null, 2));
      if (!statusResponse.ok) {
        console.error("Cashfree verification error:", statusResult);
        return res.json({
          verified: false,
          error: "Failed to verify payment status"
        });
      }
      const isPaymentSuccessful = statusResult.order_status === "PAID";
      try {
        await db2.update(cashfreePayments).set({
          status: isPaymentSuccessful ? "completed" : "failed",
          paymentId: statusResult.cf_order_id || null,
          completedAt: isPaymentSuccessful ? /* @__PURE__ */ new Date() : null
        }).where(eq2(cashfreePayments.cashfreeOrderId, orderId));
      } catch (dbError) {
        console.error("Database error updating payment:", dbError);
      }
      res.json({
        verified: isPaymentSuccessful,
        status: statusResult.order_status,
        paymentId: statusResult.cf_order_id,
        message: isPaymentSuccessful ? "Payment verified successfully" : "Payment verification failed"
      });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.json({
        verified: false,
        error: "Payment verification failed"
      });
    }
  });
  app2.post("/api/auth/send-mobile-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
      if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ""))) {
        return res.status(400).json({ error: "Please enter a valid Indian mobile number" });
      }
      const result = await OTPService.sendMobileOTP(phoneNumber);
      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(500).json({ error: result.message });
      }
    } catch (error) {
      console.error("Send mobile OTP error:", error);
      res.status(500).json({ error: "Failed to send mobile OTP" });
    }
  });
  app2.post("/api/auth/verify-mobile-otp", async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body;
      if (!phoneNumber || !otp) {
        return res.status(400).json({ error: "Phone number and OTP are required" });
      }
      if (otp.length !== 6) {
        return res.status(400).json({ error: "Please enter valid 6-digit OTP" });
      }
      const result = await OTPService.verifyMobileOTP(phoneNumber, otp);
      if (result.success) {
        res.json({
          verified: true,
          message: result.message
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error("Verify mobile OTP error:", error);
      res.status(500).json({ error: "Failed to verify mobile OTP" });
    }
  });
  app2.get("/api/auth/test-sms-service", async (req, res) => {
    try {
      if (!process.env.MDSSEND_API_KEY || !process.env.MDSSEND_SENDER_ID) {
        return res.status(400).json({
          success: false,
          message: "SMS service not configured",
          issues: [
            "Missing MDSSEND_API_KEY environment variable",
            "Missing MDSSEND_SENDER_ID environment variable"
          ]
        });
      }
      const testPhone = req.query.phone || "9999999999";
      console.log("\u{1F9EA} Testing SMS service with phone:", testPhone);
      const result = await OTPService.sendMobileOTP(testPhone.toString());
      res.json({
        success: result.success,
        message: result.message,
        testPhone,
        details: {
          apiUrl: "http://13.234.156.238/v1/sms/send",
          configured: true,
          apiKeyLength: process.env.MDSSEND_API_KEY?.length,
          senderId: process.env.MDSSEND_SENDER_ID,
          templateId: process.env.MDSSEND_TEMPLATE_ID || "Not set"
        }
      });
    } catch (error) {
      console.error("SMS test error:", error);
      res.status(500).json({
        success: false,
        message: "SMS service test failed",
        error: error.message,
        details: {
          configured: !!process.env.MDSSEND_API_KEY && !!process.env.MDSSEND_SENDER_ID,
          possibleIssues: [
            "Invalid API credentials",
            "Network connectivity issues",
            "MDSSEND.IN API is down",
            "Incorrect API endpoint URL",
            "Phone number format issues"
          ]
        }
      });
    }
  });
  app2.get("/api/auth/test-network", async (req, res) => {
    try {
      const testUrls = [
        "http://13.234.156.238",
        "https://api.mdssend.in",
        "http://api.mdssend.in",
        "https://www.google.com"
      ];
      const results = [];
      for (const url of testUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1e4);
          const start = Date.now();
          const response = await fetch(url, {
            method: "GET",
            signal: controller.signal
          });
          const duration = Date.now() - start;
          clearTimeout(timeoutId);
          results.push({
            url,
            status: response.status,
            success: response.ok,
            duration: `${duration}ms`
          });
        } catch (error) {
          results.push({
            url,
            success: false,
            error: error.message
          });
        }
      }
      res.json({
        message: "Network connectivity test completed",
        results,
        environment: process.env.NODE_ENV || "development",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: "Network test failed",
        details: error.message
      });
    }
  });
  app2.get("/api/auth/get-mobile-otp/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const cleanedPhone = phoneNumber.replace(/\D/g, "");
      const formattedPhone = cleanedPhone.startsWith("91") && cleanedPhone.length === 12 ? cleanedPhone.substring(2) : cleanedPhone;
      const otpData = OTPService.otpStorage.get(formattedPhone);
      if (otpData && /* @__PURE__ */ new Date() <= otpData.expiresAt) {
        res.json({
          otp: otpData.otp,
          phoneNumber: formattedPhone,
          expiresAt: otpData.expiresAt,
          remainingTime: Math.max(0, Math.floor((otpData.expiresAt.getTime() - Date.now()) / 1e3))
        });
      } else {
        res.status(404).json({ error: "No valid OTP found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get OTP" });
    }
  });
  app2.get("/api/auth/debug-otp/:phoneNumber", async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const cleanedPhone = phoneNumber.replace(/\D/g, "");
      const formattedPhone = cleanedPhone.startsWith("91") && cleanedPhone.length === 12 ? cleanedPhone.substring(2) : cleanedPhone;
      const otpData = OTPService.otpStorage.get(formattedPhone);
      if (otpData && /* @__PURE__ */ new Date() <= otpData.expiresAt) {
        res.json({
          success: true,
          otp: otpData.otp,
          phoneNumber: formattedPhone,
          expiresAt: otpData.expiresAt,
          remainingTime: Math.max(0, Math.floor((otpData.expiresAt.getTime() - Date.now()) / 1e3))
        });
      } else {
        res.json({
          success: false,
          error: "No valid OTP found",
          phoneNumber: formattedPhone
        });
      }
    } catch (error) {
      res.json({
        success: false,
        error: "Failed to get OTP",
        details: error.message
      });
    }
  });
  app2.post("/api/auth/test-direct-sms", async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      console.log("\u{1F9EA} Direct SMS Test - Phone:", phoneNumber);
      console.log("\u{1F9EA} Direct SMS Test - Message:", message || "Test message");
      if (!process.env.MDSSEND_API_KEY || !process.env.MDSSEND_SENDER_ID) {
        return res.status(400).json({
          error: "SMS service not configured properly",
          details: {
            apiKey: !!process.env.MDSSEND_API_KEY,
            senderId: !!process.env.MDSSEND_SENDER_ID
          }
        });
      }
      const apiKey = process.env.MDSSEND_API_KEY;
      const senderId = process.env.MDSSEND_SENDER_ID;
      const templateId = process.env.MDSSEND_TEMPLATE_ID || "";
      const cleanedPhone = phoneNumber.replace(/\D/g, "");
      const formattedPhone = cleanedPhone.startsWith("91") ? cleanedPhone : `91${cleanedPhone}`;
      const testMessage = message || `Test SMS from Poppik Beauty Store at ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN")}`;
      const requestData = {
        apikey: apiKey,
        sender: senderId,
        message: testMessage,
        numbers: formattedPhone,
        ...templateId && { templateid: templateId }
      };
      console.log("\u{1F517} Sending to:", `http://13.234.156.238/v1/sms/send`);
      console.log("\u{1F4DD} Request payload:", JSON.stringify(requestData, null, 2));
      const response = await fetch("http://13.234.156.238/v1/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Poppik-Beauty-Store-Test/1.0",
          "Accept": "application/json"
        },
        body: JSON.stringify(requestData)
      });
      const result = await response.json();
      console.log("\u{1F4F1} MDSSEND.IN Response Status:", response.status);
      console.log("\u{1F4F1} MDSSEND.IN Response:", JSON.stringify(result, null, 2));
      res.json({
        success: response.ok,
        status: response.status,
        response: result,
        requestData: {
          ...requestData,
          apikey: `${apiKey.substring(0, 8)}****`
          // Hide full API key
        },
        formattedPhone,
        message: testMessage
      });
    } catch (error) {
      console.error("Direct SMS test error:", error);
      res.status(500).json({
        error: error.message,
        details: "Failed to send direct SMS test"
      });
    }
  });
  app2.put("/api/users/:id", async (req, res) => {
    try {
      console.log(`PUT /api/users/${req.params.id} - Request received`);
      console.log("Request body:", req.body);
      console.log("Request headers:", req.headers);
      res.setHeader("Content-Type", "application/json");
      const { id } = req.params;
      const { firstName, lastName, phone, dateOfBirth, address } = req.body;
      console.log(`Updating user ${id} with:`, { firstName, lastName, phone });
      if (!firstName || !lastName) {
        return res.status(400).json({ error: "First name and last name are required" });
      }
      const userId = parseInt(id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const updatedUser = await storage.updateUser(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? phone.trim() : null,
        dateOfBirth: dateOfBirth ? dateOfBirth.trim() : null,
        address: address ? address.trim() : null
      });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      console.log("User updated successfully:", updatedUser);
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({
        message: "Profile updated successfully",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile", details: error.message });
    }
  });
  app2.put("/api/users/:id/password", async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      const user = await storage.getUserById(parseInt(id));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(parseInt(id), hashedNewPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });
  app2.use("/api/images", (req, res, next) => {
    const imagePath = path.join(uploadsDir, req.path.split("?")[0]);
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Image not found" });
    }
    const { w: width, h: height, q: quality, format } = req.query;
    const extension = path.extname(imagePath).toLowerCase();
    let contentType = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp"
    }[extension] || "image/jpeg";
    if (format === "webp") contentType = "image/webp";
    if (format === "jpeg") contentType = "image/jpeg";
    if (format === "png") contentType = "image/png";
    const params = `${width || ""}-${height || ""}-${quality || ""}-${format || ""}`;
    const cacheKey = `${req.path}-${params}`;
    const fileStats = fs.statSync(imagePath);
    res.set({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      // 1 year with immutable
      "ETag": `"${cacheKey}-${fileStats.mtime.getTime()}"`,
      "Last-Modified": fileStats.mtime.toUTCString(),
      "Vary": "Accept-Encoding"
    });
    const ifNoneMatch = req.headers["if-none-match"];
    const ifModifiedSince = req.headers["if-modified-since"];
    const etag = res.getHeader("ETag");
    const lastModified = res.getHeader("Last-Modified");
    if (ifNoneMatch && ifNoneMatch === etag || ifModifiedSince && new Date(ifModifiedSince) >= new Date(lastModified)) {
      return res.status(304).end();
    }
    if (width || height || quality || format) {
      try {
        let pipeline = sharp(imagePath);
        if (width || height) {
          pipeline = pipeline.resize(
            width ? parseInt(width) : void 0,
            height ? parseInt(height) : void 0,
            {
              fit: "cover",
              position: "center",
              withoutEnlargement: true
            }
          );
        }
        const qual = quality ? parseInt(quality) : 80;
        if (format === "webp") {
          pipeline = pipeline.webp({ quality: qual });
        } else if (format === "jpeg" || extension === ".jpg" || extension === ".jpeg") {
          pipeline = pipeline.jpeg({ quality: qual, progressive: true });
        } else if (format === "png" || extension === ".png") {
          pipeline = pipeline.png({ quality: qual, progressive: true });
        }
        pipeline.pipe(res);
      } catch (error) {
        console.error("Image processing error:", error);
        res.sendFile(imagePath);
      }
    } else {
      res.sendFile(imagePath);
    }
  });
  app2.post("/api/upload/image", upload.single("image"), async (req, res) => {
    try {
      console.log("Image upload request received");
      if (!req.file) {
        console.error("No image file provided in request");
        return res.status(400).json({ error: "No image file provided" });
      }
      console.log("Image uploaded successfully:", {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      const imageUrl = `/api/images/${req.file.filename}`;
      res.json({
        imageUrl,
        message: "Image uploaded successfully",
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({
        error: "Failed to upload image",
        details: error.message
      });
    }
  });
  app2.post("/api/admin/upload-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }
      const imageUrl = `/api/images/${req.file.filename}`;
      res.json({
        success: true,
        imageUrl,
        message: "Image uploaded successfully"
      });
    } catch (error) {
      console.error("Admin image upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });
  app2.get("/api/products", async (req, res) => {
    try {
      const products2 = await storage.getProducts();
      const productsWithImages = await Promise.all(
        products2.map(async (product) => {
          const images = await storage.getProductImages(product.id);
          return {
            ...product,
            images: images.map((img) => ({
              id: img.id,
              url: img.imageUrl,
              isPrimary: img.isPrimary,
              sortOrder: img.sortOrder
            }))
          };
        })
      );
      res.json(productsWithImages);
    } catch (error) {
      console.log("Database unavailable, using sample product data");
      res.json(generateSampleProducts());
    }
  });
  app2.post("/api/products", async (req, res) => {
    try {
      console.log("Received product data:", req.body);
      res.setHeader("Content-Type", "application/json");
      const { name, price, category, description } = req.body;
      if (!name || !price || !category || !description) {
        return res.status(400).json({
          error: "Missing required fields: name, price, category, and description are required"
        });
      }
      if (name.trim().length === 0 || description.trim().length === 0) {
        return res.status(400).json({
          error: "Name and description cannot be empty"
        });
      }
      if (isNaN(Number(price)) || Number(price) <= 0) {
        return res.status(400).json({
          error: "Price must be a valid positive number"
        });
      }
      const productData = {
        ...req.body,
        price: Number(price),
        rating: Number(req.body.rating) || 4,
        reviewCount: Number(req.body.reviewCount) || 0,
        inStock: Boolean(req.body.inStock ?? true),
        featured: Boolean(req.body.featured ?? false),
        bestseller: Boolean(req.body.bestseller ?? false),
        newLaunch: Boolean(req.body.newLaunch ?? false)
      };
      console.log("Creating product with processed data:", productData);
      const product = await storage.createProduct(productData);
      console.log("Product created successfully:", product);
      res.status(201).json(product);
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(500).json({
        error: "Failed to create product",
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : void 0
      });
    }
  });
  app2.get("/api/products/featured", async (req, res) => {
    try {
      const products2 = await storage.getFeaturedProducts();
      res.json(products2);
    } catch (error) {
      console.log("Database unavailable, using sample featured products");
      const sampleProducts = generateSampleProducts();
      res.json(sampleProducts.filter((p) => p.featured));
    }
  });
  app2.get("/api/products/bestsellers", async (req, res) => {
    try {
      const products2 = await storage.getBestsellerProducts();
      res.json(products2);
    } catch (error) {
      console.log("Database unavailable, using sample bestseller products");
      const sampleProducts = generateSampleProducts();
      res.json(sampleProducts.filter((p) => p.bestseller));
    }
  });
  app2.get("/api/products/new-launches", async (req, res) => {
    try {
      const products2 = await storage.getNewLaunchProducts();
      res.json(products2);
    } catch (error) {
      console.log("Database unavailable, using sample new launch products");
      const sampleProducts = generateSampleProducts();
      res.json(sampleProducts.filter((p) => p.newLaunch));
    }
  });
  app2.get("/api/products/subcategory/:subcategory", async (req, res) => {
    try {
      const { subcategory } = req.params;
      const allProducts = await storage.getProducts();
      const subcategorySlug = subcategory.toLowerCase().replace(/[-\s]+/g, " ").trim();
      const uniqueProducts = /* @__PURE__ */ new Map();
      allProducts.forEach((product) => {
        if (!product.subcategory) return;
        const productSubcategory = product.subcategory.toLowerCase().trim();
        const normalizedProductSub = productSubcategory.replace(/[-\s]+/g, " ").trim();
        if (normalizedProductSub === subcategorySlug) {
          uniqueProducts.set(product.id, product);
        }
      });
      res.json(Array.from(uniqueProducts.values()));
    } catch (error) {
      console.log("Database unavailable, using sample product data with subcategory filter");
      const sampleProducts = generateSampleProducts();
      const { subcategory } = req.params;
      const subcategorySlug = subcategory.toLowerCase().replace("-", " ");
      const filteredSampleProducts = sampleProducts.filter((product) => {
        if (!product.subcategory) return false;
        const productSubcategory = product.subcategory.toLowerCase();
        return productSubcategory === subcategorySlug || productSubcategory.replace(/[-\s]+/g, " ") === subcategorySlug.replace(/[-\s]+/g, " ");
      });
      res.json(filteredSampleProducts);
    }
  });
  app2.get("/api/products/subcategory/id/:subcategoryId", async (req, res) => {
    try {
      const { subcategoryId } = req.params;
      console.log("Fetching products for subcategory ID:", subcategoryId);
      const subcategory = await storage.getSubcategoryById(parseInt(subcategoryId));
      if (!subcategory) {
        console.log("Subcategory not found:", subcategoryId);
        return res.status(404).json({ error: "Subcategory not found" });
      }
      console.log("Found subcategory:", subcategory.name);
      const allProducts = await storage.getProducts();
      const filteredProducts = allProducts.filter((product) => {
        if (!product.subcategory) return false;
        const productSubcategory = product.subcategory.toLowerCase().trim().replace(/\s+/g, " ");
        const targetSubcategory = subcategory.name.toLowerCase().trim().replace(/\s+/g, " ");
        if (productSubcategory === targetSubcategory) return true;
        const variations = [
          targetSubcategory.replace(/\s/g, ""),
          // No spaces
          targetSubcategory.replace(/\s/g, "-"),
          // Dashes instead of spaces
          targetSubcategory.replace(/-/g, " ")
          // Spaces instead of dashes
        ];
        return variations.some(
          (variation) => productSubcategory === variation || productSubcategory.replace(/\s/g, "") === variation.replace(/\s/g, "")
        );
      });
      console.log(`Found ${filteredProducts.length} products for subcategory "${subcategory.name}"`);
      res.json(filteredProducts);
    } catch (error) {
      console.error("Error fetching products by subcategory ID:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  app2.get("/api/products/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      console.log("Fetching products for category:", category);
      const allProducts = await storage.getProducts();
      console.log("Total products available:", allProducts.length);
      const filteredProducts = allProducts.filter((product) => {
        if (!product.category) return false;
        const productCategory = product.category.toLowerCase().trim();
        const searchCategory = category.toLowerCase().trim();
        console.log(`Comparing product category "${productCategory}" with search "${searchCategory}"`);
        if (productCategory === searchCategory) return true;
        if (productCategory.includes(searchCategory) || searchCategory.includes(productCategory)) return true;
        const categoryMappings = {
          "skincare": ["skin", "face", "facial"],
          "haircare": ["hair"],
          "makeup": ["cosmetics", "beauty"],
          "bodycare": ["body"],
          "eyecare": ["eye", "eyes", "eyecare", "eye care", "eye-care"],
          "eye-care": ["eye", "eyes", "eyecare", "eye care"],
          "eyes-care": ["eye", "eyes", "eyecare", "eye care"],
          "eye care": ["eye", "eyes", "eyecare", "eye-care"],
          "eyes": ["eye", "eyecare", "eye care", "eye-care"],
          "lipcare": ["lip", "lips", "lip care", "lip-care"],
          "lip-care": ["lip", "lips", "lipcare", "lip care"],
          "lip care": ["lip", "lips", "lipcare", "lip-care"],
          "lips": ["lip", "lipcare", "lip care", "lip-care"],
          "beauty": ["makeup", "cosmetics", "skincare"]
        };
        const mappedCategories = categoryMappings[searchCategory] || [];
        if (mappedCategories.some((mapped) => productCategory.includes(mapped))) return true;
        const reverseMappings = Object.entries(categoryMappings).find(
          ([key, values]) => values.includes(searchCategory)
        );
        if (reverseMappings && productCategory.includes(reverseMappings[0])) return true;
        return false;
      });
      console.log(`Found ${filteredProducts.length} products for category "${category}"`);
      res.json(filteredProducts);
    } catch (error) {
      console.log("Database unavailable, using sample product data with category filter");
      const sampleProducts = generateSampleProducts();
      const { category } = req.params;
      const searchCategory = category.toLowerCase().trim();
      const filteredSampleProducts = sampleProducts.filter((product) => {
        if (!product.category) return false;
        const productCategory = product.category.toLowerCase().trim();
        if (productCategory === searchCategory) return true;
        if (productCategory.includes(searchCategory) || searchCategory.includes(productCategory)) return true;
        const categoryMappings = {
          "lips": ["lip", "lipcare", "lip care", "lip-care"],
          "lip": ["lips", "lipcare", "lip care", "lip-care"],
          "lipcare": ["lip", "lips", "lip care", "lip-care"],
          "lip-care": ["lip", "lips", "lipcare", "lip care"],
          "lip care": ["lip", "lips", "lipcare", "lip-care"],
          "eyes": ["eye", "eyecare", "eye care", "eye-care"],
          "eye-care": ["eye", "eyes", "eyecare"],
          "eyecare": ["eye", "eyes", "eye care", "eye-care"],
          "face": ["facial", "foundation", "concealer"],
          "skincare": ["skin", "serum", "cleanser"]
        };
        const mappedCategories = categoryMappings[searchCategory] || [];
        if (mappedCategories.some((mapped) => productCategory.includes(mapped))) return true;
        const reverseMappings = Object.entries(categoryMappings).find(
          ([key, values]) => values.includes(searchCategory)
        );
        if (reverseMappings && productCategory.includes(reverseMappings[0])) return true;
        return false;
      });
      console.log(`Sample data: Found ${filteredSampleProducts.length} products for category "${category}"`);
      res.json(filteredSampleProducts);
    }
  });
  app2.get("/api/products/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const product = await storage.getProductBySlug(slug);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });
  app2.get("/api/categories", async (req, res) => {
    try {
      const categories2 = await storage.getCategories();
      const categoriesWithCount = await Promise.all(
        categories2.map(async (category) => {
          const products2 = await storage.getProductsByCategory(category.name);
          return {
            ...category,
            productCount: products2.length
          };
        })
      );
      res.json(categoriesWithCount);
    } catch (error) {
      console.log("Database unavailable, using sample category data");
      res.json(generateSampleCategories());
    }
  });
  app2.get("/api/categories/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const category = await storage.getCategoryBySlug(slug);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });
  app2.post("/api/categories", async (req, res) => {
    try {
      console.log("Received category data:", req.body);
      res.setHeader("Content-Type", "application/json");
      const { name, description } = req.body;
      if (!name || !description) {
        return res.status(400).json({
          error: "Missing required fields: name and description are required"
        });
      }
      if (name.trim().length === 0 || description.trim().length === 0) {
        return res.status(400).json({
          error: "Name and description cannot be empty"
        });
      }
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const imageUrl = req.body.imageUrl || "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400";
      const categoryData = {
        name: name.trim(),
        slug,
        description: description.trim(),
        imageUrl,
        status: req.body.status || "Active",
        productCount: parseInt(req.body.productCount) || 0
      };
      console.log("Creating category with processed data:", categoryData);
      const category = await storage.createCategory(categoryData);
      console.log("Category created successfully:", category);
      res.status(201).json(category);
    } catch (error) {
      console.error("Category creation error:", error);
      res.status(500).json({
        error: "Failed to create category",
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : void 0
      });
    }
  });
  app2.put("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.updateCategory(parseInt(id), req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to update category" });
    }
  });
  app2.delete("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCategory(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
  app2.get("/api/subcategories", async (req, res) => {
    try {
      const subcategories2 = await storage.getSubcategories();
      res.json(subcategories2);
    } catch (error) {
      console.log("Database unavailable, using sample subcategory data");
      res.json(generateSampleSubcategories());
    }
  });
  app2.get("/api/categories/:slug/subcategories", async (req, res) => {
    try {
      const { slug } = req.params;
      console.log("Fetching subcategories for category:", slug);
      const category = await storage.getCategoryBySlug(slug);
      if (!category) {
        console.log("Category not found:", slug);
        return res.status(404).json({ error: "Category not found" });
      }
      console.log("Found category:", category.name);
      const subcategories2 = await storage.getSubcategoriesByCategory(category.id);
      const allProducts = await storage.getProducts();
      const subcategoriesWithCount = subcategories2.map((subcategory) => {
        const productCount = allProducts.filter(
          (product) => product.subcategory && product.subcategory.toLowerCase().trim() === subcategory.name.toLowerCase().trim()
        ).length;
        return {
          ...subcategory,
          productCount
        };
      });
      console.log(`Found ${subcategoriesWithCount.length} subcategories for category "${category.name}"`);
      res.json(subcategoriesWithCount);
    } catch (error) {
      console.error("Error fetching subcategories for category:", error);
      const { slug } = req.params;
      const sampleSubcategories = generateSampleSubcategoriesForCategory(slug);
      res.json(sampleSubcategories);
    }
  });
  app2.get("/api/subcategories/category/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const subcategories2 = await storage.getSubcategoriesByCategory(parseInt(categoryId));
      res.json(subcategories2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subcategories" });
    }
  });
  app2.get("/api/subcategories/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const subcategory = await storage.getSubcategoryBySlug(slug);
      if (!subcategory) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      res.json(subcategory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subcategory" });
    }
  });
  app2.post("/api/subcategories", async (req, res) => {
    try {
      console.log("Creating subcategory with data:", req.body);
      res.setHeader("Content-Type", "application/json");
      const { name, categoryId, description } = req.body;
      if (!name || !categoryId || !description) {
        return res.status(400).json({
          error: "Missing required fields: name, categoryId, and description are required"
        });
      }
      if (name.trim().length === 0 || description.trim().length === 0) {
        return res.status(400).json({
          error: "Name and description cannot be empty"
        });
      }
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const subcategoryData = {
        name: name.trim(),
        slug,
        description: description.trim(),
        categoryId: Number(categoryId),
        status: req.body.status || "Active",
        productCount: parseInt(req.body.productCount) || 0
      };
      console.log("Creating subcategory with processed data:", subcategoryData);
      const subcategory = await storage.createSubcategory(subcategoryData);
      console.log("Subcategory created successfully:", subcategory);
      res.status(201).json(subcategory);
    } catch (error) {
      console.error("Subcategory creation error:", error);
      let errorMessage = "Failed to create subcategory";
      if (error.message) {
        errorMessage = error.message;
      }
      if (error.message && error.message.includes("unique constraint")) {
        errorMessage = "A subcategory with this name or slug already exists";
      } else if (error.message && error.message.includes("foreign key constraint")) {
        errorMessage = "Invalid category selected. Please choose a valid category.";
      } else if (error.message && error.message.includes("ECONNREFUSED")) {
        errorMessage = "Database connection error. Please try again later.";
      }
      res.status(500).json({
        error: errorMessage,
        details: error.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error.stack : void 0
      });
    }
  });
  app2.put("/api/subcategories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const subcategory = await storage.updateSubcategory(parseInt(id), req.body);
      if (!subcategory) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      res.json(subcategory);
    } catch (error) {
      res.status(500).json({ error: "Failed to update subcategory" });
    }
  });
  app2.delete("/api/subcategories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSubcategory(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Subcategory not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete subcategory" });
    }
  });
  app2.get("/api/admin/orders", async (req, res) => {
    try {
      let orders;
      try {
        orders = await db2.select().from(ordersTable).orderBy(desc2(ordersTable.createdAt));
      } catch (dbError) {
        console.log("Database unavailable, using sample data");
        const sampleOrders = generateSampleOrders();
        return res.json(sampleOrders);
      }
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const items = await db2.select({
            id: orderItemsTable.id,
            name: orderItemsTable.productName,
            quantity: orderItemsTable.quantity,
            price: orderItemsTable.price,
            image: orderItemsTable.productImage
          }).from(orderItemsTable).where(eq2(orderItemsTable.orderId, order.id));
          const user = await db2.select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone
          }).from(users).where(eq2(users.id, order.userId)).limit(1);
          const userData = user[0] || { firstName: "Unknown", lastName: "Customer", email: "unknown@email.com", phone: "N/A" };
          return {
            id: `ORD-${order.id.toString().padStart(3, "0")}`,
            customer: {
              name: `${userData.firstName} ${userData.lastName}`,
              email: userData.email,
              phone: userData.phone || "N/A",
              address: order.shippingAddress
            },
            date: order.createdAt.toISOString().split("T")[0],
            total: `\u20B9${order.totalAmount}`,
            status: order.status,
            items: items.length,
            paymentMethod: order.paymentMethod,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery?.toISOString().split("T")[0],
            products: items,
            userId: order.userId,
            totalAmount: order.totalAmount,
            shippingAddress: order.shippingAddress
          };
        })
      );
      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  app2.post("/api/orders/:id/notify", async (req, res) => {
    try {
      const orderId = req.params.id.replace("ORD-", "");
      const { status } = req.body;
      const order = await db2.select().from(ordersTable).where(eq2(ordersTable.id, Number(orderId))).limit(1);
      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      const user = await db2.select().from(users).where(eq2(users.id, order[0].userId)).limit(1);
      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      console.log(`Sending ${status} notification to ${user[0].email} for order ORD-${orderId}`);
      const notifications = {
        pending: "Your order has been received and is being processed.",
        processing: "Your order is being prepared for shipment.",
        shipped: "Your order has been shipped and is on its way!",
        delivered: "Your order has been delivered successfully.",
        cancelled: "Your order has been cancelled."
      };
      res.json({
        message: "Notification sent successfully",
        notification: notifications[status] || "Order status updated"
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });
  app2.get("/api/orders", async (req, res) => {
    try {
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const orders = await db2.select().from(ordersTable).where(eq2(ordersTable.userId, Number(userId))).orderBy(desc2(ordersTable.createdAt));
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await db2.select({
            id: orderItemsTable.id,
            name: orderItemsTable.productName,
            quantity: orderItemsTable.quantity,
            price: orderItemsTable.price,
            image: orderItemsTable.productImage
          }).from(orderItemsTable).where(eq2(orderItemsTable.orderId, order.id));
          return {
            id: `ORD-${order.id.toString().padStart(3, "0")}`,
            date: order.createdAt.toISOString().split("T")[0],
            status: order.status,
            total: `\u20B9${order.totalAmount}`,
            items,
            trackingNumber: order.trackingNumber,
            estimatedDelivery: order.estimatedDelivery?.toISOString().split("T")[0],
            shippingAddress: order.shippingAddress,
            paymentMethod: order.paymentMethod,
            userId: order.userId
          };
        })
      );
      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  app2.get("/api/orders/:id", async (req, res) => {
    try {
      const orderId = req.params.id.replace("ORD-", "");
      const order = await db2.select().from(ordersTable).where(eq2(ordersTable.id, Number(orderId))).limit(1);
      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      const items = await db2.select({
        id: orderItemsTable.id,
        name: orderItemsTable.productName,
        quantity: orderItemsTable.quantity,
        price: orderItemsTable.price,
        image: orderItemsTable.productImage
      }).from(orderItemsTable).where(eq2(orderItemsTable.orderId, order[0].id));
      const orderWithItems = {
        id: `ORD-${order[0].id.toString().padStart(3, "0")}`,
        date: order[0].createdAt.toISOString().split("T")[0],
        status: order[0].status,
        total: `\u20B9${order[0].totalAmount}`,
        items,
        trackingNumber: order[0].trackingNumber,
        estimatedDelivery: order[0].estimatedDelivery?.toISOString().split("T")[0],
        shippingAddress: order[0].shippingAddress,
        paymentMethod: order[0].paymentMethod,
        userId: order[0].userId
      };
      res.json(orderWithItems);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });
  app2.post("/api/orders/sample", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }
      const existingOrders = await db2.select().from(ordersTable).where(eq2(ordersTable.userId, Number(userId)));
      if (existingOrders.length > 0) {
        return res.json({ message: "User already has orders", orders: existingOrders.length });
      }
      const now = /* @__PURE__ */ new Date();
      const sampleOrders = [
        {
          userId: Number(userId),
          totalAmount: 1299,
          status: "delivered",
          paymentMethod: "Credit Card",
          shippingAddress: "123 Beauty Street, Mumbai, Maharashtra 400001",
          trackingNumber: "TRK001234567",
          estimatedDelivery: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1e3),
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1e3)
        },
        {
          userId: Number(userId),
          totalAmount: 899,
          status: "shipped",
          paymentMethod: "UPI",
          shippingAddress: "456 Glow Avenue, Delhi, Delhi 110001",
          trackingNumber: "TRK001234568",
          estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1e3),
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1e3)
        },
        {
          userId: Number(userId),
          totalAmount: 1599,
          status: "processing",
          paymentMethod: "Net Banking",
          shippingAddress: "789 Skincare Lane, Bangalore, Karnataka 560001",
          trackingNumber: null,
          estimatedDelivery: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3),
          createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1e3)
        }
      ];
      const createdOrders = await db2.insert(ordersTable).values(sampleOrders).returning();
      const sampleItems = [];
      await db2.insert(orderItemsTable).values(sampleItems);
      res.json({ message: "Sample orders created successfully", orders: createdOrders.length });
    } catch (error) {
      console.error("Error creating sample orders:", error);
      res.status(500).json({ error: "Failed to create sample orders" });
    }
  });
  app2.put("/api/orders/:id/status", async (req, res) => {
    try {
      const orderId = req.params.id.replace("ORD-", "");
      const { status, trackingNumber } = req.body;
      const updateData = { status };
      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }
      await db2.update(ordersTable).set(updateData).where(eq2(ordersTable.id, Number(orderId)));
      res.json({ message: "Order status updated successfully" });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });
  app2.get("/api/orders/:id/tracking", async (req, res) => {
    try {
      const orderId = req.params.id.replace("ORD-", "");
      const order = await db2.select().from(ordersTable).where(eq2(ordersTable.id, Number(orderId))).limit(1);
      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      const orderData = order[0];
      const trackingTimeline = generateTrackingTimeline(orderData.status, orderData.createdAt, orderData.estimatedDelivery);
      const trackingInfo = {
        orderId: `ORD-${orderData.id.toString().padStart(3, "0")}`,
        status: orderData.status,
        trackingNumber: orderData.trackingNumber,
        estimatedDelivery: orderData.estimatedDelivery?.toISOString().split("T")[0],
        timeline: trackingTimeline,
        currentStep: getCurrentStep(orderData.status),
        totalAmount: orderData.totalAmount,
        shippingAddress: orderData.shippingAddress,
        createdAt: orderData.createdAt.toISOString().split("T")[0]
      };
      res.json(trackingInfo);
    } catch (error) {
      console.error("Error fetching tracking info:", error);
      res.status(500).json({ error: "Failed to fetch tracking information" });
    }
  });
  function generateTrackingTimeline(status, createdAt, estimatedDelivery) {
    const timeline = [
      {
        step: "Order Placed",
        status: "completed",
        date: createdAt.toISOString().split("T")[0],
        time: createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        description: "Your order has been placed successfully"
      }
    ];
    const orderDate = new Date(createdAt);
    if (status === "processing" || status === "shipped" || status === "delivered") {
      timeline.push({
        step: "Processing",
        status: "completed",
        date: new Date(orderDate.getTime() + 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        time: "10:00 AM",
        description: "Your order is being prepared for shipment"
      });
    } else if (status === "pending") {
      timeline.push({
        step: "Processing",
        status: "pending",
        date: new Date(orderDate.getTime() + 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        time: "Expected by 10:00 AM",
        description: "Your order will be processed within 24 hours"
      });
    }
    if (status === "shipped" || status === "delivered") {
      timeline.push({
        step: "Shipped",
        status: "completed",
        date: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        time: "02:30 PM",
        description: "Your order has been shipped and is on the way"
      });
    } else if (status === "processing") {
      timeline.push({
        step: "Shipped",
        status: "pending",
        date: new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        time: "Expected by 2:00 PM",
        description: "Your order will be shipped soon"
      });
    }
    if (status === "delivered") {
      timeline.push({
        step: "Delivered",
        status: "completed",
        date: estimatedDelivery?.toISOString().split("T")[0] || new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        time: "11:45 AM",
        description: "Your order has been delivered successfully"
      });
    } else if (status === "shipped") {
      timeline.push({
        step: "Delivered",
        status: "pending",
        date: estimatedDelivery?.toISOString().split("T")[0] || new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
        time: "Expected delivery",
        description: "Your order is out for delivery"
      });
    }
    return timeline;
  }
  function getCurrentStep(status) {
    switch (status) {
      case "pending":
        return 0;
      case "processing":
        return 1;
      case "shipped":
        return 2;
      case "delivered":
        return 3;
      default:
        return 0;
    }
  }
  function generateSampleOrders(customers = [], products2 = []) {
    const statuses = ["pending", "processing", "shipped", "delivered"];
    const orders = [];
    const now = /* @__PURE__ */ new Date();
    if (!customers.length || !products2.length) {
      return [];
    }
    for (let i = 0; i < 50; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const orderDate = new Date(now.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1e3);
      const orderProducts = [];
      const numProducts = Math.floor(Math.random() * 3) + 1;
      let totalAmount = 0;
      for (let j = 0; j < numProducts; j++) {
        const product = products2[Math.floor(Math.random() * products2.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = parseInt(product?.price?.replace(/[₹,]/g, "")) || 0;
        orderProducts.push({
          ...product,
          quantity
        });
        totalAmount += price * quantity;
      }
      orders.push({
        id: `ORD-${(i + 1).toString().padStart(3, "0")}`,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: `${customer.name}, ${Math.floor(Math.random() * 999) + 1} Sample Street, Mumbai, Maharashtra 400001`
        },
        date: orderDate.toISOString().split("T")[0],
        total: `\u20B9${totalAmount}`,
        totalAmount,
        status,
        items: orderProducts.length,
        paymentMethod: ["Credit Card", "UPI", "Net Banking"][Math.floor(Math.random() * 3)],
        trackingNumber: status === "shipped" || status === "delivered" ? `TRK${Math.random().toString(36).substring(7).toUpperCase()}` : null,
        estimatedDelivery: status === "shipped" ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0] : null,
        products: orderProducts,
        userId: Math.floor(Math.random() * 5) + 1,
        shippingAddress: `${customer.name}, ${Math.floor(Math.random() * 999) + 1} Sample Street, Mumbai, Maharashtra 400001`
      });
    }
    return orders.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  function generateSampleSubcategories() {
    return [];
  }
  function generateSampleSubcategoriesForCategory(categorySlug) {
    const allSubcategories = generateSampleSubcategories();
    const categorySubcategoryMap = {};
    const subcategorySlugs = categorySubcategoryMap[categorySlug] || [];
    return allSubcategories.filter((sub) => subcategorySlugs.includes(sub.slug));
  }
  function generateSampleCategories() {
    const sampleProducts = generateSampleProducts();
    const baseCategories = [];
    return baseCategories.map((category) => {
      const productCount = sampleProducts.filter(
        (product) => product.category.toLowerCase() === category.slug.toLowerCase()
      ).length;
      return {
        ...category,
        productCount
      };
    });
  }
  app2.post("/api/blog/posts/:id/like", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const postId = parseInt(id);
      const db3 = await (init_storage(), __toCommonJS(storage_exports)).getDb();
      const post = await db3.select().from((init_schema(), __toCommonJS(schema_exports)).blogPosts).where(__require("drizzle-orm").eq((init_schema(), __toCommonJS(schema_exports)).blogPosts.id, postId)).limit(1);
      if (!post || post.length === 0) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      const currentLikes = post[0].likes || 0;
      const newLikes = currentLikes + 1;
      await db3.update((init_schema(), __toCommonJS(schema_exports)).blogPosts).set({ likes: newLikes }).where(__require("drizzle-orm").eq((init_schema(), __toCommonJS(schema_exports)).blogPosts.id, postId));
      res.json({
        liked: true,
        likesCount: newLikes
      });
    } catch (error) {
      console.error("Error toggling blog post like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });
  app2.post("/api/blog/posts/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId, content } = req.body;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content is required" });
      }
      const postId = parseInt(id);
      const user = await db2.select({
        firstName: users.firstName,
        lastName: users.lastName
      }).from(users).where(eq2(users.id, parseInt(userId))).limit(1);
      if (!user || user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const comment = {
        id: Date.now(),
        author: `${user[0].firstName} ${user[0].lastName}`,
        content: content.trim(),
        date: (/* @__PURE__ */ new Date()).toLocaleDateString(),
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        userId: parseInt(userId)
      };
      await db2.update(blogPosts).set({ comments: sql2`${blogPosts.comments} + 1` }).where(eq2(blogPosts.id, postId));
      res.json({
        success: true,
        comment,
        message: "Comment added successfully"
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });
  app2.get("/api/blog/posts/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      res.json([]);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });
  app2.get("/api/blog/posts", async (req, res) => {
    try {
      const { category, featured, search } = req.query;
      let posts;
      if (search) {
        posts = await storage.searchBlogPosts(search.toString());
      } else if (featured === "true") {
        posts = await storage.getFeaturedBlogPosts();
      } else {
        posts = await storage.getPublishedBlogPosts();
      }
      if (category && category !== "All") {
        posts = posts.filter((post) => post.category === category);
      }
      const postsWithParsedTags = posts.map((post) => ({
        ...post,
        tags: typeof post.tags === "string" ? JSON.parse(post.tags || "[]") : post.tags || []
      }));
      res.json(postsWithParsedTags);
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      const samplePosts = [
        {
          id: 1,
          title: "The Ultimate Guide to Korean Skincare Routine",
          slug: "ultimate-guide-korean-skincare-routine",
          excerpt: "Discover the secrets behind the famous 10-step Korean skincare routine and how to adapt it for your skin type.",
          content: "Korean skincare has revolutionized the beauty industry with its emphasis on prevention, hydration, and gentle care...",
          author: "Sarah Kim",
          category: "Skincare",
          tags: ["K-Beauty", "Skincare", "Routine", "Tips"],
          imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
          videoUrl: null,
          featured: true,
          published: true,
          likes: 124,
          comments: 18,
          readTime: "8 min read",
          createdAt: /* @__PURE__ */ new Date("2024-12-15"),
          updatedAt: /* @__PURE__ */ new Date("2024-12-15")
        }
      ];
      res.json(samplePosts);
    }
  });
  app2.get("/api/blog/posts/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await storage.getBlogPostBySlug(slug);
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      const postWithParsedTags = {
        ...post,
        tags: typeof post.tags === "string" ? JSON.parse(post.tags) : post.tags
      };
      res.json(postWithParsedTags);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });
  app2.get("/api/blog/categories", async (req, res) => {
    try {
      const categories2 = await storage.getBlogCategories();
      const activeCategories = categories2.filter((cat) => cat.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
      res.json(activeCategories);
    } catch (error) {
      console.error("Error fetching blog categories:", error);
      const defaultCategories = [
        { id: 1, name: "Beauty Tips", slug: "beauty-tips", isActive: true, sortOrder: 1 },
        { id: 2, name: "Skincare", slug: "skincare", isActive: true, sortOrder: 2 },
        { id: 3, name: "Makeup", slug: "makeup", isActive: true, sortOrder: 3 },
        { id: 4, name: "Hair Care", slug: "hair-care", isActive: true, sortOrder: 4 },
        { id: 5, name: "Product Reviews", slug: "product-reviews", isActive: true, sortOrder: 5 }
      ];
      res.json(defaultCategories);
    }
  });
  app2.get("/api/admin/blog/posts", async (req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      const postsWithParsedTags = posts.map((post) => ({
        ...post,
        tags: typeof post.tags === "string" ? JSON.parse(post.tags) : post.tags
      }));
      res.json(postsWithParsedTags);
    } catch (error) {
      console.error("Error fetching admin blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });
  app2.post("/api/admin/blog/posts", upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files;
      let imageUrl = req.body.imageUrl;
      let videoUrl = req.body.videoUrl;
      if (files?.image?.[0]) {
        imageUrl = `/api/images/${files.image[0].filename}`;
      }
      if (files?.video?.[0]) {
        videoUrl = `/api/images/${files.video[0].filename}`;
      }
      const postData = {
        title: req.body.title,
        excerpt: req.body.excerpt,
        content: req.body.content,
        author: req.body.author,
        category: req.body.category,
        tags: Array.isArray(req.body.tags) ? req.body.tags : typeof req.body.tags === "string" ? req.body.tags.split(",").map((t) => t.trim()) : [],
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        videoUrl,
        featured: req.body.featured === "true",
        published: req.body.published === "true",
        readTime: req.body.readTime || "5 min read"
      };
      const post = await storage.createBlogPost(postData);
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });
  app2.put("/api/admin/blog/posts/:id", upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files;
      const updateData = {};
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.excerpt) updateData.excerpt = req.body.excerpt;
      if (req.body.content) updateData.content = req.body.content;
      if (req.body.author) updateData.author = req.body.author;
      if (req.body.category) updateData.category = req.body.category;
      if (req.body.readTime) updateData.readTime = req.body.readTime;
      if (req.body.tags) {
        updateData.tags = Array.isArray(req.body.tags) ? req.body.tags : typeof req.body.tags === "string" ? req.body.tags.split(",").map((t) => t.trim()) : [];
      }
      if (req.body.featured !== void 0) updateData.featured = req.body.featured === "true";
      if (req.body.published !== void 0) updateData.published = req.body.published === "true";
      if (files?.image?.[0]) {
        updateData.imageUrl = `/api/images/${files.image[0].filename}`;
      } else if (req.body.imageUrl) {
        updateData.imageUrl = req.body.imageUrl;
      }
      if (files?.video?.[0]) {
        updateData.videoUrl = `/api/images/${files.video[0].filename}`;
      } else if (req.body.videoUrl !== void 0) {
        updateData.videoUrl = req.body.videoUrl || null;
      }
      const post = await storage.updateBlogPost(parseInt(id), updateData);
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ error: "Failed to update blog post" });
    }
  });
  app2.delete("/api/admin/blog/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBlogPost(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json({ success: true, message: "Blog post deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });
  app2.get("/api/admin/blog/categories", async (req, res) => {
    try {
      const categories2 = await storage.getBlogCategories();
      res.json(categories2);
    } catch (error) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ error: "Failed to fetch blog categories" });
    }
  });
  app2.post("/api/admin/blog/categories", async (req, res) => {
    try {
      const categoryData = {
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive !== false,
        sortOrder: parseInt(req.body.sortOrder) || 0
      };
      const category = await storage.createBlogCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating blog category:", error);
      res.status(500).json({ error: "Failed to create blog category" });
    }
  });
  app2.put("/api/admin/blog/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const category = await storage.updateBlogCategory(parseInt(id), req.body);
      if (!category) {
        return res.status(404).json({ error: "Blog category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error updating blog category:", error);
      res.status(500).json({ error: "Failed to update blog category" });
    }
  });
  app2.delete("/api/admin/blog/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteBlogCategory(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Blog category not found" });
      }
      res.json({ success: true, message: "Blog category deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog category:", error);
      res.status(500).json({ error: "Failed to delete blog category" });
    }
  });
  function generateSampleCustomers() {
    const sampleCustomers = [];
    return sampleCustomers.map((customer) => ({
      id: customer.id,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      orders: Math.floor(Math.random() * 10) + 1,
      spent: `\u20B9${(Math.random() * 8e3 + 500).toFixed(2)}`,
      status: Math.random() > 0.7 ? "VIP" : Math.random() > 0.4 ? "Active" : "New",
      joinedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
      firstName: customer.firstName,
      lastName: customer.lastName
    }));
  }
  function generateSampleProducts() {
    return [];
  }
  app2.get("/api/admin/customers", async (req, res) => {
    try {
      let allUsers;
      try {
        allUsers = await db2.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          createdAt: users.createdAt
        }).from(users);
      } catch (dbError) {
        console.log("Database unavailable, using sample customer data");
        return res.json(generateSampleCustomers());
      }
      const customersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          const userOrders = await db2.select({
            totalAmount: ordersTable.totalAmount,
            status: ordersTable.status
          }).from(ordersTable).where(eq2(ordersTable.userId, user.id));
          const orderCount = userOrders.length;
          const totalSpent = userOrders.reduce((sum, order) => sum + order.totalAmount, 0);
          let status = "New";
          if (orderCount === 0) {
            status = "Inactive";
          } else if (totalSpent > 2e3) {
            status = "VIP";
          } else if (orderCount > 0) {
            status = "Active";
          }
          return {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            phone: user.phone || "N/A",
            orders: orderCount,
            spent: `\u20B9${totalSpent.toFixed(2)}`,
            status,
            joinedDate: user.createdAt.toISOString().split("T")[0],
            firstName: user.firstName,
            lastName: user.lastName
          };
        })
      );
      res.json(customersWithStats);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });
  app2.get("/api/admin/customers/:id", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const user = await db2.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt
      }).from(users).where(eq2(users.id, customerId)).limit(1);
      if (user.length === 0) {
        return res.status(404).json({ error: "Customer not found" });
      }
      const customer = user[0];
      const customerOrders = await db2.select().from(ordersTable).where(eq2(ordersTable.userId, customerId)).orderBy(desc2(ordersTable.createdAt));
      const orderCount = customerOrders.length;
      const totalSpent = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      let status = "New";
      if (orderCount === 0) {
        status = "Inactive";
      } else if (totalSpent > 2e3) {
        status = "VIP";
      } else if (orderCount > 0) {
        status = "Active";
      }
      const customerWithStats = {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        phone: customer.phone || "N/A",
        orders: orderCount,
        spent: `\u20B9${totalSpent.toFixed(2)}`,
        status,
        joinedDate: customer.createdAt.toISOString().split("T")[0],
        firstName: customer.firstName,
        lastName: customer.lastName,
        recentOrders: customerOrders.slice(0, 5).map((order) => ({
          id: `ORD-${order.id.toString().padStart(3, "0")}`,
          date: order.createdAt.toISOString().split("T")[0],
          status: order.status,
          total: `\u20B9${order.totalAmount}`
        }))
      };
      res.json(customerWithStats);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer details" });
    }
  });
  app2.post("/api/contact", async (req, res) => {
    try {
      const { firstName, lastName, email, subject, message } = req.body;
      if (!firstName || !lastName || !email || !message) {
        return res.status(400).json({ error: "All required fields must be provided" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please provide a valid email address" });
      }
      const submissionData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        subject: subject ? subject.trim() : null,
        message: message.trim(),
        status: "unread"
      };
      const savedSubmission = await storage.createContactSubmission(submissionData);
      console.log("Contact form submission saved:", {
        id: savedSubmission.id,
        firstName,
        lastName,
        email,
        subject: subject || "General Inquiry",
        timestamp: savedSubmission.createdAt
      });
      res.json({
        message: "Thank you for your message! We'll get back to you within 24 hours.",
        success: true,
        submissionId: savedSubmission.id
      });
    } catch (error) {
      console.error("Contact form submission error:", error);
      res.status(500).json({ error: "Failed to submit contact form" });
    }
  });
  app2.get("/api/admin/contact-submissions", async (req, res) => {
    try {
      const submissions = await storage.getContactSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching contact submissions:", error);
      res.status(500).json({ error: "Failed to fetch contact submissions" });
    }
  });
  app2.get("/api/admin/contact-submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getContactSubmission(parseInt(id));
      if (!submission) {
        return res.status(404).json({ error: "Contact submission not found" });
      }
      res.json(submission);
    } catch (error) {
      console.error("Error fetching contact submission:", error);
      res.status(500).json({ error: "Failed to fetch contact submission" });
    }
  });
  app2.put("/api/admin/contact-submissions/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!["unread", "read", "responded"].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be: unread, read, or responded" });
      }
      const respondedAt = status === "responded" ? /* @__PURE__ */ new Date() : void 0;
      const updatedSubmission = await storage.updateContactSubmissionStatus(parseInt(id), status, respondedAt);
      if (!updatedSubmission) {
        return res.status(404).json({ error: "Contact submission not found" });
      }
      res.json({
        message: "Contact submission status updated successfully",
        submission: updatedSubmission
      });
    } catch (error) {
      console.error("Error updating contact submission status:", error);
      res.status(500).json({ error: "Failed to update contact submission status" });
    }
  });
  app2.delete("/api/admin/contact-submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteContactSubmission(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Contact submission not found" });
      }
      res.json({ success: true, message: "Contact submission deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact submission:", error);
      res.status(500).json({ error: "Failed to delete contact submission" });
    }
  });
  app2.get("/api/orders/:id/invoice", async (req, res) => {
    try {
      const orderId = req.params.id.replace("ORD-", "");
      const order = await db2.select().from(ordersTable).where(eq2(ordersTable.id, Number(orderId))).limit(1);
      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      const items = await db2.select({
        id: orderItemsTable.id,
        name: orderItemsTable.productName,
        quantity: orderItemsTable.quantity,
        price: orderItemsTable.price,
        image: orderItemsTable.productImage
      }).from(orderItemsTable).where(eq2(orderItemsTable.orderId, order[0].id));
      const user = await db2.select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone
      }).from(users).where(eq2(users.id, order[0].userId)).limit(1);
      const userData = user[0] || { firstName: "Unknown", lastName: "Customer", email: "unknown@email.com", phone: "N/A" };
      const invoiceHtml = generateInvoiceHTML({
        order: order[0],
        items,
        customer: userData,
        orderId: `ORD-${order[0].id.toString().padStart(3, "0")}`
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="Invoice-ORD-${order[0].id.toString().padStart(3, "0")}.html"`);
      res.send(invoiceHtml);
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  });
  function generateInvoiceHTML({ order, items, customer, orderId }) {
    const subtotal = items.reduce((sum, item) => {
      const price = parseInt(item.price.replace(/[₹,]/g, ""));
      return sum + price * item.quantity;
    }, 0);
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${orderId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f4f4f4;
            padding: 20px;
        }

        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #e74c3c;
            padding-bottom: 20px;
        }

        .company-name {
            font-size: 32px;
            font-weight: bold;
            color: #e74c3c;
            margin-bottom: 10px;
        }

        .company-details {
            color: #666;
            font-size: 14px;
            line-height: 1.4;
        }

        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            color: #333;
        }

        .invoice-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }

        .info-section h3 {
            color: #e74c3c;
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: bold;
        }

        .info-section p {
            margin-bottom: 8px;
            font-size: 14px;
        }

        .customer-info {
            text-align: right;
        }

        .status-badge {
            display: inline-block;
            background: #27ae60;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            font-size: 14px;
        }

        .items-table th {
            background: #e74c3c;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: bold;
        }

        .items-table td {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }

        .items-table tbody tr:nth-child(even) {
            background: #f9f9f9;
        }

        .items-table .text-right {
            text-align: right;
        }

        .totals {
            margin-top: 30px;
            display: flex;
            justify-content: flex-end;
        }

        .totals-table {
            width: 300px;
        }

        .totals-table tr {
            border-bottom: 1px solid #eee;
        }

        .totals-table td {
            padding: 8px 0;
            font-size: 14px;
        }

        .totals-table .text-right {
            text-align: right;
        }

        .grand-total {
            font-weight: bold;
            font-size: 18px;
            color: #e74c3c;
            border-top: 2px solid #e74c3c !important;
            padding-top: 15px !important;
        }

        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 13px;
        }

        .footer p {
            margin-bottom: 8px;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }
            .invoice-container {
                box-shadow: none;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-name">Beauty Store</div>
            <div class="company-details">
                Premium Beauty & Skincare Products<br>
                123 Beauty Street, Mumbai, Maharashtra 400001<br>
                Email: info@beautystore.com | Phone: +91 98765 43210<br>
                GST No: 27ABCDE1234F1Z5
            </div>
        </div>

        <h1 class="invoice-title">INVOICE</h1>

        <div class="invoice-info">
            <div class="info-section">
                <h3>Invoice Details</h3>
                <p><strong>Invoice No:</strong> ${orderId}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                <p><strong>Status:</strong> <span class="status-badge">${order.status}</span></p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                ${order.trackingNumber ? `<p><strong>Tracking:</strong> ${order.trackingNumber}</p>` : ""}
            </div>

            <div class="info-section customer-info">
                <h3>Bill To</h3>
                <p><strong>${customer.firstName} ${customer.lastName}</strong></p>
                <p>${customer.email}</p>
                ${customer.phone ? `<p>${customer.phone}</p>` : ""}
                <br>
                <p><strong>Shipping Address:</strong></p>
                <p>${order.shippingAddress}</p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item) => {
      const unitPrice = parseInt(item.price.replace(/[₹,]/g, ""));
      const itemTotal = unitPrice * item.quantity;
      return `
                    <tr>
                        <td>${item.name}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">\u20B9${unitPrice.toLocaleString("en-IN")}</td>
                        <td class="text-right">\u20B9${itemItemTotal.toLocaleString("en-IN")}</td>
                    </tr>
                  `;
    }).join("")}
            </tbody>
        </table>

        <div class="totals">
            <table class="totals-table">
                <tr>
                    <td>Subtotal:</td>
                    <td class="text-right">\u20B9${subtotal.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                    <td>GST (18%):</td>
                    <td class="text-right">\u20B9${tax.toLocaleString("en-IN")}</td>
                </tr>
                <tr>
                    <td>Shipping:</td>
                    <td class="text-right">Free</td>
                </tr>
                <tr class="grand-total">
                    <td><strong>Grand Total:</strong></td>
                    <td class="text-right"><strong>\u20B9${total.toLocaleString("en-IN")}</strong></td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>This is a computer generated invoice. No signature required.</p>
            <p>For any queries, please contact us at support@beautystore.com</p>
            <p>Generated on ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN")} at ${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}</p>
        </div>
    </div>
</body>
</html>`;
  }
  app2.get("/api/products/featured", async (req, res) => {
    try {
      const products2 = await storage.getFeaturedProducts();
      res.json(products2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch featured products" });
    }
  });
  app2.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || query.trim().length === 0) {
        return res.json([]);
      }
      const products2 = await storage.searchProducts(query);
      return res.json(products2);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });
  app2.get("/api/auth/validate", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No valid token provided" });
      }
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        res.json({ valid: true, message: "Token is valid", user: decoded });
      } catch (jwtError) {
        return res.status(401).json({ error: "Invalid token" });
      }
    } catch (error) {
      console.error("Token validation error:", error);
      res.status(401).json({ error: "Token validation failed" });
    }
  });
  app2.get("/api/admin/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || query.trim().length === 0) {
        return res.json({ products: [], customers: [], orders: [] });
      }
      console.log("Admin search query:", query);
      const searchTerm = query.toString().toLowerCase();
      let products2 = [];
      try {
        const allProducts = await storage.getProducts();
        products2 = allProducts.filter(
          (product) => product.name.toLowerCase().includes(searchTerm) || product.category.toLowerCase().includes(searchTerm) || product.subcategory && product.subcategory.toLowerCase().includes(searchTerm) || product.tags && product.tags.toLowerCase().includes(searchTerm)
        ).slice(0, 5);
      } catch (error) {
        console.log("Products search failed:", error.message);
        products2 = [];
      }
      let customers = [];
      try {
        const allUsers = await db2.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          createdAt: users.createdAt
        }).from(users);
        customers = allUsers.filter(
          (user) => user.firstName && user.firstName.toLowerCase().includes(searchTerm) || user.lastName && user.lastName.toLowerCase().includes(searchTerm) || user.email && user.email.toLowerCase().includes(searchTerm) || `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase().includes(searchTerm)
        ).map((user) => ({
          id: user.id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.email,
          phone: user.phone || "N/A"
        })).slice(0, 5);
      } catch (error) {
        console.log("Customers search failed:", error.message);
        customers = [];
      }
      let orders = [];
      try {
        const allOrders = await db2.select().from(ordersTable).orderBy(desc2(ordersTable.createdAt));
        orders = await Promise.all(
          allOrders.filter((order) => {
            const orderId = `ORD-${order.id.toString().padStart(3, "0")}`;
            return orderId.toLowerCase().includes(searchTerm) || order.status && order.status.toLowerCase().includes(searchTerm);
          }).slice(0, 5).map(async (order) => {
            try {
              const user = await db2.select({
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email
              }).from(users).where(eq2(users.id, order.userId)).limit(1);
              const userData = user[0] || { firstName: "Unknown", lastName: "Customer", email: "unknown@email.com" };
              return {
                id: `ORD-${order.id.toString().padStart(3, "0")}`,
                customerName: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown Customer",
                customerEmail: userData.email,
                date: order.createdAt.toISOString().split("T")[0],
                status: order.status,
                total: `\u20B9${order.totalAmount}`
              };
            } catch (userError) {
              console.log("Error fetching user for order:", order.id);
              return {
                id: `ORD-${order.id.toString().padStart(3, "0")}`,
                customerName: "Unknown Customer",
                customerEmail: "unknown@email.com",
                date: order.createdAt.toISOString().split("T")[0],
                status: order.status,
                total: `\u20B9${order.totalAmount}`
              };
            }
          })
        );
      } catch (error) {
        console.log("Orders search failed:", error.message);
        orders = [];
      }
      res.json({ products: products2, customers, orders });
    } catch (error) {
      console.error("Admin search error:", error);
      res.status(500).json({ error: "Failed to perform admin search" });
    }
  });
  app2.get("/api/shades", async (req, res) => {
    try {
      const activeShades = await storage.getActiveShades();
      res.json(activeShades);
    } catch (error) {
      console.log("Database unavailable, using sample shade data");
      const defaultShades = [
        { id: 1, name: "Fair to Light", colorCode: "#F7E7CE", value: "fair-light", isActive: true, sortOrder: 1 },
        { id: 2, name: "Light to Medium", colorCode: "#F5D5AE", value: "light-medium", isActive: true, sortOrder: 2 },
        { id: 3, name: "Medium", colorCode: "#E8B895", value: "medium", isActive: true, sortOrder: 3 },
        { id: 4, name: "Medium to Deep", colorCode: "#D69E2E", value: "medium-deep", isActive: true, sortOrder: 4 },
        { id: 5, name: "Deep", colorCode: "#B7791F", value: "deep", isActive: true, sortOrder: 5 },
        { id: 6, name: "Very Deep", colorCode: "#975A16", value: "very-deep", isActive: true, sortOrder: 6 },
        { id: 7, name: "Porcelain", colorCode: "#FFF8F0", value: "porcelain", isActive: true, sortOrder: 7 },
        { id: 8, name: "Ivory", colorCode: "#FFFFF0", value: "ivory", isActive: true, sortOrder: 8 },
        { id: 9, name: "Beige", colorCode: "#F5F5DC", value: "beige", isActive: true, sortOrder: 9 },
        { id: 10, name: "Sand", colorCode: "#F4A460", value: "sand", isActive: true, sortOrder: 10 },
        { id: 11, name: "Honey", colorCode: "#FFB347", value: "honey", isActive: true, sortOrder: 11 },
        { id: 12, name: "Caramel", colorCode: "#AF6F09", value: "caramel", isActive: true, sortOrder: 12 },
        { id: 13, name: "Cocoa", colorCode: "#7B3F00", value: "cocoa", isActive: true, sortOrder: 13 },
        { id: 14, name: "Espresso", colorCode: "#3C2415", value: "espresso", isActive: true, sortOrder: 14 }
      ];
      res.json(defaultShades);
    }
  });
  app2.get("/api/admin/shades", async (req, res) => {
    try {
      const allShades = await storage.getShades();
      res.json(allShades);
    } catch (error) {
      console.error("Error fetching shades:", error);
      res.status(500).json({ error: "Failed to fetch shades" });
    }
  });
  app2.post("/api/admin/shades", async (req, res) => {
    try {
      console.log("Creating shade with data:", req.body);
      const { name, colorCode, value, isActive, sortOrder, categoryIds, subcategoryIds, productIds, imageUrl } = req.body;
      if (!name || !colorCode) {
        return res.status(400).json({ error: "Name and color code are required" });
      }
      if (name.trim().length === 0) {
        return res.status(400).json({ error: "Name cannot be empty" });
      }
      if (!colorCode.match(/^#[0-9A-Fa-f]{6}$/)) {
        return res.status(400).json({ error: "Invalid color code format. Use hex format like #FF0000" });
      }
      const generatedValue = value && value.trim() ? value.trim() : name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const shadeData = {
        name: name.trim(),
        colorCode: colorCode.trim().toUpperCase(),
        value: generatedValue,
        isActive: Boolean(isActive ?? true),
        sortOrder: Number(sortOrder) || 0,
        categoryIds: Array.isArray(categoryIds) ? categoryIds : [],
        subcategoryIds: Array.isArray(subcategoryIds) ? subcategoryIds : [],
        productIds: Array.isArray(productIds) ? productIds : [],
        imageUrl: imageUrl || null
      };
      console.log("Processed shade data:", shadeData);
      const shade = await storage.createShade(shadeData);
      console.log("Shade created successfully:", shade);
      res.status(201).json(shade);
    } catch (error) {
      console.error("Error creating shade:", error);
      let errorMessage = "Failed to create shade";
      if (error.message) {
        errorMessage = error.message;
      }
      if (error.message && error.message.includes("unique constraint")) {
        errorMessage = "A shade with this value already exists. Please choose a different name or value.";
      }
      res.status(500).json({
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.stack : void 0
      });
    }
  });
  app2.put("/api/admin/shades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating shade with ID:", id);
      console.log("Update data:", req.body);
      const { name, colorCode, value, isActive, sortOrder, categoryIds, subcategoryIds, productIds, imageUrl } = req.body;
      if (name && name.trim().length === 0) {
        return res.status(400).json({ error: "Name cannot be empty" });
      }
      if (colorCode && !colorCode.match(/^#[0-9A-Fa-f]{6}$/)) {
        return res.status(400).json({ error: "Invalid color code format. Use hex format like #FF0000" });
      }
      const updateData = {};
      if (name !== void 0) updateData.name = name.trim();
      if (colorCode !== void 0) updateData.colorCode = colorCode.trim().toUpperCase();
      if (value !== void 0) updateData.value = value.trim() || name?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (isActive !== void 0) updateData.isActive = Boolean(isActive);
      if (sortOrder !== void 0) updateData.sortOrder = Number(sortOrder) || 0;
      if (categoryIds !== void 0) updateData.categoryIds = Array.isArray(categoryIds) ? categoryIds : [];
      if (subcategoryIds !== void 0) updateData.subcategoryIds = Array.isArray(subcategoryIds) ? subcategoryIds : [];
      if (productIds !== void 0) updateData.productIds = Array.isArray(productIds) ? productIds : [];
      if (imageUrl !== void 0) updateData.imageUrl = imageUrl || null;
      console.log("Processed update data:", updateData);
      const updatedShade = await storage.updateShade(parseInt(id), updateData);
      if (!updatedShade) {
        return res.status(404).json({ error: "Shade not found" });
      }
      console.log("Shade updated successfully:", updatedShade);
      res.json(updatedShade);
    } catch (error) {
      console.error("Error updating shade:", error);
      let errorMessage = "Failed to update shade";
      if (error.message) {
        errorMessage = error.message;
      }
      if (error.message && error.message.includes("unique constraint")) {
        errorMessage = "A shade with this value already exists. Please choose a different name or value.";
      }
      res.status(500).json({
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.stack : void 0
      });
    }
  });
  app2.delete("/api/admin/shades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteShade(parseInt(id));
      if (!success) {
        return res.status(404).json({ error: "Shade not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shade:", error);
      res.status(500).json({ error: "Failed to delete shade" });
    }
  });
  app2.get("/api/admin/sliders", async (req, res) => {
    try {
      const allSliders = await db2.select().from(sliders).orderBy(desc2(sliders.sortOrder));
      res.json(allSliders);
    } catch (error) {
      console.error("Error fetching sliders:", error);
      res.status(500).json({ error: "Failed to fetch sliders" });
    }
  });
  app2.post("/api/admin/sliders", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Image file is required"
        });
      }
      const imageUrl = `/api/images/${req.file.filename}`;
      const [newSlider] = await db2.insert(sliders).values({
        title: `Image ${Date.now()}`,
        subtitle: "",
        description: "Uploaded image",
        imageUrl,
        badge: "",
        primaryActionText: "",
        primaryActionUrl: "",
        isActive: true,
        sortOrder: 0
      }).returning();
      res.json(newSlider);
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({
        error: "Failed to upload image",
        details: error.message
      });
    }
  });
  app2.put("/api/admin/sliders/:id", upload.single("image"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const body = req.body;
      let imageUrl = body.imageUrl;
      if (req.file) {
        imageUrl = `/api/images/${req.file?.filename}`;
      }
      const [updatedSlider] = await db2.update(sliders).set({
        imageUrl,
        isActive: body.isActive === "true",
        sortOrder: parseInt(body.sortOrder, 10),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(eq2(sliders.id, id)).returning();
      if (!updatedSlider) {
        return res.status(404).json({ error: "Slider not found" });
      }
      res.json(updatedSlider);
    } catch (error) {
      console.error("Error updating slider:", error);
      res.status(500).json({ error: "Failed to update slider" });
    }
  });
  app2.delete("/api/admin/sliders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [deletedSlider] = await db2.delete(sliders).where(eq2(sliders.id, id)).returning();
      if (!deletedSlider) {
        return res.status(404).json({ error: "Slider not found" });
      }
      res.json({ message: "Slider deleted successfully" });
    } catch (error) {
      console.error("Error deleting slider:", error);
      res.status(500).json({ error: "Failed to delete slider" });
    }
  });
  app2.get("/api/products/:productId/shades", async (req, res) => {
    try {
      const { productId } = req.params;
      const shades2 = await storage.getProductShades(parseInt(productId));
      res.json(shades2);
    } catch (error) {
      console.error("Error fetching product shades:", error);
      res.status(500).json({ error: "Failed to fetch product shades" });
    }
  });
  app2.get("/api/products/:productId/reviews", async (req, res) => {
    try {
      const { productId } = req.params;
      const productReviews = await storage.getProductReviews(parseInt(productId));
      res.json(productReviews);
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });
  app2.get("/api/products/:productId/can-review", async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.query.userId;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const result = await storage.checkUserCanReview(parseInt(userId), parseInt(productId));
      res.json(result);
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      res.status(500).json({ error: "Failed to check review eligibility" });
    }
  });
  app2.post("/api/products/:productId/reviews", upload.single("image"), async (req, res) => {
    try {
      const { productId } = req.params;
      const { userId, rating, reviewText, orderId } = req.body;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      const canReviewCheck = await storage.checkUserCanReview(parseInt(userId), parseInt(productId));
      if (!canReviewCheck.canReview) {
        return res.status(403).json({ error: canReviewCheck.message });
      }
      let imageUrl = null;
      if (req.file) {
        imageUrl = `/api/images/${req.file.filename}`;
      }
      const reviewData = {
        userId: parseInt(userId),
        productId: parseInt(productId),
        orderId: parseInt(orderId) || canReviewCheck.orderId,
        rating: parseInt(rating),
        reviewText: reviewText || null,
        imageUrl,
        isVerified: true
      };
      const review = await storage.createReview(reviewData);
      res.status(201).json({
        message: "Review submitted successfully",
        review
      });
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Failed to submit review" });
    }
  });
  app2.get("/api/users/:userId/reviews", async (req, res) => {
    try {
      const { userId } = req.params;
      const userReviews = await storage.getUserReviews(parseInt(userId));
      res.json(userReviews);
    } catch (error) {
      console.error("Error fetching user reviews:", error);
      res.status(500).json({ error: "Failed to fetch user reviews" });
    }
  });
  app2.delete("/api/reviews/:reviewId", async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { userId } = req.body;
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const success = await storage.deleteReview(parseInt(reviewId), parseInt(userId));
      if (!success) {
        return res.status(404).json({ error: "Review not found or unauthorized" });
      }
      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  });
  app2.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.updateProduct(parseInt(id), req.body);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });
  app2.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const productId = parseInt(id);
      console.log(`DELETE /api/products/${id} - Request received`);
      if (isNaN(productId)) {
        console.log(`Invalid product ID: ${id}`);
        return res.status(400).json({
          error: "Invalid product ID",
          success: false
        });
      }
      console.log(`Attempting to delete product with ID: ${productId}`);
      let existingProduct;
      try {
        existingProduct = await storage.getProduct(productId);
      } catch (error) {
        console.error(`Error checking if product exists: ${error.message}`);
        return res.status(500).json({
          error: "Database error while checking product",
          success: false
        });
      }
      if (!existingProduct) {
        console.log(`Product with ID ${productId} not found`);
        return res.status(404).json({
          error: "Product not found",
          success: false,
          productId
        });
      }
      console.log(`Found product to delete: ${existingProduct.name}`);
      let success;
      try {
        success = await storage.deleteProduct(productId);
      } catch (error) {
        console.error(`Error during product deletion: ${error.message}`);
        return res.status(500).json({
          error: "Database error during deletion",
          success: false,
          details: error.message
        });
      }
      if (!success) {
        console.log(`Failed to delete product ${productId} from database`);
        return res.status(500).json({
          error: "Failed to delete product from database",
          success: false,
          productId
        });
      }
      console.log(`Successfully deleted product ${productId} from database`);
      try {
        const verifyDelete = await storage.getProduct(productId);
        if (verifyDelete) {
          console.log(`WARNING: Product ${productId} still exists after delete operation`);
          return res.status(500).json({
            error: "Product deletion verification failed - product still exists",
            success: false,
            productId
          });
        }
      } catch (error) {
        console.log(`Verification confirmed: Product ${productId} no longer exists`);
      }
      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
        productId
      });
    } catch (error) {
      console.error("Unexpected product deletion error:", error);
      res.status(500).json({
        error: "Failed to delete product",
        details: error instanceof Error ? error.message : "Unknown error",
        success: false
      });
    }
  });
  app2.get("/api/products/:productId/images", async (req, res) => {
    try {
      const { productId } = req.params;
      const images = await storage.getProductImages(parseInt(productId));
      res.json(images);
    } catch (error) {
      console.error("Error fetching product images:", error);
      res.status(500).json({ error: "Failed to fetch product images" });
    }
  });
  app2.get("/api/products/:productId/shades", async (req, res) => {
    try {
      const { productId } = req.params;
      const shades2 = await storage.getProductShades(parseInt(productId));
      res.json(shades2);
    } catch (error) {
      console.error("Error fetching product shades:", error);
      res.status(500).json({ error: "Failed to fetch product shades" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_storage();
import path4 from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path4.dirname(__filename);
config({ path: path4.resolve(process.cwd(), ".env") });
if (process.env.NODE_ENV === "production") {
  process.env.NODE_OPTIONS = "--max-old-space-size=512";
}
process.setMaxListeners(15);
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});
var app = express2();
app.use(compression());
app.set("trust proxy", 1);
app.use(express2.json({ limit: "10mb" }));
app.use(express2.urlencoded({ extended: false, limit: "10mb" }));
app.disable("x-powered-by");
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("\u2705 Database connection verified");
  } catch (error) {
    console.error("\u274C Database connection failed:", error);
  }
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000");
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    if (global.gc) {
      setInterval(() => {
        global.gc();
      }, 3e4);
    }
  });
})();
