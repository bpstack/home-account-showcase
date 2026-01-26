const mysql = require('mysql2');

// Definir variables de entorno directamente
const env = {
  DB_HOST: 'mysql-59db8a6-esportsdz-29f7.d.aivencloud.com',
  DB_PORT: '23999',
  DB_USER: 'avnadmin',
  DB_PASSWORD: 'your-password-here',
  DB_DATABASE: 'home_account',
  DB_SSL: 'true',
};

console.log('Variables de entorno cargadas:', env);

const connection = mysql.createConnection({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
  ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

connection.connect((err) => {
  if (err) {
    console.error('Error de conexión:', err);
  } else {
    console.log('Conexión exitosa');
  }
  connection.end();
});