import { drizzle } from "drizzle-orm/node-postgres";
import { eq, desc, and, gte, lte, like, isNull, asc, or, sql } from "drizzle-orm";
import { Pool } from "pg";
import {
  users,
  products,
  categories,
  subcategories,
  ordersTable,
  orderItemsTable,
  orderNotificationsTable,
  sliders,
  contactSubmissions,
  shades,
  reviews,
  productShades,
  productImages,
  blogPosts,
  blogCategories,
  blogSubcategories,
  announcements,
  categorySliders,
  testimonials,
  videoTestimonials,
  cashfreePayments,
  type User,
  type Product,
  type InsertProduct,
  type InsertSubcategory,
  type InsertBlogPost,
  type BlogPost,
  type InsertBlogCategory,
  type BlogCategory,
  type BlogSubcategory,
  type InsertBlogSubcategory,
  type Subcategory,
  type InsertCategorySlider,
  type InsertUser,
  type InsertReview,
  type Review,
  type Shade,
  type InsertShade,
  type Category,
  type InsertCategory,
  // Import jobPositions and jobApplications schema
  jobPositions,
  type JobPosition,
  type InsertJobPosition,
  jobApplications,
  type JobApplication,
  type InsertJobApplication,
  comboReviews,
  type ComboReview,
  type InsertComboReview,
  // Import influencerApplications schema
  influencerApplications,
  type InfluencerApplication
} from "@shared/schema";
import dotenv from "dotenv";

dotenv.config();



export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/poppik",
  ssl: false,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: false, // Changed to false to maintain connections
});

// Handle pool errors gracefully
pool.on('error', (err, client) => {
  console.error('Unexpected database pool error:', err);
  // Don't exit the process, just log the error
});

pool.on('connect', (client) => {
  console.log('New database connection established');
});

pool.on('remove', (client) => {
  console.log('Database connection removed from pool');
});

// Single database instance - don't recreate
const db = drizzle(pool);

// Simple connection test on startup
(async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
})();

async function getDb() {
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
  getProductShades(productId: number): Promise<any[]>; // Changed to use the new method

   // Review Management Functions
  createReview(reviewData: InsertReview): Promise<Review>;
  getProductReviews(productId: number): Promise<Review[]>;
  getUserReviews(userId: number): Promise<Review[]>;
  checkUserCanReview(userId: number, productId: number): Promise<{ canReview: boolean; orderId?: number; message: string }>;
  deleteReview(reviewId: number, userId: number): Promise<boolean>;

  // Combo Review Management Functions
  getComboReviews(comboId: number): Promise<any[]>;
  checkUserCanReviewCombo(userId: number, comboId: number): Promise<{ canReview: boolean; orderId?: number; message: string }>;

  // Blog Management Functions
  getBlogPosts(): Promise<BlogPost[]>; // Changed from any[] to BlogPost[]
  getPublishedBlogPosts(): Promise<BlogPost[]>; // Changed from any[] to BlogPost[]
  getFeaturedBlogPosts(): Promise<BlogPost[]>; // Changed from any[] to BlogPost[]
  getBlogPostBySlug(slug: string): Promise<BlogPost | null>; // Changed from any | null to BlogPost | null
  createBlogPost(postData: InsertBlogPost): Promise<BlogPost>; // Changed from any to InsertBlogPost and BlogPost
  updateBlogPost(id: number, postData: Partial<InsertBlogPost>): Promise<BlogPost | undefined>; // Changed from any to Partial<InsertBlogPost> and BlogPost | undefined
  deleteBlogPost(id: number): Promise<boolean>;
  searchBlogPosts(query: string): Promise<BlogPost[]>;

  // Featured Sections Management Functions

  deleteFeaturedSection(id: number): Promise<boolean>;

  // Blog Categories
  getBlogCategories(): Promise<BlogCategory[]>; // Changed from any[] to BlogCategory[]
  createBlogCategory(categoryData: InsertBlogCategory): Promise<BlogCategory>; // Changed from any to InsertBlogCategory and BlogCategory
  updateBlogCategory(id: number, categoryData: Partial<InsertBlogCategory>): Promise<BlogCategory | undefined>; // Changed from any to Partial<InsertBlogCategory> and BlogCategory | undefined
  deleteBlogCategory(id: number): Promise<boolean>;

  // Blog Subcategories
  getBlogSubcategories(): Promise<BlogSubcategory[]>;
  getBlogSubcategoriesByCategory(categoryId: number): Promise<BlogSubcategory[]>;
  getBlogSubcategoryBySlug(slug: string): Promise<BlogSubcategory | undefined>;
  createBlogSubcategory(subcategoryData: InsertBlogSubcategory): Promise<BlogSubcategory>;
  updateBlogSubcategory(id: number, subcategoryData: Partial<InsertBlogSubcategory>): Promise<BlogSubcategory | undefined>;
  deleteBlogSubcategory(id: number): Promise<boolean>;

  // Sliders
  getSliders(): Promise<any[]>;
  getActiveSliders(): Promise<any[]>;
  createSlider(sliderData: any): Promise<any>;
  updateSlider(id: number, sliderData: any): Promise<any>;
  deleteSlider(id: number): Promise<boolean>;

  // Category slider management
  getCategorySliders(categoryId: number): Promise<any[]>;
  createCategorySlider(sliderData: any): Promise<any>;
  updateCategorySlider(id: number, sliderData: any): Promise<any>;
  deleteCategorySlider(id: number): Promise<boolean>;

  // Testimonials management
  getTestimonials(): Promise<any[]>;
  getActiveTestimonials(): Promise<any[]>;
  getTestimonial(id: number): Promise<any | undefined>;
  createTestimonial(testimonialData: any): Promise<any>;
  updateTestimonial(id: number, testimonialData: any): Promise<any>;
  deleteTestimonial(id: number): Promise<boolean>;

  // Announcements management
  getAnnouncements(): Promise<any[]>;
  getActiveAnnouncements(): Promise<any[]>;
  getAnnouncement(id: number): Promise<any | undefined>;
  createAnnouncement(announcementData: any): Promise<any>;
  updateAnnouncement(id: number, announcementData: any): Promise<any>;
  deleteAnnouncement(id: number): Promise<boolean>;

  // Job Positions management
  getJobPositions(): Promise<JobPosition[]>;
  getActiveJobPositions(): Promise<JobPosition[]>;
  getAllJobPositions(): Promise<JobPosition[]>;
  autoExpireJobPositions(): Promise<void>;
  getJobPositionBySlug(slug: string): Promise<JobPosition | null>;
  getJobPosition(id: number): Promise<JobPosition | undefined>;
  createJobPosition(data: InsertJobPosition): Promise<JobPosition>;
  updateJobPosition(id: number, data: Partial<InsertJobPosition>): Promise<JobPosition | undefined>;
  deleteJobPosition(id: number): Promise<boolean>;

  // Influencer Applications
  createInfluencerApplication(data: any): Promise<any>;
  getInfluencerApplications(): Promise<any[]>;
  getInfluencerApplication(id: number): Promise<any | undefined>;
  updateInfluencerApplicationStatus(id: number, status: string): Promise<any | undefined>;
  deleteInfluencerApplication(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Database connection is handled by the singleton instance above
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
    try {
      console.log("Storage: Creating user with data:", {
        ...userData,
        password: "[HIDDEN]"
      });

      // Validate required fields
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
        role: userData.role || 'customer',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      console.log("Storage: User created successfully with ID:", user.id);
      return user;
    } catch (error: any) {
      console.error("Storage: Error creating user:", {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail
      });

      // Provide more specific error messages
      if (error.code === '23505') {
        throw new Error("A user with this email already exists");
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error("Database connection failed");
      } else if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
        throw new Error("Database tables not found. Please run database migrations.");
      }

      throw error;
    }
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

      // Validate required fields
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

      const productToInsert: any = {
        name: String(name).trim(),
        slug,
        description: String(description).trim(),
        shortDescription: productData.shortDescription ? String(productData.shortDescription).trim() : String(description).slice(0, 100),
        price: Number(price),
        category: String(category).trim(),
        imageUrl: productData.imageUrl ? String(productData.imageUrl).trim() : 'https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400',
      };

      // Add optional fields only if they have values
      if (productData.originalPrice) productToInsert.originalPrice = Number(productData.originalPrice);
      if (productData.subcategory) productToInsert.subcategory = String(productData.subcategory).trim();
      if (productData.videoUrl) {
        productToInsert.videoUrl = String(productData.videoUrl).trim();
        console.log("Adding videoUrl to product:", productToInsert.videoUrl);
      }
      if (productData.rating !== undefined) productToInsert.rating = Number(productData.rating);
      if (productData.reviewCount !== undefined) productToInsert.reviewCount = Number(productData.reviewCount);
      if (productData.inStock !== undefined) productToInsert.inStock = Boolean(productData.inStock);
      if (productData.featured !== undefined) productToInsert.featured = Boolean(productData.featured);
      if (productData.bestseller !== undefined) productToInsert.bestseller = Boolean(productData.bestseller);
      if (productData.newLaunch !== undefined) productToInsert.newLaunch = Boolean(productData.newLaunch);
      if (productData.saleOffer) productToInsert.saleOffer = String(productData.saleOffer).trim();
      if (productData.variants) productToInsert.variants = String(productData.variants).trim();
      if (productData.ingredients) productToInsert.ingredients = String(productData.ingredients).trim();
      if (productData.benefits) productToInsert.benefits = String(productData.benefits).trim();
      if (productData.howToUse) productToInsert.howToUse = String(productData.howToUse).trim();
      if (productData.size) productToInsert.size = String(productData.size).trim();
      if (productData.tags) productToInsert.tags = String(productData.tags).trim();

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
      } else if (error.message.includes('does not exist')) {
        throw new Error("Database column mismatch. Please check your database schema.");
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

      // Ensure value is unique by checking existing values and appending number if needed
      let value = shadeData.value;
      if (!value) {
        // Generate value from name if not provided
        value = shadeData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }

      // Check if value already exists and generate unique one
      let finalValue = value;
      let counter = 1;
      while (true) {
        const existingShade = await db
          .select()
          .from(shades)
          .where(eq(shades.value, finalValue))
          .limit(1);

        if (existingShade.length === 0) {
          break; // Value is unique
        }

        finalValue = `${value}-${counter}`;
        counter++;
      }

      // Create shade with unique value
      const shadeToInsert = {
        ...shadeData,
        value: finalValue
      };

      const [shade] = await db.insert(shades).values(shadeToInsert).returning();
      return shade;
    } catch (error) {
      console.error("Database error creating shade:", error);
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
      const productShadesResult = await db
        .select({
          id: shades.id,
          name: shades.name,
          colorCode: shades.colorCode,
          value: shades.value,
          imageUrl: shades.imageUrl,
          isActive: shades.isActive,
          sortOrder: shades.sortOrder,
        })
        .from(productShades)
        .innerJoin(shades, eq(productShades.shadeId, shades.id))
        .where(eq(productShades.productId, productId))
        .orderBy(asc(shades.sortOrder));

      return productShadesResult;
    } catch (error) {
      console.error("Error fetching product shades:", error);
      return [];
    }
  }

  // Get active shades with their associations (categories, subcategories, products)
  async getActiveShadesWithAssociations(): Promise<Shade[]> {
    try {
      const db = await getDb();
      const result = await db
        .select()
        .from(shades)
        .where(eq(shades.isActive, true))
        .orderBy(asc(shades.sortOrder));
      return result;
    } catch (error) {
      console.error("Error fetching active shades with associations:", error);
      return [];
    }
  }

  // Helper function to check if shade has references
  async checkShadeReferences(shadeId: number): Promise<boolean> {
    // This would check if the shade is used in any products
    // For now, return false to allow deletion
    return false;
  }

  // Product Images Management
  async getProductImages(productId: number): Promise<any[]> {
    try {
      const db = await getDb();
      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, productId))
        .orderBy(asc(productImages.sortOrder));
      return images;
    } catch (error) {
      console.error("Error fetching product images:", error);
      return [];
    }
  }

  async createProductImage(imageData: any): Promise<any> {
    try {
      const db = await getDb();
      const [image] = await db.insert(productImages).values(imageData).returning();
      return image;
    } catch (error) {
      console.error("Error creating product image:", error);
      throw error;
    }
  }

  async deleteProductImage(imageId: number): Promise<boolean> {
    try {
      const db = await getDb();
      const result = await db.delete(productImages).where(eq(productImages.id, imageId)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting product image:", error);
      throw error;
    }
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

  // Combo Review Management Functions
  async getComboReviews(comboId: number): Promise<ComboReview[]> {
    const db = await getDb();
    const comboReviewsResult = await db
      .select({
        id: comboReviews.id,
        userId: comboReviews.userId,
        comboId: comboReviews.comboId,
        rating: comboReviews.rating,
        title: comboReviews.title,
        comment: comboReviews.comment,
        userName: comboReviews.userName,
        createdAt: comboReviews.createdAt,
      })
      .from(comboReviews)
      .where(eq(comboReviews.comboId, comboId))
      .orderBy(desc(comboReviews.createdAt));

    return comboReviewsResult;
  }

  async checkUserCanReviewCombo(userId: number, comboId: number): Promise<{ canReview: boolean; orderId?: number; message: string }> {
    const db = await getDb();

    // Check if user has already reviewed this combo
    const existingReview = await db
      .select()
      .from(comboReviews)
      .where(
        and(
          eq(comboReviews.userId, userId),
          eq(comboReviews.comboId, comboId)
        )
      )
      .limit(1);

    if (existingReview.length > 0) {
      return {
        canReview: false,
        message: "You have already reviewed this combo"
      };
    }

    // Check if user has purchased this combo
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
          eq(orderItemsTable.comboId, comboId),
          eq(ordersTable.status, 'delivered')
        )
      )
      .limit(1);

    if (userOrders.length === 0) {
      return {
        canReview: false,
        message: "You must purchase this combo to leave a review"
      };
    }

    return {
      canReview: true,
      orderId: userOrders[0].orderId,
      message: "You can review this combo"
    };
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

      const postToInsert = {
        ...postData,
        slug,
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

  // Featured Sections Management Functions

  deleteFeaturedSection(id: number): Promise<boolean>;

  // Blog Categories

  // Get all blog categories
  async getBlogCategories(): Promise<BlogCategory[]> {
    try {
      const db = await getDb();
      return await db.select().from(blogCategories).where(eq(blogCategories.isActive, true)).orderBy(asc(blogCategories.sortOrder));
    } catch (error) {
      console.error("Database error in getBlogCategories:", error);
      // Ensure an empty array is returned or re-throw the error
      return [];
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
          name: categoryData.name,
          description: categoryData.description || '',
          slug,
          isActive: categoryData.isActive ?? true,
          sortOrder: categoryData.sortOrder || 0
        })
        .returning();
      return category;
    } catch (error) {
      console.error("Error creating blog category:", error);
      if (error.code === '23505') {
        throw new Error('A category with this name already exists');
      }
      throw new Error('Failed to create blog category: ' + (error.message || 'Unknown error'));
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

      // Check if category exists
      const existing = await db
        .select()
        .from(blogCategories)
        .where(eq(blogCategories.id, id))
        .limit(1);

      if (existing.length === 0) {
        return false;
      }

      // Delete the category (without returning clause to avoid column issues)
      const result = await db
        .delete(blogCategories)
        .where(eq(blogCategories.id, id));

      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting blog category:", error);
      throw new Error('Failed to delete blog category: ' + (error.message || 'Unknown error'));
    }
  }

  // Blog Subcategories
  async getBlogSubcategories(): Promise<BlogSubcategory[]> {
    try {
      const db = await getDb();
      const subcategories = await db
        .select()
        .from(blogSubcategories)
        .orderBy(asc(blogSubcategories.sortOrder));
      return subcategories;
    } catch (error) {
      console.error("Error fetching blog subcategories:", error);
      throw error;
    }
  }

  async getBlogSubcategoriesByCategory(categoryId: number): Promise<BlogSubcategory[]> {
    try {
      const db = await getDb();
      const subcategories = await db
        .select()
        .from(blogSubcategories)
        .where(eq(blogSubcategories.categoryId, categoryId))
        .orderBy(asc(blogSubcategories.sortOrder));
      return subcategories;
    } catch (error) {
      console.error("Error fetching blog subcategories by category:", error);
      throw error;
    }
  }

  async getBlogSubcategoryBySlug(slug: string): Promise<BlogSubcategory | undefined> {
    try {
      const db = await getDb();
      const [subcategory] = await db
        .select()
        .from(blogSubcategories)
        .where(eq(blogSubcategories.slug, slug))
        .limit(1);
      return subcategory;
    } catch (error) {
      console.error("Error fetching blog subcategory by slug:", error);
      throw error;
    }
  }

  async createBlogSubcategory(subcategoryData: InsertBlogSubcategory): Promise<BlogSubcategory> {
    try {
      const db = await getDb();
      const [subcategory] = await db
        .insert(blogSubcategories)
        .values(subcategoryData)
        .returning();
      return subcategory;
    } catch (error) {
      console.error("Error creating blog subcategory:", error);
      throw error;
    }
  }

  async updateBlogSubcategory(id: number, subcategoryData: Partial<InsertBlogSubcategory>): Promise<BlogSubcategory | undefined> {
    try {
      const db = await getDb();
      const [subcategory] = await db
        .update(blogSubcategories)
        .set(subcategoryData)
        .where(eq(blogSubcategories.id, id))
        .returning();
      return subcategory;
    } catch (error) {
      console.error("Error updating blog subcategory:", error);
      throw error;
    }
  }

  async deleteBlogSubcategory(id: number): Promise<boolean> {
    try {
      const db = await getDb();
      const result = await db
        .delete(blogSubcategories)
        .where(eq(blogSubcategories.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting blog subcategory:", error);
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

  // Slider Management Functions
  async getSliders(): Promise<any[]> {
    try {
      const db = await getDb();
      return await db.select().from(sliders).orderBy(asc(sliders.sortOrder));
    } catch (error) {
      console.error("Error fetching sliders:", error);
      return [];
    }
  }

  async getActiveSliders(): Promise<any[]> {
    try {
      const db = await getDb();
      return await db.select().from(sliders).where(eq(sliders.isActive, true)).orderBy(asc(sliders.sortOrder));
    } catch (error) {
      console.error("Error fetching active sliders:", error);
      return [];
    }
  }

  async createSlider(sliderData: any): Promise<any> {
    try {
      const db = await getDb();
      const [slider] = await db.insert(sliders).values(sliderData).returning();
      return slider;
    } catch (error) {
      console.error("Error creating slider:", error);
      throw error;
    }
  }

  async updateSlider(id: number, sliderData: any): Promise<any> {
    try {
      const db = await getDb();
      const [slider] = await db.update(sliders).set(sliderData).where(eq(sliders.id, id)).returning();
      return slider;
    } catch (error) {
      console.error("Error updating slider:", error);
      throw error;
    }
  }

  async deleteSlider(id: number): Promise<boolean> {
    try {
      const db = await getDb();
      const result = await db.delete(sliders).where(eq(sliders.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting slider:", error);
      throw error;
    }
  }

  // Category slider management
  async getCategorySliders(categoryId: number): Promise<any[]> {
    const db = await getDb();
    return await db.select().from(categorySliders).where(eq(categorySliders.categoryId, categoryId));
  }
  async createCategorySlider(sliderData: any): Promise<any> {
    const db = await getDb();
    const [result] = await db.insert(categorySliders).values(sliderData).returning();
    return result;
  }
  async updateCategorySlider(id: number, sliderData: any): Promise<any> {
    const db = await getDb();
    const [result] = await db
      .update(categorySliders)
      .set(sliderData)
      .where(eq(categorySliders.id, id))
      .returning();
    return result;
  }
  async deleteCategorySlider(id: number): Promise<boolean> {
    try {
      const db = await getDb();
      const result = await db.delete(categorySliders).where(eq(categorySliders.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting category slider:", error);
      throw error;
    }
  }

  // Testimonials Management
  async getTestimonials(): Promise<any[]> {
    try {
      const db = await getDb();
      const result = await db.select().from(testimonials).orderBy(desc(testimonials.sortOrder));
      return result;
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      return [];
    }
  }

  async getActiveTestimonials(): Promise<any[]> {
    try {
      const db = await getDb();
      const result = await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.isActive, true))
        .orderBy(asc(testimonials.sortOrder));
      return result;
    } catch (error) {
      console.error("Error fetching active testimonials:", error);
      return [];
    }
  }

  async getTestimonial(id: number): Promise<any | undefined> {
    try {
      const db = await getDb();
      const result = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error("Error fetching testimonial:", error);
      return undefined;
    }
  }

  async createTestimonial(testimonialData: any): Promise<any> {
    try {
      const db = await getDb();
      const [result] = await db.insert(testimonials).values({
        customerName: testimonialData.customerName,
        customerImage: testimonialData.customerImage || null,
        rating: testimonialData.rating || 5,
        reviewText: testimonialData.reviewText,
        isActive: testimonialData.isActive !== false,
        sortOrder: testimonialData.sortOrder || 0,
      }).returning();
      return result;
    } catch (error) {
      console.error("Error creating testimonial:", error);
      throw error;
    }
  }

  async updateTestimonial(id: number, testimonialData: any): Promise<any> {
    try {
      const db = await getDb();
      const [result] = await db
        .update(testimonials)
        .set({
          ...testimonialData,
          updatedAt: new Date(),
        })
        .where(eq(testimonials.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating testimonial:", error);
      throw error;
    }
  }

  async deleteTestimonial(id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(testimonials).where(eq(testimonials.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Announcements methods
  async getAnnouncements(): Promise<any[]> {
    return await db.select().from(announcements).orderBy(announcements.sortOrder);
  }

  async getActiveAnnouncements(): Promise<any[]> {
    return await db.select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(announcements.sortOrder);
  }

  async getAnnouncement(id: number): Promise<any | undefined> {
    const result = await db.select().from(announcements).where(eq(announcements.id, id));
    return result[0];
  }

  async createAnnouncement(announcementData: any): Promise<any> {
    const result = await db.insert(announcements).values(announcementData).returning();
    return result[0];
  }

  async updateAnnouncement(id: number, announcementData: any): Promise<any> {
    const result = await db.update(announcements)
      .set({ ...announcementData, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return result[0];
  }

  async deleteAnnouncement(id: number): Promise<boolean> {
    const result = await db.delete(announcements).where(eq(announcements.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Job Positions methods
  async getJobPositions(): Promise<JobPosition[]> {
    try {
      const db = await getDb();
      return await db.select({
        id: jobPositions.id,
        title: jobPositions.title,
        slug: jobPositions.slug,
        department: jobPositions.department,
        location: jobPositions.location,
        type: jobPositions.type,
        jobId: jobPositions.jobId,
        experienceLevel: jobPositions.experienceLevel,
        workExperience: jobPositions.workExperience,
        education: jobPositions.education,
        description: jobPositions.description,
        aboutRole: jobPositions.aboutRole,
        responsibilities: jobPositions.responsibilities,
        requirements: jobPositions.requirements,
        skills: jobPositions.skills,
        isActive: jobPositions.isActive,
        expiresAt: jobPositions.expiresAt,
        sortOrder: jobPositions.sortOrder,
        createdAt: jobPositions.createdAt,
        updatedAt: jobPositions.updatedAt,
      }).from(jobPositions).orderBy(desc(jobPositions.createdAt));
    } catch (error) {
      console.error("Error fetching job positions:", error);
      throw error;
    }
  }

  async getActiveJobPositions(): Promise<JobPosition[]> {
    try {
      const db = await getDb();
      const now = new Date();

      const results = await db.select({
        id: jobPositions.id,
        title: jobPositions.title,
        slug: jobPositions.slug,
        department: jobPositions.department,
        location: jobPositions.location,
        type: jobPositions.type,
        jobId: jobPositions.jobId,
        experienceLevel: jobPositions.experienceLevel,
        workExperience: jobPositions.workExperience,
        education: jobPositions.education,
        description: jobPositions.description,
        aboutRole: jobPositions.aboutRole,
        responsibilities: jobPositions.responsibilities,
        requirements: jobPositions.requirements,
        skills: jobPositions.skills,
        isActive: jobPositions.isActive,
        expiresAt: jobPositions.expiresAt,
        sortOrder: jobPositions.sortOrder,
        createdAt: jobPositions.createdAt,
        updatedAt: jobPositions.updatedAt,
      })
      .from(jobPositions)
      .where(eq(jobPositions.isActive, true))
      .orderBy(asc(jobPositions.sortOrder));

      // Parse JSONB fields
      return results.map(position => ({
        ...position,
        responsibilities: typeof position.responsibilities === 'string'
          ? JSON.parse(position.responsibilities)
          : position.responsibilities,
        requirements: typeof position.requirements === 'string'
          ? JSON.parse(position.requirements)
          : position.requirements,
        skills: typeof position.skills === 'string'
          ? JSON.parse(position.skills)
          : position.skills,
      }));
    } catch (error) {
      console.error("Error fetching active job positions:", error);
      throw error;
    }
  }

  async getAllJobPositions(): Promise<JobPosition[]> {
    try {
      const db = await getDb();
      const now = new Date();

      return await db.select({
        id: jobPositions.id,
        title: jobPositions.title,
        slug: jobPositions.slug,
        department: jobPositions.department,
        location: jobPositions.location,
        type: jobPositions.type,
        jobId: jobPositions.jobId,
        experienceLevel: jobPositions.experienceLevel,
        workExperience: jobPositions.workExperience,
        education: jobPositions.education,
        description: jobPositions.description,
        aboutRole: jobPositions.aboutRole,
        responsibilities: jobPositions.responsibilities,
        requirements: jobPositions.requirements,
        skills: jobPositions.skills,
        isActive: jobPositions.isActive,
        expiresAt: jobPositions.expiresAt,
        sortOrder: jobPositions.sortOrder,
        createdAt: jobPositions.createdAt,
        updatedAt: jobPositions.updatedAt,
      })
      .from(jobPositions)
      .where(
        or(
          isNull(jobPositions.expiresAt),
          sql`${jobPositions.expiresAt} > ${now}`
        )
      )
      .orderBy(asc(jobPositions.sortOrder));
    } catch (error) {
      console.error("Error fetching all job positions:", error);
      throw error;
    }
  }

  async autoExpireJobPositions(): Promise<void> {
    try {
      const db = await getDb();
      const now = new Date();

      // Auto-expire positions where expiresAt is in the past
      await db.update(jobPositions)
        .set({ isActive: false, updatedAt: now })
        .where(and(
          eq(jobPositions.isActive, true),
          lte(jobPositions.expiresAt, now)
        ));
    } catch (error) {
      console.error("Error auto-expiring job positions:", error);
    }
  }

  async getJobPositionBySlug(slug: string): Promise<JobPosition | null> {
    const db = await getDb();
    const result = await db
      .select()
      .from(jobPositions)
      .where(eq(jobPositions.slug, slug))
      .limit(1);
    return result[0] || null;
  }

  async getJobPosition(id: number): Promise<JobPosition | undefined> {
    const db = await getDb();
    const result = await db
      .select()
      .from(jobPositions)
      .where(eq(jobPositions.id, id))
      .limit(1);
    return result[0];
  }

  async createJobPosition(data: InsertJobPosition): Promise<JobPosition> {
    const db = await getDb();

    console.log('Storage: Creating job position with data:', data);

    // Generate slug from title if not provided
    const slug = data.slug || data.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Ensure arrays are properly formatted as JSONB
    const jobPositionToInsert = {
      title: data.title,
      slug,
      department: data.department,
      location: data.location,
      type: data.type,
      jobId: data.jobId || null,
      experienceLevel: data.experienceLevel || 'Entry Level',
      workExperience: data.workExperience || '0-1 years',
      education: data.education || 'Bachelor\'s Degree',
      description: data.description || '',
      aboutRole: data.aboutRole || '',
      responsibilities: JSON.stringify(Array.isArray(data.responsibilities) ? data.responsibilities : []),
      requirements: JSON.stringify(Array.isArray(data.requirements) ? data.requirements : []),
      skills: JSON.stringify(Array.isArray(data.skills) ? data.skills : []),
      isActive: data.isActive !== undefined ? data.isActive : true,
      sortOrder: data.sortOrder || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Storage: Inserting job position:', jobPositionToInsert);

    try {
      const [jobPosition] = await db.insert(jobPositions).values(jobPositionToInsert).returning();
      console.log('Storage: Job position created successfully:', jobPosition.id);
      return jobPosition;
    } catch (error) {
      console.error('Storage: Database insert error:', error);
      throw error;
    }
  }

  async updateJobPosition(id: number, data: Partial<InsertJobPosition>): Promise<JobPosition | undefined> {
    const db = await getDb();

    const updateData = { ...data };
    if (data.title) {
      updateData.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }
    updateData.updatedAt = new Date();

    const [jobPosition] = await db
      .update(jobPositions)
      .set(updateData)
      .where(eq(jobPositions.id, id))
      .returning();
    return jobPosition;
  }

  async deleteJobPosition(id: number): Promise<boolean> {
    const db = await getDb();
    const result = await db
      .delete(jobPositions)
      .where(eq(jobPositions.id, id))
      .returning();
    return result.length > 0;
  }

  // Influencer Applications
  async createInfluencerApplication(data: any) {
    const applicationData = {
      fullName: data.fullName,
      email: data.email,
      mobile: data.mobile,
      city: data.city,
      state: data.state,
      status: data.status || 'pending'
    };
    const [application] = await db.insert(influencerApplications).values(applicationData).returning();
    return application;
  }

  async getInfluencerApplications() {
    return await db.select().from(influencerApplications).orderBy(desc(influencerApplications.createdAt));
  }

  async getInfluencerApplication(id: number) {
    const [application] = await db.select().from(influencerApplications).where(eq(influencerApplications.id, id));
    return application;
  }

  async updateInfluencerApplicationStatus(id: number, status: string) {
    const [updated] = await db
      .update(influencerApplications)
      .set({ status, reviewedAt: new Date() })
      .where(eq(influencerApplications.id, id))
      .returning();
    return updated;
  }

  async deleteInfluencerApplication(id: number) {
    await db.delete(influencerApplications).where(eq(influencerApplications.id, id));
  }
}

export const storage = new DatabaseStorage();