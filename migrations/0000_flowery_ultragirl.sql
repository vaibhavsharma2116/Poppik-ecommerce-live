
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"password" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "order_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"message" text NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text NOT NULL,
	"shipping_address" text NOT NULL,
	"tracking_number" text,
	"estimated_delivery" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"product_image" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);


CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"product_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"short_description" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"original_price" numeric(10, 2),
	"category" text NOT NULL,
	"subcategory" text,
	"image_url" text NOT NULL,
	"rating" numeric(2, 1) NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"bestseller" boolean DEFAULT false NOT NULL,
	"new_launch" boolean DEFAULT false NOT NULL,
	"sale_offer" text,
	"variants" jsonb,
	"ingredients" text,
	"benefits" text,
	"how_to_use" text,
	"size" text,
	"tags" text
	
);

CREATE TABLE "subcategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"category_id" integer NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"product_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "subcategories_slug_unique" UNIQUE("slug")
);
CREATE TABLE contact_submissions (
	id SERIAL PRIMARY KEY,
	first_name TEXT NOT NULL,
	last_name TEXT NOT NULL,
	email TEXT NOT NULL,
	phone TEXT,
	subject TEXT,
	message TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'unread',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	responded_at TIMESTAMP
);


ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "order_notifications" ADD CONSTRAINT "order_notifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "order_notifications" ADD CONSTRAINT "order_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

CREATE TABLE "sliders" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	
	"is_active" boolean NOT NULL DEFAULT true,
	"sort_order" integer NOT NULL DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "users" ADD COLUMN "role" varchar(20) NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"image_url" text,
	"is_verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS "reviews_product_id_idx" ON "reviews" ("product_id");
CREATE INDEX IF NOT EXISTS "reviews_user_id_idx" ON "reviews" ("user_id");
CREATE INDEX IF NOT EXISTS "reviews_created_at_idx" ON "reviews" ("created_at");

-- Add unique constraint to prevent duplicate reviews per user per product
ALTER TABLE "reviews" ADD CONSTRAINT "unique_user_product_review" UNIQUE ("user_id", "product_id");

CREATE TABLE shades (
  id serial PRIMARY KEY,
  name text NOT NULL,
  color_code text NOT NULL,
  value text NOT NULL UNIQUE,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  category_ids jsonb,
  subcategory_ids jsonb,
  product_ids jsonb,
  image_url text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);


-- Insert some default shades
INSERT INTO shades (name, color_code, value, is_active, sort_order) VALUES
('Fair to Light', '#F7E7CE', 'fair-light', true, 1),
('Light to Medium', '#F5D5AE', 'light-medium', true, 2),
('Medium', '#E8B895', 'medium', true, 3),
('Medium to Deep', '#D69E2E', 'medium-deep', true, 4),
('Deep', '#B7791F', 'deep', true, 5),
('Very Deep', '#975A16', 'very-deep', true, 6),
('Porcelain', '#FFF8F0', 'porcelain', true, 7),
('Ivory', '#FFFFF0', 'ivory', true, 8),
('Beige', '#F5F5DC', 'beige', true, 9),
('Sand', '#F4A460', 'sand', true, 10),
('Honey', '#FFB347', 'honey', true, 11),
('Caramel', '#AF6F09', 'caramel', true, 12),
('Cocoa', '#7B3F00', 'cocoa', true, 13),
('Espresso', '#3C2415', 'espresso', true, 14);








-- Migration: Add product_images table
-- Description: Add support for multiple images per product

CREATE TABLE IF NOT EXISTS "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS "idx_product_images_product_id" ON "product_images" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_product_images_is_primary" ON "product_images" ("is_primary");
CREATE INDEX IF NOT EXISTS "idx_product_images_sort_order" ON "product_images" ("sort_order");

