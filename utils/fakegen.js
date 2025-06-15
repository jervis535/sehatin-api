import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import pool from './dblogin.js';
import dotenv from 'dotenv';
dotenv.config();

const NUM_USERS = 10;
const NUM_POIS = 5;

async function generateData() {
  try {
    const hashedPassword = await bcrypt.hash('123456', 10);

    const userIds = [];
    const poiIds = [];

    // USERS
    for (let i = 0; i < NUM_USERS; i++) {
      const username = "tester "+ i.toString();
      const email = faker.internet.email();
      const telno = 'u+'+i.toString();
      const role = 'user';

      const result = await pool.query(
        `INSERT INTO users (username, email, password, telno, role)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [username, email, hashedPassword, telno, role]
      );
      userIds.push({ id: result.rows[0].id, role });
    }

    // POIs
    for (let i = 0; i < NUM_POIS; i++) {
      const name = faker.company.name();
      const category = faker.helpers.arrayElement(['Clinic', 'Hospital', 'Health Center']);
      const address = faker.address.streetAddress();
      const latitude = faker.location.latitude();
      const longitude = faker.location.longitude();

      const result = await pool.query(
        `INSERT INTO pois (name, category, address, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [name, category, address, latitude, longitude]
      );
      poiIds.push(result.rows[0].id);
    }

    //doctor
    for (let i = 0; i < 2; i++) {
      const username = "doctor "+ i.toString();
      const email = faker.internet.email();
      const telno = 'd+'+i.toString();
      const role = 'doctor';
      const poi_id = 1;
      const specialization="heart";

      const result = await pool.query(
        `INSERT INTO users (username, email, password, telno, role)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [username, email, hashedPassword, telno, role]
      );
      await pool.query(
        `INSERT INTO doctors (user_id,specialization,poi_id)
        VALUES ($1,$2,$3)`,
        [result.rows[0].id, specialization, poi_id]
      )
    }

    //customer service
    for (let i = 0; i < 2; i++) {
      const username = "cs "+ i.toString();
      const email = faker.internet.email();
      const telno = 'c+'+i.toString();
      const role = 'customer service'
      const poi_id = 1;

      const result = await pool.query(
        `INSERT INTO users (username, email, password, telno, role)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [username, email, hashedPassword, telno, role]
      );
      await pool.query(
        `INSERT INTO customer_services (user_id,poi_id)
        VALUES ($1,$2)`,
        [result.rows[0].id, poi_id]
      )
    }     
    const reviewerId=1;
    const revieweeId=11;

    //channels
    for (let i = 0; i < 5; i++) {
      
      await pool.query(
        `INSERT INTO channels (user_id0, user_id1, type)
        VALUES ($1, $2, $3)`,
        [reviewerId, revieweeId, "test"]
      );
    }

    //reviews
    for (let i=0;i<5;i++){
      await pool.query(
        `INSERT INTO reviews (reviewer_id,reviewee_id,score,notes)
        VALUES ($1,$2,$3,$4)`,
        [reviewerId, revieweeId, 5, "test"]
      )
    }

    const email = "adin@admin.com";
    const telno = "654321";
    const level = 2;
    const poi_id = 1;

    await pool.query(
      `INSERT INTO admins (poi_id, telno, email, level, password)
      VALUES ($1, $2, $3, $4, $5)`,
      [poi_id, telno, email, level, hashedPassword]
    );

  } catch (err) {
    console.error('Error inserting fake data:', err);
  } finally {
    await pool.end();
  }
}

generateData();
