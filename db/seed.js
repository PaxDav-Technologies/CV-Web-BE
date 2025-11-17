const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

const NUM_CUSTOMERS = 10;
const NUM_AGENTS = 5;
const NUM_ADMINS = 2;
const NUM_SUPER_ADMINS = 1;
const NUM_PROPERTIES = 20;
const NUM_TRANSACTIONS = 30;
const NUM_BOOKINGS = 10;
const NUM_BLOGS = 10;

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    port: process.env.DB_PORT || 3306,
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'testdb',
    waitForConnections: true,
    connectionLimit: 10,
  });

  console.log('Connected to database ✅');

  const hashPassword = async (password) => await bcrypt.hash(password, 10);
  const accounts = [];

  // === ACCOUNTS ===
  console.log('Seeding accounts...');
  const insertAccount = async (
    firstname,
    lastname,
    email,
    role,
    method = 'password'
  ) => {
    const password = await hashPassword('password123');
    const [result] = await pool.query(
      `INSERT INTO account (firstname, lastname, email, password, verified, avatar, method, role, suspended)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstname,
        lastname,
        email,
        password,
        true,
        faker.image.avatar(),
        method,
        role,
        false
      ]
    );
    return result.insertId;
  };


  //Super admins
  for (let i = 0; i < NUM_SUPER_ADMINS; i++) {
    const id = await insertAccount(
      faker.person.firstName(),
      faker.person.lastName(),
      `super_admin${i}@gmail.com`,
      'super_admin'
    );
    await pool.query(
      `INSERT INTO admins (account_id, phone_number, username)
       VALUES (?, ?, ?)`,
      [id, faker.phone.number(), faker.internet.userName()]
    );
    accounts.push({ id, role: 'super_admin' });
  }

  // Admins
  for (let i = 0; i < NUM_ADMINS; i++) {
    const id = await insertAccount(
      faker.person.firstName(),
      faker.person.lastName(),
      `admin${i}@gmail.com`,
      'admin'
    );
    await pool.query(
      `INSERT INTO admins (account_id, phone_number, username)
       VALUES (?, ?, ?)`,
      [id, faker.phone.number(), faker.internet.userName()]
    );
    accounts.push({ id, role: 'admin' });
  }

  // Agents
  for (let i = 0; i < NUM_AGENTS; i++) {
    const id = await insertAccount(
      faker.person.firstName(),
      faker.person.lastName(),
      `agent${i}@gmail.com`,
      'agent'
    );
    await pool.query(
      `INSERT INTO agents (account_id, professional_type, experience_level, phone_number)
       VALUES (?, ?, ?, ?)`,
      [
        id,
        faker.helpers.arrayElement([
          'real_estate_agent',
          'property_manager',
          'developer',
        ]),
        faker.helpers.arrayElement(['beginner', 'intermediate', 'expert']),
        faker.phone.number(),
      ]
    );
    accounts.push({ id, role: 'agent' });
  }

  // Customers
  for (let i = 0; i < NUM_CUSTOMERS; i++) {
    const id = await insertAccount(
      faker.person.firstName(),
      faker.person.lastName(),
      `customer${i}@gmail.com`,
      'customer'
    );
    accounts.push({ id, role: 'customer' });
  }

  console.log(`✅ ${accounts.length} accounts created`);

  // === COORDINATES ===
  const coordinates = [];
  for (let i = 0; i < NUM_PROPERTIES; i++) {
    const [res] = await pool.query(
      `INSERT INTO coordinates (longitude, latitude) VALUES (?, ?)`,
      [faker.location.longitude(), faker.location.latitude()]
    );
    coordinates.push(res.insertId);
  }

  // === AMENITIES, BENEFITS, CATEGORIES ===
  const amenitiesList = [
    'Kitchen',
    'Laundry area',
    'Dinning area',
    'Terrace',
    'Fenced compound',
    'Car Park / Garage',
    'Home Garden',
    'CCTV Surveillance',
    'Swimming Pool',
    'Gym',
    'Intercom System',
    'Smart House System',
    '24/7 Electricity',
    'Bar',
    'Elevator/lift',
    'Waste Disposal Service',
    'Wifi Ready',
    'Private Lounge',
    'Home Cinema',
    'Walk in closet',
    'Office/Study room',
  ];
  const benefitsList = [
    'Free Maintenance',
    'Flexible Payment',
    'Furnished',
    '24/7 Power',
  ];
  const categoriesList = [
    'Real Estate',
    'Investment',
    'Property Tips',
    'Home Decor',
  ];

  for (const name of amenitiesList)
    await pool.query(`INSERT INTO amenities (name, avatar) VALUES (?, ?)`, [
      name,
      faker.image.urlPicsumPhotos(),
    ]);

  for (const name of benefitsList)
    await pool.query(`INSERT INTO benefit (name) VALUES (?)`, [name]);

  for (const name of categoriesList)
    await pool.query(
      `INSERT INTO categories (name, description) VALUES (?, ?)`,
      [name, faker.lorem.paragraph()]
    );

  console.log('✅ Amenities, benefits, and categories seeded');

  // === PROPERTIES ===
  console.log('Seeding properties...');
  const [amenities] = await pool.query(`SELECT id FROM amenities`);
  const [benefits] = await pool.query(`SELECT id FROM benefit`);
  const [categories] = await pool.query(`SELECT id FROM categories`);
  const propertyIds = [];

  for (let i = 0; i < NUM_PROPERTIES; i++) {
    const agent = faker.helpers.arrayElement(
      accounts.filter((a) => a.role === 'agent')
    );
    const coord = faker.helpers.arrayElement(coordinates);

    const [property] = await pool.query(
      `INSERT INTO property
      (name, address, total_price, price_per_year, agent_fee, inspection_fee, about, main_photo,
       bedrooms, toilets, bathrooms, parking_space, land_size, coordinates_id, category, type, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        faker.company.name(),
        faker.location.streetAddress(),
        faker.number.float({ min: 50000, max: 500000, precision: 0.01 }),
        faker.number.float({ min: 1000, max: 5000, precision: 0.01 }),
        faker.number.float({ min: 500, max: 2000, precision: 0.01 }),
        faker.number.float({ min: 50, max: 200, precision: 0.01 }),
        faker.lorem.paragraph(),
        faker.image.urlPicsumPhotos(),
        faker.number.int({ min: 1, max: 6 }),
        faker.number.int({ min: 1, max: 5 }),
        faker.number.int({ min: 1, max: 4 }),
        faker.number.int({ min: 1, max: 3 }),
        faker.number.float({ min: 100, max: 1000 }),
        coord,
        faker.helpers.arrayElement(['sale', 'rent', 'shortlet']),
        faker.helpers.arrayElement(['house', 'land', 'hostel']),
        agent.id,
      ]
    );

    const propertyId = property.insertId;
    propertyIds.push(propertyId);

    // property_resources
    const numRes = faker.number.int({ min: 1, max: 3 });
    for (let j = 0; j < numRes; j++) {
      const [res] = await pool.query(
        `INSERT INTO resources (url, type) VALUES (?, ?)`,
        [
          faker.image.urlPicsumPhotos(),
          faker.helpers.arrayElement(['image', 'video', 'document']),
        ]
      );
      await pool.query(
        `INSERT INTO property_resources (property_id, resource_id) VALUES (?, ?)`,
        [propertyId, res.insertId]
      );
    }

    // property_amenities
    const selectedAmenities = faker.helpers.arrayElements(amenities, 2);
    for (const a of selectedAmenities)
      await pool.query(
        `INSERT INTO property_amenities (property_id, amenity_id) VALUES (?, ?)`,
        [propertyId, a.id]
      );

    // property_benefits
    const selectedBenefits = faker.helpers.arrayElements(benefits, 2);
    for (const b of selectedBenefits)
      await pool.query(
        `INSERT INTO property_benefit (property_id, benefit_id) VALUES (?, ?)`,
        [propertyId, b.id]
      );

    // nearby landmarks
    const numLandmarks = faker.number.int({ min: 1, max: 3 });
    for (let k = 0; k < numLandmarks; k++)
      await pool.query(
        `INSERT INTO nearby_landmarks (property_id, landmark) VALUES (?, ?)`,
        [propertyId, faker.company.name()]
      );
  }

  console.log(`✅ ${propertyIds.length} properties seeded`);

  // === TRANSACTIONS ===
  console.log('Seeding transactions...');
  for (let i = 0; i < NUM_TRANSACTIONS; i++) {
    const property = faker.helpers.arrayElement(propertyIds);
    const customer = faker.helpers.arrayElement(
      accounts.filter((a) => a.role === 'customer')
    );
    const ref = faker.string.alphanumeric(10).toUpperCase();
    await pool.query(
      `INSERT INTO transactions (property_id, account_id, reference, commission, amount, currency, type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        property,
        customer.id,
        ref,
        faker.number.float({ min: 100, max: 1000, precision: 0.01 }),
        faker.number.float({ min: 1000, max: 5000, precision: 0.01 }),
        'USD',
        faker.helpers.arrayElement([
          'rent',
          'sale',
          'shortlet',
          'inspection_fee',
        ]),
        faker.helpers.arrayElement(['pending', 'success', 'failed']),
      ]
    );
  }

  console.log(`✅ ${NUM_TRANSACTIONS} transactions added`);

  // === BOOKINGS ===
  console.log('Seeding bookings...');
  for (let i = 0; i < NUM_BOOKINGS; i++) {
    const property = faker.helpers.arrayElement(propertyIds);
    const customer = faker.helpers.arrayElement(
      accounts.filter((a) => a.role === 'customer')
    );
    const startDate = faker.date.future();
    const endDate = faker.date.future({ years: 1, refDate: startDate });
    await pool.query(
      `INSERT INTO bookings (account_id, property_id, status, start_date, end_date)
       VALUES (?, ?, ?, ?, ?)`,
      [
        customer.id,
        property,
        faker.helpers.arrayElement(['active', 'completed', 'cancelled']),
        startDate,
        endDate,
      ]
    );
  }
  console.log(`✅ ${NUM_BOOKINGS} bookings created`);

  // === BLOGS ===
  console.log('Seeding blogs...');
  const [categoryRows] = await pool.query(`SELECT id FROM categories`);
  for (let i = 0; i < NUM_BLOGS; i++) {
    const author = faker.helpers.arrayElement(
      accounts.filter((a) => ['admin', 'agent'].includes(a.role))
    );
    const category = faker.helpers.arrayElement(categoryRows);
    const [blog] = await pool.query(
      `INSERT INTO blogs (title, content, main_photo, category_id, author_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        faker.lorem.sentence(),
        faker.lorem.paragraphs(2),
        faker.image.urlPicsumPhotos(),
        category.id,
        author.id,
      ]
    );
    await pool.query(
      `INSERT INTO blog_categories (blog_id, category_id) VALUES (?, ?)`,
      [blog.insertId, category.id]
    );
  }

  console.log(`✅ ${NUM_BLOGS} blogs seeded`);

  // === VIEWS + SAVED PROPERTIES ===
  console.log('Seeding views and saves...');
  const customers = accounts.filter((a) => a.role === 'customer');
  for (const user of customers) {
    const viewed = faker.helpers.arrayElements(propertyIds, 3);
    for (const p of viewed)
      await pool.query(
        `INSERT INTO views (account_id, property_id) VALUES (?, ?)`,
        [user.id, p]
      );

    const saved = faker.helpers.arrayElements(propertyIds, 2);
    for (const p of saved)
      await pool.query(
        `INSERT INTO save (account_id, property_id) VALUES (?, ?)`,
        [user.id, p]
      );
  }

  console.log('✅ Views and saved properties added');

  await pool.end();
  console.log('🌱 Database fully seeded successfully!');
})();
