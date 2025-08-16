
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql, and, asc, desc } from "drizzle-orm";
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
  type Product, 
  type Category, 
  type Subcategory,
  type User,
  type Shade,
  type Review,
  type InsertProduct, 
  type InsertCategory, 
  type InsertSubcategory,
  type InsertUser,
  type InsertShade,
  type InsertReview
} from "@shared/schema";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

let db: ReturnType<typeof drizzle> | undefined = undefined;

async function getDb() {
  if (!db) {
    try {
      // Test the connection
      const client = await pool.connect();
      client.release();
      console.log("Database connected successfully (PostgreSQL)");
      db = drizzle(pool);
    } catch (error) {
      console.error("Database connection failed:", error);
      throw error;
    }
  }
  return db;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
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
    const result = await db.insert(users).values(userData).returning();
    return result[0];
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
    console.log("Creating product with data:", productData);

    // Validate only essential required fields
    const { name, price, category, description } = productData;
    if (!name || !price || !category || !description) {
      throw new Error("Missing required fields: name, price, category, and description are required");
    }

    // Generate slug from name if not provided
    const slug = productData.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const productToInsert = {
      name: String(name).trim(),
      slug,
      description: String(description).trim(),
      shortDescription: productData.shortDescription ? String(productData.shortDescription).trim() : description.slice(0, 100),
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

    console.log("Inserting product:", productToInsert);

    try {
      console.log("Inserting product data:", productToInsert);
      const result = await db.insert(products).values(productToInsert).returning();

      if (!result || result.length === 0) {
        throw new Error("Product was not created - no result returned");
      }

      console.log("Product created successfully:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Error creating product:", error);
      console.error("Product data that failed:", productToInsert);
      throw new Error(`Failed to create product: ${error.message}`);
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
    const db = await getDb();
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
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

  async getSubcategories(): Promise<Subcategory[]> {
    const db = await getDb();
    return await db.select().from(subcategories);
  }

  async getSubcategoriesByCategory(categoryId: number): Promise<Subcategory[]> {
    const db = await getDb();
    return await db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId));
  }

  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    const db = await getDb();
    const result = await db.insert(subcategories).values(subcategory).returning();
    return result[0];
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
    const db = await getDb();
    const result = await db
      .delete(reviews)
      .where(
        and(
          eq(reviews.id, reviewId),
          eq(reviews.userId, userId)
        )
      )
      .returning();

    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
