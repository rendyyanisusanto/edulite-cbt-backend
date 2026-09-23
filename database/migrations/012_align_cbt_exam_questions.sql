-- Migration: 012_align_cbt_exam_questions
-- Description: Align cbt_exam_questions to reference assignment instead of exam.

-- Drop the old foreign key and index
ALTER TABLE `cbt_exam_questions` DROP FOREIGN KEY `fk_cbt_exam_questions_exam`;
ALTER TABLE `cbt_exam_questions` DROP INDEX `uq_cbt_exam_source_question`;
ALTER TABLE `cbt_exam_questions` DROP INDEX `idx_cbt_exam_questions_order`;

-- Change the column name
ALTER TABLE `cbt_exam_questions` CHANGE `exam_id` `exam_assignment_id` INT NOT NULL;

-- Add new constraints and indexes
ALTER TABLE `cbt_exam_questions` ADD CONSTRAINT `fk_cbt_exam_questions_assignment` FOREIGN KEY (`exam_assignment_id`) REFERENCES `cbt_exam_assignments` (`id`) ON DELETE CASCADE;
ALTER TABLE `cbt_exam_questions` ADD UNIQUE INDEX `uq_cbt_assignment_source_question` (`exam_assignment_id`, `source_question_id`);
ALTER TABLE `cbt_exam_questions` ADD INDEX `idx_cbt_exam_questions_order` (`exam_assignment_id`, `sort_order`);
