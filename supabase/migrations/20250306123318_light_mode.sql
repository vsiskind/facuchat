/*
  # Add comments schema with identities and votes

  1. New Tables
    - `comment_identities`
      - `id` (uuid, primary key)
      - `comment_id` (uuid, references comments.id)
      - `username` (text)
      - `avatar_url` (text, nullable)
      - `created_at` (timestamp)
    
    - `comment_votes`
      - `id` (uuid, primary key)
      - `comment_id` (uuid, references comments.id)
      - `user_id` (uuid, references profiles.id)
      - `vote_type` (text, either 'up' or 'down')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to:
      - View comment identities and votes
      - Create identities for their own comments
      - Vote on comments
      - Delete their own votes
*/

-- Create comment_identities table if it doesn't exist
CREATE TABLE IF NOT EXISTS comment_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Create comment_votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE comment_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Comment identities are viewable by everyone" ON comment_identities;
    DROP POLICY IF EXISTS "Users can create identities for their own comments" ON comment_identities;
    DROP POLICY IF EXISTS "Comment votes are viewable by everyone" ON comment_votes;
    DROP POLICY IF EXISTS "Users can vote on comments" ON comment_votes;
    DROP POLICY IF EXISTS "Users can update their own votes" ON comment_votes;
    DROP POLICY IF EXISTS "Users can delete their own votes" ON comment_votes;
END $$;

-- Policies for comment_identities
CREATE POLICY "Comment identities are viewable by everyone"
  ON comment_identities
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create identities for their own comments"
  ON comment_identities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM comments
      WHERE comments.id = comment_id
      AND comments.author_id = auth.uid()
    )
  );

-- Policies for comment_votes
CREATE POLICY "Comment votes are viewable by everyone"
  ON comment_votes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can vote on comments"
  ON comment_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON comment_votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON comment_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);