-- Migration: 013_align_cbt_exam_schedules
-- Description: Align cbt_exam_schedules to reference assignment instead of exam.

-- Drop the old foreign key and index
ALTER TABLE `cbt_exam_schedules` DROP FOREIGN KEY `fk_cbt_schedules_exam`;
ALTER TABLE `cbt_exam_schedules` DROP INDEX `idx_cbt_schedules_exam`;

-- Change the column name
ALTER TABLE `cbt_exam_schedules` CHANGE `exam_id` `exam_assignment_id` INT NOT NULL;

-- Add new constraints and indexes
ALTER TABLE `cbt_exam_schedules` ADD CONSTRAINT `fk_cbt_schedules_assignment` FOREIGN KEY (`exam_assignment_id`) REFERENCES `cbt_exam_assignments` (`id`) ON DELETE CASCADE;
ALTER TABLE `cbt_exam_schedules` ADD INDEX `idx_cbt_schedules_assignment` (`exam_assignment_id`);
