import pool from './dblogin.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

//creates all the tables
const createTables = async () => {
    try { 
        //user
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            telno VARCHAR(20) UNIQUE,
            role VARCHAR(50) NOT NULL,
            consultation_count INT DEFAULT 0,
            payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        //POI
        await pool.query(`
            CREATE TABLE pois (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL,
            address TEXT,
            latitude DECIMAL(9, 6) NOT NULL,
            longitude DECIMAL(9, 6) NOT NULL,
            verified BOOLEAN DEFAULT FALSE
            );
        `);
        //doctor
        await pool.query(`
            CREATE TABLE IF NOT EXISTS doctors (
            user_id INTEGER,
            specialization TEXT,
            poi_id INTEGER,
            verified BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
            );
        `);
        //customer service
        await pool.query(`
            CREATE TABLE customer_services (
            user_id INTEGER,
            poi_id INTEGER,
            verified BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
            );
        `);
        //channel
        await pool.query(`
            CREATE TABLE channels (
            id SERIAL PRIMARY KEY,
            user_id0 INT NOT NULL,
            user_id1 INT NOT NULL,
            type VARCHAR(50) NOT NULL,
            archived BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id0) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id1) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        //messages
        await pool.query(`
            CREATE TABLE messages (
            id SERIAL PRIMARY KEY,
            channel_id INT NOT NULL,
            user_id INT NOT NULL,
            content TEXT,
            image BYTEA,
            type TEXT NOT NULL,
            read BOOLEAN DEFAULT FALSE,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        //medical record
        await pool.query(`
            CREATE TABLE medical_records (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            doctor_id INT NOT NULL,
            medications TEXT,
            medical_conditions TEXT,
            notes TEXT,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (doctor_id) references users(id) ON DELETE CASCADE
            );
        `);
        //evidence
        await pool.query(`
            CREATE TABLE evidences(
            user_id INT NOT NULL,
            image BYTEA,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        //user_tokens
        await pool.query(`
            CREATE TABLE user_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            device_token TEXT UNIQUE,
            platform TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        //reviews/feedbacks
        await pool.query(`
            CREATE TABLE reviews(
            id SERIAL PRIMARY KEY,
            reviewer_id INT,
            reviewee_id INT,
            score INT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        //admins
        await pool.query(`
            CREATE TABLE admins(
            id SERIAL PRIMARY KEY,
            poi_id INT,
            telno VARCHAR(20) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            level INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
            );
        `);
        await pool.query(`
            CREATE TABLE payments(
            id SERIAL PRIMARY KEY,
            amount DECIMAL(18, 6),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
            )
        `);
        const email = process.env.ADMIN_EMAIL;
        const telno = process.env.ADMIN_TELNO;
        const level = 1;
        const poi_id = null;
        const hashedPassword = await bcrypt.hash('123456', 10);

        await pool.query(
        `INSERT INTO admins (poi_id, telno, email, level, password)
        VALUES ($1, $2, $3, $4, $5)`,
        [poi_id, telno, email, level, hashedPassword]
        );

        console.log('Finished migrating tables');
    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await pool.end();
        console.log('Connection closed');
    }
};

// Call the function to create tables
createTables();
