/*
  # Add comment votes table and update comments table

  1. New Tables
    - `comment_votes`
      - `id` (uuid, primary key)
      - `comment_id` (uuid, references comments.id)
      - `user_id` (uuid, references profiles.id)
      - `vote_type` (text, either 'up' or 'down')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `comment_votes` table
    - Add policies for authenticated users to manage their votes
*/

-- Create comment_votes table
CREATE TABLE IF NOT EXISTS comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

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