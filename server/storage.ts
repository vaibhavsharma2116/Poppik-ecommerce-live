import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, gte, lte, like, isNull, asc, or, sql } from "drizzle-orm";
import { Pool } from "pg";
import {
  products,
  categories,
  subcategories,
  users,
  contactSubmissions,
  shades,
  reviews,
  ordersTable,
  orderItemsTable,
  blogPosts,
  blogCategories,
  type Product,
  type Category,
  type Subcategory,
  type User,
  type Shade,
  type Review,
  type BlogPost,
  type BlogCategory,
  type InsertProduct,
  type InsertCategory,
  type InsertSubcategory,
  type InsertUser,
  type InsertShade,
  type InsertReview,
  type InsertBlogPost,
  type InsertBlogCategory
} from "@shared/schema";
import dotenv from "dotenv";

dotenv.config();

// Optimized pool configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
  max: 20,                    // Maximum number of connections
  min: 2,                     // Minimum number of connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout for acquiring connection
  acquireTimeoutMillis: 60000,   // Max time to wait for connection
  createTimeoutMillis: 30000,    // Max time to wait for new connection
  destroyTimeoutMillis: 5000,    // Max time to wait for closing connection
  reapIntervalMillis: 1000,      // How often to check for idle connections
  createRetryIntervalMillis: 200, // Retry interval for failed connections
};

export const pool = new Pool(poolConfig);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://31.97.226.116:5432/my_pgdb",
  ssl: process.env.DATABASE_URL?.includes('31.97.226.116') ? false : { rejectUnauthorized: false },
  max: 10, // Reduced from 20 to avoid too many connections
  min: 1, // Reduced from 2 to minimize idle connections
  idleTimeoutMillis: 60000, // 1 minute - close idle connections faster
  connectionTimeoutMillis: 5000, // Reduced to 5 seconds
  acquireTimeoutMillis: 5000, // Reduced acquisition timeout
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // 10 seconds
  allowExitOnIdle: true, // Allow pool to exit when idle
  query_timeout: 30000, // 30 second query timeout
  statement_timeout: 30000, // 30 second statement timeout
});

let db: ReturnType<typeof drizzle> | undefined = undefined;

// Connection health check
async function checkConnectionHealth() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// Periodic health check every 30 seconds
setInterval(async () => {
  const isHealthy = await checkConnectionHealth();
  if (!isHealthy) {
    console.log("Database connection unhealthy, attempting to reconnect...");
    // Reset db instance to force reconnection
    db = undefined;
  }
}, 30000);

async function getDb() {
  if (!db) {
    try {
      // Test the connection
      const client = await pool.connect();
      await client.query('SELECT 1'); // Simple health check
      client.release();
      console.log("Database connected successfully (PostgreSQL)");
      db = drizzle(pool);
    } catch (error) {
      console.error("Database connection failed:", error);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
      throw error;
    }
  }
  return db;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Products
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProducts(): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  getFeaturedProducts(): Promise<Product[]>;
  getBestsellerProducts(): Promise<Product[]>;
  getNewLaunchProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Categories
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Subcategories
  getSubcategory(id: number): Promise<Subcategory | undefined>;
  getSubcategoryBySlug(slug: string): Promise<Subcategory | undefined>;
  getSubcategories(): Promise<Subcategory[]>;
  getSubcategoriesByCategory(categoryId: number): Promise<Subcategory[]>;
  createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory>;
  updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory | undefined>;
  deleteSubcategory(id: number): Promise<boolean>;

  // Shades
  getShade(id: number): Promise<Shade | undefined>;
  getShades(): Promise<Shade[]>;
  getActiveShades(): Promise<Shade[]>;
  createShade(shade: InsertShade): Promise<Shade>;
  updateShade(id: number, shade: Partial<InsertShade>): Promise<Shade | undefined>;
  deleteShade(id: number): Promise<boolean>;
  getProductShades(productId: number): Promise<any[]>;

   // Review Management Functions
  createReview(reviewData: InsertReview): Promise<Review>;
  getProductReviews(productId: number): Promise<Review[]>;
  getUserReviews(userId: number): Promise<Review[]>;
  checkUserCanReview(userId: number, productId: number): Promise<{ canReview: boolean; orderId?: number; message: string }>;
  deleteReview(reviewId: number, userId: number): Promise<boolean>;

  // Blog Management Functions
  getBlogPosts(): Promise<BlogPost[]>; // Changed from any[] to BlogPost[]
  getPublishedBlogPosts(): Promise<BlogPost[]>; // Changed from any[] to BlogPost[]
  getFeaturedBlogPosts(): Promise<BlogPost[]>; // Changed from any[] to BlogPost[]
  getBlogPostBySlug(slug: string): Promise<BlogPost | null>; // Changed from any | null to BlogPost | null
  createBlogPost(postData: InsertBlogPost): Promise<BlogPost>; // Changed from any to InsertBlogPost and BlogPost
  updateBlogPost(id: number, postData: Partial<InsertBlogPost>): Promise<BlogPost | undefined>; // Changed from any to Partial<InsertBlogPost> and BlogPost | undefined
  deleteBlogPost(id: number): Promise<boolean>;
  searchBlogPosts(query: string): Promise<BlogPost[]>; // Changed from any[] to BlogPost[]

  // Blog Categories
  getBlogCategories(): Promise<BlogCategory[]>; // Changed from any[] to BlogCategory[]
  createBlogCategory(categoryData: InsertBlogCategory): Promise<BlogCategory>; // Changed from any to InsertBlogCategory and BlogCategory
  updateBlogCategory(id: number, categoryData: Partial<InsertBlogCategory>): Promise<BlogCategory | undefined>; // Changed from any to Partial<InsertBlogCategory> and BlogCategory | undefined
  deleteBlogCategory(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    // Initialize the database connection in the constructor
    this.initializeDb();
  }

  private async initializeDb() {
    if (!this.db) {
      try {
        this.db = drizzle(pool);
        console.log("Database connected successfully (PostgreSQL) - inside DatabaseStorage");
      } catch (error) {
        console.error("Database connection failed:", error);
        throw error;
      }
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const db = await getDb();
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = await getDb();
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<User> {
    const db = await getDb();
    const [user] = await db.insert(users).values({
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
      role: userData.role || 'customer',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const db = await getDb();
    const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async deleteUser(id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Products
  async getProduct(id: number): Promise<Product | undefined> {
    const db = await getDb();
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const db = await getDb();
    const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
    return result[0];
  }

  async getProducts(): Promise<Product[]> {
    const db = await getDb();
    return await db.select().from(products);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    const db = await getDb();

    // First try exact match
    let result = await db.select().from(products).where(eq(products.category, category));

    // If no exact match found, try case-insensitive partial matching
    if (result.length === 0) {
      const allProducts = await db.select().from(products);
      const searchCategory = category.toLowerCase();

      result = allProducts.filter(product => {
        if (!product.category) return false;

        const productCategory = product.category.toLowerCase();

        // Partial match
        if (productCategory.includes(searchCategory) || searchCategory.includes(productCategory)) return true;

        // Special category mappings
        const categoryMappings: Record<string, string[]> = {
          'skincare': ['skin', 'face', 'facial'],
          'haircare': ['hair'],
          'makeup': ['cosmetics', 'beauty'],
          'bodycare': ['body'],
          'eyecare': ['eye', 'eyes'],
          'eye-drama': ['eye', 'eyes', 'eyecare'],
          'beauty': ['makeup', 'cosmetics', 'skincare'],
        };

        const mappedCategories = categoryMappings[searchCategory] || [];
        return mappedCategories.some(mapped => productCategory.includes(mapped));
      });
    }

    return result;
  }

  async getFeaturedProducts(): Promise<Product[]> {
    const db = await getDb();
    return await db.select().from(products).where(eq(products.featured, true));
  }

  async getBestsellerProducts(): Promise<Product[]> {
    const db = await getDb();
    return await db.select().from(products).where(eq(products.bestseller, true));
  }

  async getNewLaunchProducts(): Promise<Product[]> {
    const db = await getDb();
    return await db.select().from(products).where(eq(products.newLaunch, true));
  }

  async createProduct(productData: any): Promise<Product> {
    const db = await getDb();

    try {
      console.log("Creating product with data:", productData);

      // Validate only essential required fields
      const { name, price, category, description } = productData;
      if (!name || !price || !category || !description) {
        throw new Error("Missing required fields: name, price, category, and description are required");
      }

      // Validate types
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new Error("Product name must be a non-empty string");
      }

      if (isNaN(Number(price)) || Number(price) <= 0) {
        throw new Error("Price must be a valid positive number");
      }

      if (typeof category !== 'string' || category.trim().length === 0) {
        throw new Error("Category must be a non-empty string");
      }

      if (typeof description !== 'string' || description.trim().length === 0) {
        throw new Error("Description must be a non-empty string");
      }

      // Generate slug from name if not provided
      const slug = productData.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const productToInsert = {
        name: String(name).trim(),
        slug,
        description: String(description).trim(),
        shortDescription: productData.shortDescription ? String(productData.shortDescription).trim() : String(description).slice(0, 100),
        price: Number(price),
        originalPrice: productData.originalPrice ? Number(productData.originalPrice) : null,
        category: String(category).trim(),
        subcategory: productData.subcategory ? String(productData.subcategory).trim() : null,
        imageUrl: productData.imageUrl ? String(productData.imageUrl).trim() : 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400',
        rating: Number(productData.rating) || 4.0,
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
        tags: productData.tags ? String(productData.tags).trim() : null,
      };

      console.log("Inserting product data:", productToInsert);
      const result = await db.insert(products).values(productToInsert).returning();

      if (!result || result.length === 0) {
        throw new Error("Product was not created - no result returned");
      }

      console.log("Product created successfully:", result[0]);
      return result[0];
    } catch (error: any) {
      console.error("Error creating product:", error);

      // Provide more specific error messages
      if (error.message.includes('unique constraint')) {
        throw new Error("A product with this name or slug already exists");
      } else if (error.message.includes('not null constraint')) {
        throw new Error("Missing required product information");
      } else {
        throw new Error(error.message || "Failed to create product");
      }
    }
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    try {
      const db = await getDb();
      // Clean up the data before updating
      const cleanData: any = { ...productData };

      // Handle numeric fields
      if (cleanData.price !== undefined) {
        cleanData.price = parseFloat(cleanData.price) || 0;
      }
      if (cleanData.rating !== undefined) {
        cleanData.rating = parseFloat(cleanData.rating) || 0;
      }
      if (cleanData.reviewCount !== undefined) {
        cleanData.reviewCount = parseInt(cleanData.reviewCount) || 0;
      }

      // Handle empty string fields - convert to null
      const stringFields = ['subcategory', 'saleOffer', 'size', 'ingredients', 'benefits', 'howToUse', 'tags'];
      stringFields.forEach(field => {
        if (cleanData[field] === '') {
          cleanData[field] = null;
        }
      });

      // Generate slug if name is provided
      if (cleanData.name) {
        cleanData.slug = cleanData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      const [updatedProduct] = await db
        .update(products)
        .set(cleanData)
        .where(eq(products.id, id))
        .returning();

      return updatedProduct || null;
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  async deleteProduct(id: number): Promise<boolean> {
    try {
      console.log(`DatabaseStorage: Attempting to delete product with ID: ${id}`);
      const db = await getDb();

      // First check if product exists
      const existingProduct = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (existingProduct.length === 0) {
        console.log(`Product with ID ${id} not found in database`);
        return false;
      }

      console.log(`Found product to delete: ${existingProduct[0].name}`);

      // Delete related data first (reviews, order items, etc.)
      try {
        // Delete reviews for this product
        await db.delete(reviews).where(eq(reviews.productId, id));
        console.log(`Deleted reviews for product ${id}`);

        // Note: We don't delete order items as they are historical records
        // Just the product itself will be deleted
      } catch (relatedError) {
        console.warn(`Warning: Failed to delete related data for product ${id}:`, relatedError);
        // Continue with product deletion even if related data deletion fails
      }

      // Delete the product
      const result = await db.delete(products).where(eq(products.id, id)).returning();
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
  async getCategory(id: number): Promise<Category | undefined> {
    const db = await getDb();
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const db = await getDb();
    const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return result[0];
  }

  async getCategories(): Promise<Category[]> {
    const db = await getDb();
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      const db = await getDb();
      console.log("Creating category with data:", category);

      // Validate required fields
      if (!category.name || !category.description || !category.slug) {
        throw new Error("Missing required fields: name, description, and slug are required");
      }

      // Check if slug already exists
      const existingCategory = await db.select().from(categories).where(eq(categories.slug, category.slug)).limit(1);
      if (existingCategory.length > 0) {
        throw new Error(`Category with slug '${category.slug}' already exists`);
      }

      const result = await db.insert(categories).values(category).returning();

      if (!result || result.length === 0) {
        throw new Error("Failed to insert category into database");
      }

      console.log("Category created successfully:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Error creating category:", error);

      // Provide more specific error messages
      if (error.message.includes('unique constraint')) {
        throw new Error("A category with this name or slug already exists");
      } else if (error.message.includes('not null constraint')) {
        throw new Error("Missing required category information");
      } else {
        throw new Error(error.message || "Failed to create category");
      }
    }
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const db = await getDb();
    const result = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return result[0];
  }

  async deleteCategory(id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  // Subcategories
  async getSubcategory(id: number): Promise<Subcategory | undefined> {
    const db = await getDb();
    const result = await db.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);
    return result[0];
  }

  async getSubcategoryBySlug(slug: string): Promise<Subcategory | undefined> {
    const db = await getDb();
    const result = await db.select().from(subcategories).where(eq(subcategories.slug, slug)).limit(1);
    return result[0];
  }

  async getSubcategoryById(id: number): Promise<Subcategory | undefined> {
    const db = await getDb();
    const result = await db.select().from(subcategories).where(eq(subcategories.id, id)).limit(1);
    return result[0];
  }

  async getSubcategories(): Promise<Subcategory[]> {
    const db = await getDb();
    return await db.select().from(subcategories);
  }

  async getSubcategoriesByCategory(categoryId: number): Promise<Subcategory[]> {
    const db = await getDb();
    return await db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId));
  }

  async createSubcategory(subcategoryData: InsertSubcategory): Promise<Subcategory> {
    try {
      const db = await getDb();
      console.log("Creating subcategory with data:", subcategoryData);

      // Validate required fields
      if (!subcategoryData.name || !subcategoryData.categoryId || !subcategoryData.description) {
        throw new Error("Missing required fields: name, categoryId, and description are required");
      }

      // Check if slug already exists
      const existingSubcategory = await db.select().from(subcategories).where(eq(subcategories.slug, subcategoryData.slug)).limit(1);
      if (existingSubcategory.length > 0) {
        throw new Error(`Subcategory with slug '${subcategoryData.slug}' already exists`);
      }

      const result = await db.insert(subcategories).values(subcategoryData).returning();

      if (!result || result.length === 0) {
        throw new Error("Failed to insert subcategory into database");
      }

      console.log("Subcategory created successfully:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Error creating subcategory:", error);

      // Provide more specific error messages
      if (error.message.includes('unique constraint')) {
        throw new Error("A subcategory with this name or slug already exists");
      } else if (error.message.includes('foreign key constraint')) {
        throw new Error("Invalid category selected. Please choose a valid category.");
      } else if (error.message.includes('not null constraint')) {
        throw new Error("Missing required subcategory information");
      } else {
        throw new Error(error.message || "Failed to create subcategory");
      }
    }
  }

  async updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory | undefined> {
    const db = await getDb();
    const result = await db.update(subcategories).set(subcategory).where(eq(subcategories.id, id)).returning();
    return result[0];
  }

  async deleteSubcategory(id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(subcategories).where(eq(subcategories.id, id)).returning();
    return result.length > 0;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const db = await getDb();
    const searchTerm = `%${query.toLowerCase()}%`;

    // Using SQL LIKE for case-insensitive search
    const result = await db.select().from(products).where(
      sql`LOWER(${products.name}) LIKE ${searchTerm}
          OR LOWER(${products.category}) LIKE ${searchTerm}
          OR LOWER(${products.subcategory}) LIKE ${searchTerm}
          OR LOWER(${products.tags}) LIKE ${searchTerm}`
    ).limit(10);

    return result;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const db = await getDb();
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async createContactSubmission(submissionData: any): Promise<any> {
    const db = await getDb();

    const contactData = {
      firstName: submissionData.firstName,
      lastName: submissionData.lastName,
      email: submissionData.email,
      phone: submissionData.phone || null,
      subject: submissionData.subject || null,
      message: submissionData.message,
      status: submissionData.status || 'unread'
    };

    const result = await db.insert(contactSubmissions).values(contactData).returning();
    return result[0];
  }

  async getContactSubmissions(): Promise<any[]> {
    const db = await getDb();
    const result = await db.select().from(contactSubmissions).orderBy(sql`${contactSubmissions.createdAt} DESC`);
    return result;
  }

  async getContactSubmission(id: number): Promise<any> {
    const db = await getDb();
    const result = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id)).limit(1);
    return result[0] || null;
  }

  async updateContactSubmissionStatus(id: number, status: string, respondedAt?: Date): Promise<any> {
    const db = await getDb();

    const updateData: any = { status };
    if (respondedAt) {
      updateData.respondedAt = respondedAt;
    }

    const result = await db.update(contactSubmissions)
      .set(updateData)
      .where(eq(contactSubmissions.id, id))
      .returning();

    return result[0] || null;
  }

  async deleteContactSubmission(id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id)).returning();
    return result.length > 0;
  }

  // Shades - Consolidated methods (removed duplicates)
  async getShade(id: number): Promise<Shade | undefined> {
    const db = await getDb();
    const result = await db.select().from(shades).where(eq(shades.id, id)).limit(1);
    return result[0];
  }

  async getShades(): Promise<Shade[]> {
    try {
      const db = await getDb();
      const result = await db.select().from(shades).orderBy(asc(shades.sortOrder));
      return result;
    } catch (error) {
      console.error("Database connection failed:", error);
      throw error;
    }
  }

  async getActiveShades(): Promise<Shade[]> {
    try {
      const db = await getDb();
      const result = await db.select().from(shades)
        .where(eq(shades.isActive, true))
        .orderBy(asc(shades.sortOrder));
      return result;
    } catch (error) {
      console.error("Database connection failed:", error);
      throw error;
    }
  }

  async getShadesByCategory(categoryId: number): Promise<Shade[]> {
    const db = await getDb();
    return await db.select().from(shades)
      .where(and(
        eq(shades.isActive, true),
        sql`json_extract(${shades.categoryIds}, '$') LIKE '%${categoryId}%'`
      ))
      .orderBy(shades.sortOrder);
  }

  async getShadesBySubcategory(subcategoryId: number): Promise<Shade[]> {
    const db = await getDb();
    return await db.select().from(shades)
      .where(and(
        eq(shades.isActive, true),
        sql`json_extract(${shades.subcategoryIds}, '$') LIKE '%${subcategoryId}%'`
      ))
      .orderBy(shades.sortOrder);
  }

  async createShade(shadeData: InsertShade): Promise<Shade> {
    try {
      const db = await getDb();
      const [shade] = await db.insert(shades).values(shadeData).returning();
      return shade;
    } catch (error) {
      console.error("Database connection failed:", error);
      throw error;
    }
  }

  async updateShade(id: number, shadeData: Partial<InsertShade>): Promise<Shade | undefined> {
    try {
      const db = await getDb();

      // Add updatedAt timestamp as Date object
      const updateData = {
        ...shadeData,
        updatedAt: new Date()
      };

      console.log("Updating shade in database:", { id, updateData });

      const result = await db.update(shades)
        .set(updateData)
        .where(eq(shades.id, id))
        .returning();

      if (!result || result.length === 0) {
        console.log("No shade found with ID:", id);
        return undefined;
      }

      console.log("Shade updated successfully in database:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Database error updating shade:", error);
      throw error;
    }
  }

  async deleteShade(id: number): Promise<boolean> {
    try {
      const db = await getDb();
      const result = await db.delete(shades).where(eq(shades.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error("Database connection failed:", error);
      throw error;
    }
  }

  // Get shades for a specific product based on its category/subcategory or individual assignment
  async getProductShades(productId: number): Promise<any[]> {
    try {
      const db = await getDb();

      // Get product details
      const product = await this.getProduct(productId);
      if (!product) return [];

      // Get all active shades
      const allShades = await this.getActiveShades();

      // Get all categories and subcategories for faster lookup
      const allCategories = await this.getCategories();
      const allSubcategories = await this.getSubcategories();

      // Filter shades based on product's category/subcategory
      const productShades = allShades.filter(shade => {
        // Check if shade has specific product IDs assigned
        if (shade.productIds && Array.isArray(shade.productIds)) {
          if (shade.productIds.includes(productId)) return true;
        }

        // Check category match
        if (shade.categoryIds && Array.isArray(shade.categoryIds)) {
          const hasMatchingCategory = shade.categoryIds.some((catId: number) => {
            const category = allCategories.find(cat => cat.id === catId);
            return category && category.name.toLowerCase() === product.category.toLowerCase();
          });
          if (hasMatchingCategory) return true;
        }

        // Check subcategory match
        if (shade.subcategoryIds && Array.isArray(shade.subcategoryIds) && product.subcategory) {
          const hasMatchingSubcategory = shade.subcategoryIds.some((subId: number) => {
            const subcategory = allSubcategories.find(sub => sub.id === subId);
            return subcategory && subcategory.name.toLowerCase() === product.subcategory.toLowerCase();
          });
          if (hasMatchingSubcategory) return true;
        }

        return false;
      });

      return productShades;
    } catch (error) {
      console.error("Error getting product shades:", error);
      return [];
    }
  }

  // Helper function to check if shade has references
  async checkShadeReferences(shadeId: number): Promise<boolean> {
    // This would check if the shade is used in any products
    // For now, return false to allow deletion
    return false;
  }

  // Review Management Functions
  async createReview(reviewData: InsertReview): Promise<Review> {
    const db = await getDb();
    const [review] = await db.insert(reviews).values(reviewData).returning();
    console.log("Review created:", review);
    return review;
  }

  async getProductReviews(productId: number): Promise<Review[]> {
    const db = await getDb();
    const productReviews = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        productId: reviews.productId,
        orderId: reviews.orderId,
        rating: reviews.rating,
        reviewText: reviews.reviewText,
        imageUrl: reviews.imageUrl,
        isVerified: reviews.isVerified,
        createdAt: reviews.createdAt,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));

    return productReviews;
  }

  async getUserReviews(userId: number): Promise<Review[]> {
    const db = await getDb();
    const userReviews = await db
      .select({
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
        productImage: products.imageUrl,
      })
      .from(reviews)
      .innerJoin(products, eq(reviews.productId, products.id))
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt));

    return userReviews;
  }

  async checkUserCanReview(userId: number, productId: number): Promise<{ canReview: boolean; orderId?: number; message: string }> {
    const db = await getDb();
    // Check if user has purchased this product
    const userOrders = await db
      .select({
        orderId: ordersTable.id,
        orderStatus: ordersTable.status,
      })
      .from(ordersTable)
      .innerJoin(orderItemsTable, eq(ordersTable.id, orderItemsTable.orderId))
      .where(
        and(
          eq(ordersTable.userId, userId),
          eq(orderItemsTable.productId, productId),
          eq(ordersTable.status, 'delivered')
        )
      );

    if (userOrders.length === 0) {
      return {
        canReview: false,
        message: "You can only review products that you have purchased and received."
      };
    }

    // Check if user has already reviewed this product
    const existingReview = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, userId),
          eq(reviews.productId, productId)
        )
      )
      .limit(1);

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

  async deleteReview(reviewId: number, userId: number): Promise<boolean> {
    try {
      const db = await getDb();
      const result = await db
        .delete(reviews)
        .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Error deleting review:", error);
      throw error;
    }
  }

  // Blog Management Functions

  // Get all blog posts
  async getBlogPosts(): Promise<BlogPost[]> {
    try {
      const db = await getDb();
      const posts = await db
        .select()
        .from(blogPosts)
        .orderBy(desc(blogPosts.createdAt));
      return posts;
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      throw error;
    }
  }

  // Get published blog posts
  async getPublishedBlogPosts(): Promise<BlogPost[]> {
    try {
      const db = await getDb();
      const posts = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.published, true))
        .orderBy(desc(blogPosts.createdAt));
      return posts;
    } catch (error) {
      console.error("Error fetching published blog posts:", error);
      throw error;
    }
  }

  // Get featured blog posts
  async getFeaturedBlogPosts(): Promise<BlogPost[]> {
    try {
      const db = await getDb();
      const posts = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.published, true), eq(blogPosts.featured, true)))
        .orderBy(desc(blogPosts.createdAt));
      return posts;
    } catch (error) {
      console.error("Error fetching featured blog posts:", error);
      throw error;
    }
  }

  // Get blog post by slug
  async getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const db = await getDb();
      const post = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.slug, slug))
        .limit(1);
      return post[0] || null;
    } catch (error) {
      console.error("Error fetching blog post by slug:", error);
      throw error;
    }
  }

  // Create blog post
  async createBlogPost(postData: InsertBlogPost): Promise<BlogPost> {
    try {
      const db = await getDb();

      // Generate slug from title
      const slug = postData.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Ensure tags is properly formatted
      const tags = Array.isArray(postData.tags) ? 
        JSON.stringify(postData.tags) : 
        typeof postData.tags === 'string' ? postData.tags : '[]';

      const postToInsert = {
        ...postData,
        slug,
        tags,
        likes: 0,
        comments: 0,
        published: postData.published ?? true,
        featured: postData.featured ?? false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(blogPosts).values(postToInsert).returning();
      return result[0];
    } catch (error) {
      console.error("Database error in createBlogPost:", error);
      throw error;
    }
  }

  // Update blog post
  async updateBlogPost(id: number, postData: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    try {
      const db = await getDb();
      const updateData = { ...postData };

      if (postData.title) {
        updateData.slug = postData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }

      if (postData.tags) {
        updateData.tags = JSON.stringify(postData.tags);
      }

      updateData.updatedAt = new Date();

      const [post] = await db
        .update(blogPosts)
        .set(updateData)
        .where(eq(blogPosts.id, id))
        .returning();
      return post;
    } catch (error) {
      console.error("Error updating blog post:", error);
      throw error;
    }
  }

  // Delete blog post
  async deleteBlogPost(id: number): Promise<boolean> {
    try {
      const db = await getDb();
      const result = await db
        .delete(blogPosts)
        .where(eq(blogPosts.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting blog post:", error);
      throw error;
    }
  }

  // Search blog posts
  async searchBlogPosts(query: string): Promise<BlogPost[]> {
    try {
      const db = await getDb();
      const searchTerm = `%${query.toLowerCase()}%`;
      const posts = await db
        .select()
        .from(blogPosts)
        .where(
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
        )
        .orderBy(desc(blogPosts.createdAt));
      return posts;
    } catch (error) {
      console.error("Error searching blog posts:", error);
      throw error;
    }
  }

  // Blog Categories

  // Get all blog categories
  async getBlogCategories(): Promise<BlogCategory[]> {
    try {
      const db = await getDb();
      return await db.select().from(blogCategories).where(eq(blogCategories.isActive, true)).orderBy(asc(blogCategories.sortOrder));
    } catch (error) {
      console.error("Database error in getBlogCategories:", error);
      // Return fallback categories when database is not available
      return [
        { id: 1, name: "Beauty Tips", slug: "beauty-tips", isActive: true, sortOrder: 1 },
        { id: 2, name: "Product Reviews", slug: "product-reviews", isActive: true, sortOrder: 2 },
        { id: 3, name: "Tutorials", slug: "tutorials", isActive: true, sortOrder: 3 },
        { id: 4, name: "Skincare", slug: "skincare", isActive: true, sortOrder: 4 },
        { id: 5, name: "Makeup", slug: "makeup", isActive: true, sortOrder: 5 },
      ];
    }
  }

  // Create blog category
  async createBlogCategory(categoryData: InsertBlogCategory): Promise<BlogCategory> {
    try {
      const db = await getDb();
      const slug = categoryData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const [category] = await db
        .insert(blogCategories)
        .values({
          ...categoryData,
          slug,
          createdAt: new Date()
        })
        .returning();
      return category;
    } catch (error) {
      console.error("Error creating blog category:", error);
      throw error;
    }
  }

  // Update blog category
  async updateBlogCategory(id: number, categoryData: Partial<InsertBlogCategory>): Promise<BlogCategory | undefined> {
    try {
      const db = await getDb();
      const updateData = { ...categoryData };

      if (categoryData.name) {
        updateData.slug = categoryData.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
      }

      const [category] = await db
        .update(blogCategories)
        .set(updateData)
        .where(eq(blogCategories.id, id))
        .returning();
      return category;
    } catch (error) {
      console.error("Error updating blog category:", error);
      throw error;
    }
  }

  // Delete blog category
  async deleteBlogCategory(id: number): Promise<boolean> {
    try {
      const db = await getDb();
      const result = await db
        .delete(blogCategories)
        .where(eq(blogCategories.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting blog category:", error);
      throw error;
    }
  }

  // Toggle blog post like
  async toggleBlogPostLike(postId: number, userId: number): Promise<{ liked: boolean; likesCount: number }> {
    try {
      const db = await getDb();

      // Check if user already liked this post
      const existingLike = await db
        .select()
        .from(sql`blog_post_likes`)
        .where(sql`post_id = ${postId} AND user_id = ${userId}`)
        .limit(1);

      let liked = false;

      if (existingLike.length > 0) {
        // Unlike - remove the like
        await db.delete(sql`blog_post_likes`).where(sql`post_id = ${postId} AND user_id = ${userId}`);
        await db.update(blogPosts).set({
          likes: sql`${blogPosts.likes} - 1`
        }).where(eq(blogPosts.id, postId));
        liked = false;
      } else {
        // Like - add the like
        await db.insert(sql`blog_post_likes`).values({
          post_id: postId,
          user_id: userId,
          created_at: new Date()
        });
        await db.update(blogPosts).set({
          likes: sql`${blogPosts.likes} + 1`
        }).where(eq(blogPosts.id, postId));
        liked = true;
      }

      // Get updated likes count
      const post = await db.select({ likes: blogPosts.likes }).from(blogPosts).where(eq(blogPosts.id, postId)).limit(1);
      const likesCount = post[0]?.likes || 0;

      return { liked, likesCount };
    } catch (error) {
      console.error("Error toggling blog post like:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();