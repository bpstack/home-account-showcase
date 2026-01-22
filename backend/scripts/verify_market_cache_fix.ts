
import pool from '../config/db';
import crypto from 'crypto';

async function verifyFix() {
  const testId = crypto.randomUUID();
  try {
    console.log('🧪 Verifying fix by inserting source="multiple"...');
    
    // Attempt to insert a record with source = 'multiple'
    // This previously caused the "Data truncated" error
    await pool.query(`
      INSERT INTO market_data_cache (id, symbol, source, data, cached_at, expires_at)
      VALUES (?, ?, ?, ?, NOW(), NOW() + INTERVAL 1 MINUTE)
    `, [testId, 'test-verification', 'multiple', '{"verified": true}']);
    
    console.log('✅ INSERT SUCCEEDED: The database now accepts source="multiple".');
    
    // Clean up
    await pool.query('DELETE FROM market_data_cache WHERE id = ?', [testId]);
    console.log('🧹 Cleanup: Test record deleted.');
    
  } catch (error: any) {
    console.error('❌ VERIFICATION FAILED:', error.message);
    if (error.code === 'WARN_DATA_TRUNCATED') {
      console.error('   The ENUM still does not support "multiple".');
    }
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verifyFix();
