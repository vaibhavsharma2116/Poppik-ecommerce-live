
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


-- Fix missing columns in orders table
DO $$ 
BEGIN
    -- Add cashfree_order_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='cashfree_order_id') THEN
        ALTER TABLE orders ADD COLUMN cashfree_order_id text;
        RAISE NOTICE 'Added cashfree_order_id column';
    ELSE
        RAISE NOTICE 'cashfree_order_id column already exists';
    END IF;
    
    -- Add payment_session_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_session_id') THEN
        ALTER TABLE orders ADD COLUMN payment_session_id text;
        RAISE NOTICE 'Added payment_session_id column';
    ELSE
        RAISE NOTICE 'payment_session_id column already exists';
    END IF;
    
    -- Add payment_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_id') THEN
        ALTER TABLE orders ADD COLUMN payment_id text;
        RAISE NOTICE 'Added payment_id column';
    ELSE
        RAISE NOTICE 'payment_id column already exists';
    END IF;
    
    -- Create cashfree_payments table if it doesn't exist
    CREATE TABLE IF NOT EXISTS cashfree_payments (
        id serial PRIMARY KEY NOT NULL,
        cashfree_order_id text NOT NULL UNIQUE,
        user_id integer NOT NULL,
        amount integer NOT NULL,
        status text DEFAULT 'created' NOT NULL,
        order_data jsonb NOT NULL,
        customer_info jsonb NOT NULL,
        payment_id text,
        created_at timestamp DEFAULT now() NOT NULL,
        completed_at timestamp
    );
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='cashfree_payments_user_id_users_id_fk') THEN
        ALTER TABLE cashfree_payments ADD CONSTRAINT cashfree_payments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id);
        RAISE NOTICE 'Added foreign key constraint for cashfree_payments';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.blog_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
-- Table: public.blog_posts

-- DROP TABLE IF EXISTS public.blog_posts;
CREATE SEQUENCE IF NOT EXISTS blog_posts_id_seq;

CREATE TABLE IF NOT EXISTS blog_posts
(
    id INTEGER NOT NULL DEFAULT nextval('blog_posts_id_seq'),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT,
    image_url TEXT,
    video_url TEXT,
    featured BOOLEAN DEFAULT false,
    published BOOLEAN DEFAULT true,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    read_time VARCHAR(50) DEFAULT '5 min read',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT blog_posts_pkey PRIMARY KEY (id)
);


-- Add dateOfBirth and address columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;



CREATE TABLE IF NOT EXISTS public.affiliate_applications
(
    id SERIAL PRIMARY KEY,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    address text NOT NULL,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    review_notes text,
    user_id integer,
    landmark text,
    country text NOT NULL,
    bank_name character varying(100),
    branch_name character varying(100),
    ifsc_code character varying(20),
    account_number character varying(30),
    status character varying(100),
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at timestamp without time zone,
    CONSTRAINT affiliate_applications_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS public.affiliate_clicks
(
    id SERIAL PRIMARY KEY,
    affiliate_user_id integer NOT NULL,
    affiliate_code varchar(50) NOT NULL,
    ip_address varchar(45),
    user_agent text,
    referrer text,
    product_id integer,
    combo_id integer,
    converted boolean NOT NULL DEFAULT false,
    order_id integer,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT affiliate_clicks_affiliate_user_id_fkey FOREIGN KEY (affiliate_user_id)
        REFERENCES public.users (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,

    CONSTRAINT affiliate_clicks_combo_id_fkey FOREIGN KEY (combo_id)
        REFERENCES public.combos (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT affiliate_clicks_order_id_fkey FOREIGN KEY (order_id)
        REFERENCES public.orders (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT affiliate_clicks_product_id_fkey FOREIGN KEY (product_id)
        REFERENCES public.products (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);
CREATE TABLE IF NOT EXISTS public.affiliate_sales
(
    id SERIAL PRIMARY KEY,
    affiliate_user_id integer NOT NULL,
    affiliate_code varchar(50) NOT NULL,
    order_id integer NOT NULL,
    customer_id integer NOT NULL,
    customer_name varchar(255) NOT NULL,
    customer_email varchar(255) NOT NULL,
    customer_phone varchar(20),
    product_id integer,
    combo_id integer,
    product_name text NOT NULL,
    sale_amount numeric(10,2) NOT NULL,
    commission_rate numeric(5,2) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    
    CONSTRAINT affiliate_sales_affiliate_user_id_fkey FOREIGN KEY (affiliate_user_id)
        REFERENCES public.users (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,

    CONSTRAINT affiliate_sales_order_id_fkey FOREIGN KEY (order_id)
        REFERENCES public.orders (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT affiliate_sales_product_id_fkey FOREIGN KEY (product_id)
        REFERENCES public.products (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT affiliate_sales_combo_id_fkey FOREIGN KEY (combo_id)
        REFERENCES public.combos (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);
CREATE TABLE IF NOT EXISTS public.affiliate_transactions
(
    id SERIAL PRIMARY KEY,
    user_id integer NOT NULL,
    type varchar(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    balance_type varchar(20) NOT NULL,
    description text NOT NULL,
    order_id integer,
    status varchar(20) NOT NULL DEFAULT 'completed',
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transaction_id varchar(255),
    notes text,
    processed_at timestamp without time zone,

    CONSTRAINT affiliate_transactions_order_id_fkey FOREIGN KEY (order_id)
        REFERENCES public.orders (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT affiliate_transactions_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.affiliate_transactions
    OWNER TO postgres;
CREATE TABLE IF NOT EXISTS public.affiliate_wallet
(
    id SERIAL PRIMARY KEY,
    user_id integer NOT NULL UNIQUE,
    cashback_balance numeric(10,2) NOT NULL DEFAULT 0.00,
    commission_balance numeric(10,2) NOT NULL DEFAULT 0.00,
    total_earnings numeric(10,2) NOT NULL DEFAULT 0.00,
    total_withdrawn numeric(10,2) NOT NULL DEFAULT 0.00,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT affiliate_wallet_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.affiliate_wallet
    OWNER TO postgres;
 
 CREATE TABLE IF NOT EXISTS public.user_wallet
(
    id SERIAL PRIMARY KEY,
    user_id integer NOT NULL UNIQUE,
    cashback_balance numeric(10,2) NOT NULL DEFAULT 0.00,
    total_earned numeric(10,2) NOT NULL DEFAULT 0.00,
    total_redeemed numeric(10,2) NOT NULL DEFAULT 0.00,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_wallet_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.user_wallet
    OWNER TO postgres;

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_user_wallet_user_id
    ON public.user_wallet USING btree (user_id ASC NULLS LAST)
    TABLESPACE pg_default;
CREATE TABLE IF NOT EXISTS public.user_wallet_transactions
(
    id SERIAL PRIMARY KEY,
    user_id integer NOT NULL,
    type varchar(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text NOT NULL,
    order_id integer,
    balance_before numeric(10,2) NOT NULL,
    balance_after numeric(10,2) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'completed',
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_wallet_transactions_order_id_fkey FOREIGN KEY (order_id)
        REFERENCES public.orders (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT user_wallet_transactions_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.user_wallet_transactions
    OWNER TO postgres;

-- Index: created_at
CREATE INDEX IF NOT EXISTS idx_user_wallet_transactions_created_at
    ON public.user_wallet_transactions USING btree
    (created_at ASC NULLS LAST)
    TABLESPACE pg_default;

-- Index: user_id
CREATE INDEX IF NOT EXISTS idx_user_wallet_transactions_user_id
    ON public.user_wallet_transactions USING btree
    (user_id ASC NULLS LAST)
    TABLESPACE pg_default;

	ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS cashback_amount NUMERIC(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS affiliate_code TEXT COLLATE pg_catalog."default",
ADD COLUMN IF NOT EXISTS affiliate_discount INTEGER DEFAULT 0;


CREATE OR REPLACE FUNCTION public.calculate_cashback_price()
RETURNS trigger AS $$
BEGIN
    -- Only calculate if both price and cashback_percentage are provided
    IF NEW.cashback_percentage IS NOT NULL AND NEW.cashback_percentage > 0 THEN
        -- Assuming your products table has a column named "price"
        NEW.cashback_price := ROUND(NEW.price * (NEW.cashback_percentage / 100), 2);
    ELSE
        NEW.cashback_price := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_calculate_cashback_price
BEFORE INSERT OR UPDATE
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.calculate_cashback_price();
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS cashback_percentage numeric(5,2),
ADD COLUMN IF NOT EXISTS cashback_price numeric(10,2);


ALTER TABLE public.order_items
ADD COLUMN cashback_price REAL,
ADD COLUMN cashback_percentage REAL;

CREATE TABLE IF NOT EXISTS "offers" (
  "id" SERIAL PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT NOT NULL,
  "discount_percentage" INTEGER,
  "discount_text" TEXT,
  "valid_from" TIMESTAMP NOT NULL,
  "valid_until" TIMESTAMP NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "sort_order" INTEGER DEFAULT 0 NOT NULL,
  "link_url" TEXT,
  "button_text" TEXT DEFAULT 'Shop Now',
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for active offers
CREATE INDEX IF NOT EXISTS "idx_offers_active" ON "offers" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_offers_valid_period" ON "offers" ("valid_from", "valid_until");
CREATE INDEX IF NOT EXISTS "idx_offers_sort_order" ON "offers" ("sort_order");
