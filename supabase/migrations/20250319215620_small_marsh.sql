/*
  # Add cascade deletion for post-related tables

  1. Changes
    - Add ON DELETE CASCADE to foreign key constraints in:
      - votes table (post_id reference)
      - post_identities table (post_id reference)
    
  2. Security
    - Maintains existing RLS policies
    - Ensures data consistency when deleting posts
*/

-- Modify votes table foreign key
ALTER TABLE votes
DROP CONSTRAINT votes_post_id_fkey,
ADD CONSTRAINT votes_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE CASCADE;

-- Modify post_identities table foreign key
ALTER TABLE post_identities
DROP CONSTRAINT post_identities_post_id_fkey,
ADD CONSTRAINT post_identities_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE CASCADE;