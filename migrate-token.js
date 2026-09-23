import { pool } from './src/config/database.js';

async function run() {
  try {
    console.log('Running migration...');
    // check if token column exists first
    const [cols] = await pool.query('SHOW COLUMNS FROM cbt_exam_schedules');
    const hasTokenHash = cols.some(c => c.Field === 'token_hash');
    const hasToken = cols.some(c => c.Field === 'token');
    
    if (hasTokenHash && !hasToken) {
      await pool.query('ALTER TABLE cbt_exam_schedules CHANGE token_hash token VARCHAR(255)');
      console.log('Successfully renamed token_hash to token');
    } else if (hasToken) {
      console.log('Token column already exists');
    } else {
      console.log('Unexpected schema state:', cols.map(c => c.Field));
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

run();
