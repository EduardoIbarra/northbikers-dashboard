-- SQL to add isParticipantsOnly column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "isParticipantsOnly" BOOLEAN DEFAULT false;
