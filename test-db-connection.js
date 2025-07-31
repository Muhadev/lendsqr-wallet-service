// test-db-connection.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 30000,
    acquireTimeout: 30000,
    timeout: 30000,
    ssl: { rejectUnauthorized: false }, // For remote databases
  };

  console.log('Attempting connection with config:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    password: config.password ? '***hidden***' : 'NOT SET'
  });

  try {
    console.log('Creating connection...');
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected to MySQL database successfully!');
    
    console.log('Testing query...');
    const [rows] = await connection.execute('SELECT 1 + 1 AS result, NOW() as current_time');
    console.log('✅ Test query result:', rows[0]);
    
    await connection.end();
    console.log('✅ Connection closed successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error errno:', error.errno);
    console.error('Error message:', error.message);
    console.error('Error sqlState:', error.sqlState);
    
    if (error.code === 'ETIMEDOUT') {
      console.error('🔍 This is a timeout error - check network connectivity');
    }
    if (error.code === 'ENOTFOUND') {
      console.error('🔍 Hostname not found - check DB_HOST');
    }
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('🔍 Access denied - check DB_USER and DB_PASSWORD');
    }
    return false;
  }
}

testDatabaseConnection();