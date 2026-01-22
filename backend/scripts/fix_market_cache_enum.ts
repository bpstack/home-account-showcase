
import pool from '../config/db';

async function fixEnum() {
  try {
    console.log('🔄 Fixing market_data_cache table schema...');
    
    await pool.query(`
      ALTER TABLE market_data_cache 
      MODIFY COLUMN source ENUM('coingecko', 'frankfurter', 'alphavantage', 'yahoo', 'multiple') NOT NULL
    `);
    
    console.log('✅ Successfully updated source column ENUM to include "multiple"');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

fixEnum();
