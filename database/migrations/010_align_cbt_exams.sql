-- Migration: 010_align_cbt_exams
-- Description: Align cbt_exams to become an exam event/container by removing subject dependency.

-- Drop foreign key related to subject_id
ALTER TABLE `cbt_exams` DROP FOREIGN KEY `fk_cbt_exams_subject`;

-- Drop the composite index that includes subject_id
ALTER TABLE `cbt_exams` DROP INDEX `idx_cbt_exams_subject_academic`;

-- Drop the subject_id column
ALTER TABLE `cbt_exams` DROP COLUMN `subject_id`;

-- Add a new index without subject_id
ALTER TABLE `cbt_exams` ADD INDEX `idx_cbt_exams_academic` (`academic_year_id`, `semester`);
