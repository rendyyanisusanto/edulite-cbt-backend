-- Migration: 011_create_cbt_exam_assignments
-- Description: Create assignments table linking exams to teacher, subject, and class.

CREATE TABLE `cbt_exam_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  
  `exam_id` INT NOT NULL,
  `teacher_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  
  `target_choice_questions` INT NOT NULL DEFAULT 0,
  `target_essay_questions` INT NOT NULL DEFAULT 0,
  
  `duration_minutes` INT NULL,
  `passing_score` DECIMAL(5,2) NULL,
  `shuffle_questions` TINYINT(1) NOT NULL DEFAULT 1,
  `shuffle_options` TINYINT(1) NOT NULL DEFAULT 1,
  `max_attempts` INT NOT NULL DEFAULT 1,
  
  `created_by` INT NOT NULL,
  `updated_by` INT NULL,
  
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY `uq_cbt_exam_assignment` (`exam_id`, `teacher_id`, `subject_id`, `class_id`),
  
  CONSTRAINT `fk_cbt_exam_assignments_exam` FOREIGN KEY (`exam_id`) REFERENCES `cbt_exams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cbt_exam_assignments_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cbt_exam_assignments_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cbt_exam_assignments_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cbt_exam_assignments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_cbt_exam_assignments_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  
  CONSTRAINT `chk_cbt_ea_target_choice` CHECK (`target_choice_questions` >= 0),
  CONSTRAINT `chk_cbt_ea_target_essay` CHECK (`target_essay_questions` >= 0),
  CONSTRAINT `chk_cbt_ea_target_total` CHECK (`target_choice_questions` + `target_essay_questions` > 0),
  CONSTRAINT `chk_cbt_ea_duration` CHECK (`duration_minutes` IS NULL OR `duration_minutes` > 0),
  CONSTRAINT `chk_cbt_ea_passing_score` CHECK (`passing_score` IS NULL OR (`passing_score` >= 0 AND `passing_score` <= 100)),
  CONSTRAINT `chk_cbt_ea_max_attempts` CHECK (`max_attempts` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
