/*
  # Create post identities table

  1. New Tables
    - `post_identities`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts.id)
      - `username` (text)
      - `avatar_url` (text)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `post_identities` table
    - Add policies for authenticated users to create their own post identities
    - Add policy for public to view post identities
*/

CREATE TABLE IF NOT EXISTS post_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) NOT NULL,
  username text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_identities ENABLE ROW LEVEL SECURITY;

-- Public can view all post identities
CREATE POLICY "Post identities are viewable by everyone"
  ON post_identities FOR SELECT
  TO public
  USING (true);

-- Authenticated users can create post identities for their own posts
CREATE POLICY "Users can create post identities for their own posts"
  ON post_identities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
      AND posts.author_id = auth.uid()
    )
  );

-- Users can update their own post identities
CREATE POLICY "Users can update their own post identities"
  ON post_identities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
      AND posts.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
      AND posts.author_id = auth.uid()
    )
  );

-- Users can delete their own post identities
CREATE POLICY "Users can delete their own post identities"
  ON post_identities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
      AND posts.author_id = auth.uid()
    )
  );