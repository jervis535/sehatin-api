import pool from './dblogin.js';

//drops all tables
const dropTables=async()=>{
    try{
        await pool.query('DROP TABLE IF EXISTS admins')
        await pool.query('DROP TABLE IF EXISTS reviews')
        await pool.query('DROP TABLE IF EXISTS user_tokens;')
        await pool.query('DROP TABLE IF EXISTS doctors;');
        await pool.query('DROP TABLE IF EXISTS customer_services;');
        await pool.query('DROP TABLE IF EXISTS messages;');
        await pool.query('DROP TABLE IF EXISTS medical_records;');
        await pool.query('DROP TABLE IF EXISTS evidences;');
        await pool.query('DROP TABLE IF EXISTS channels;');
        await pool.query('DROP TABLE IF EXISTS users;');
        await pool.query('DROP TABLE IF EXISTS pois;');
        await pool.query('DROP TABLE IF EXISTS payments;');
        

        console.log('Finished deleting tables');
    }catch(error){
        console.error('Error during table deletion:',error);
    }finally{
        await pool.end();
        console.log('Connection closed');
    }
};

dropTables();
