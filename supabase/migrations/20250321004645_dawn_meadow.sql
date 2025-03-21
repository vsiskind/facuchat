/*
  # Add reply functionality to comments

  1. Changes
    - Add parent_comment_id column for reply relationships
    - Add depth column to track nesting level
    - Add indexes for better query performance
    - Add policy for comment replies
    - Add trigger for calculating comment depth
  
  2. Security
    - Maintain existing RLS policies
    - Add specific policy for reply functionality
*/

-- Add parent_comment_id and depth columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comments' AND column_name = 'parent_comment_id'
  ) THEN
    ALTER TABLE comments ADD COLUMN parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comments' AND column_name = 'depth'
  ) THEN
    ALTER TABLE comments ADD COLUMN depth integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add indexes for better performance if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'comments' AND indexname = 'comments_parent_id_idx'
  ) THEN
    CREATE INDEX comments_parent_id_idx ON comments(parent_comment_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'comments' AND indexname = 'comments_depth_idx'
  ) THEN
    CREATE INDEX comments_depth_idx ON comments(depth);
  END IF;
END $$;

-- Add constraint for maximum reply depth if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'max_reply_depth' AND conrelid = 'comments'::regclass
  ) THEN
    ALTER TABLE comments ADD CONSTRAINT max_reply_depth CHECK (depth <= 3);
  END IF;
END $$;

-- Create function to calculate comment depth
CREATE OR REPLACE FUNCTION calculate_comment_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_comment_id IS NULL THEN
    NEW.depth := 0;
  ELSE
    SELECT depth + 1 INTO NEW.depth
    FROM comments
    WHERE id = NEW.parent_comment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set comment depth if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_comment_depth' AND tgrelid = 'comments'::regclass
  ) THEN
    CREATE TRIGGER set_comment_depth
      BEFORE INSERT ON comments
      FOR EACH ROW
      EXECUTE FUNCTION calculate_comment_depth();
  END IF;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can reply to comments" ON comments;
  DROP POLICY IF EXISTS "Users can view comment replies" ON comments;
END $$;

-- Add policy for replies
CREATE POLICY "Users can reply to comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    (
      parent_comment_id IS NULL OR
      EXISTS (
        SELECT 1 FROM comments parent
        WHERE parent.id = parent_comment_id
        AND parent.depth < 3
      )
    )
  );

-- Add policy for viewing replies
CREATE POLICY "Users can view comment replies"
  ON comments FOR SELECT
  TO public
  USING (true);