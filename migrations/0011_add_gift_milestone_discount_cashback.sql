-- Add discount and cashback fields to gift_milestones table
ALTER TABLE gift_milestones ADD COLUMN discount_type varchar(20) DEFAULT 'none';
ALTER TABLE gift_milestones ADD COLUMN discount_value numeric(10, 2);
ALTER TABLE gift_milestones ADD COLUMN cashback_percentage numeric(5, 2);
