const { pool } = require('../config/db');

exports.getAllProperties = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Use query parameters for filters (optional)
    const {
      bedrooms,
      toilets,
      parking_space,
      draft,
      search,
      min_price,
      max_price,
      page = 1,
      limit = 100,
    } = req.query;

    const conditions = [];
    const params = [];

    if (bedrooms !== undefined) {
      conditions.push('bedrooms = ?');
      params.push(parseInt(bedrooms, 10));
    }
    if (toilets !== undefined) {
      conditions.push('toilets = ?');
      params.push(parseInt(toilets, 10));
    }
    if (parking_space !== undefined) {
      conditions.push('parking_space = ?');
      params.push(parseInt(parking_space, 10));
    }
    if (draft !== undefined) {
      // Accept 'true'|'1' as true
      const d = draft === 'true' || draft === '1' ? 1 : 0;
      conditions.push('draft = ?');
      params.push(d);
    }
    if (min_price !== undefined) {
      conditions.push('price_per_year >= ?');
      params.push(parseFloat(min_price));
    }
    if (max_price !== undefined) {
      conditions.push('price_per_year <= ?');
      params.push(parseFloat(max_price));
    }
    if (search) {
      conditions.push('(name LIKE ? OR address LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    let sql = 'SELECT * FROM property';
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

    // Pagination
    const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (pg - 1) * lim;
    sql += ' LIMIT ? OFFSET ?';
    params.push(lim, offset);

    const [allProperties] = await connection.query(sql, params);
    return res.status(200).json({ message: 'Success', data: allProperties });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('getAllProperties error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.getPropertyById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ message: 'Invalid property id' });
    }

    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM property WHERE id = ?',
      [parsedId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    return res.status(200).json({ message: 'success', data: rows[0] });
  } catch (error) {
    console.error(`Error getting property by ID: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.createProperty = async (req, res) => {
  let connection;
  try {
    const {
      name,
      address,
      total_price,
      price_per_year,
      agent_fee,
      service_charge,
      main_photo,
      phone,
      bedrooms,
      toilets,
      bathrooms,
      type,
      parking_space,
      location,
      owner_id,
      details,
      category,
      land_size,
      amenities = [],
      property_resources = [], // Array of objects: {url: string, type: 'image'|'video'|'document'}
      draft = false,
    } = req.body;

    if (
      !name ||
      !address ||
      !type ||
      !main_photo ||
      !phone ||
      !owner_id ||
      !category
    ) {
      return res.status(400).json({
        message:
          'Missing required fields: name, category, address, main_photo, phone, owner_id',
      });
    }

    if (type === 'land' && !land_size) {
      return res.status(400).json({
        message: 'Land size is required for land properties',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    let query = `
      INSERT INTO property (
        name, address, type, category, total_price, price_per_year, 
        agent_fee, service_charge, main_photo, phone, bedrooms, 
        toilets, bathrooms, parking_space, location, owner_id, 
        details, draft, created_at
    `;

    let values = [
      name,
      address,
      type,
      category,
      total_price || 0,
      price_per_year || 0,
      agent_fee || 0,
      service_charge || 0,
      main_photo,
      phone,
      bedrooms || null,
      toilets || null,
      bathrooms || null,
      parking_space || null,
      location || null,
      owner_id,
      details || null,
      draft ? 1 : 0,
    ];

    if (type === 'land' && land_size) {
      query = `
        INSERT INTO property (
          name, address, type, category, total_price, price_per_year, 
          agent_fee, service_charge, main_photo, phone, location, 
          owner_id, details, draft, land_size, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      values = [
        name,
        address,
        type,
        category,
        total_price || 0,
        price_per_year || 0,
        agent_fee || 0,
        service_charge || 0,
        main_photo,
        phone,
        location || null,
        owner_id,
        details || null,
        draft ? 1 : 0,
        land_size,
      ];
    } else {
      query += `) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    }

    const [result] = await connection.query(query, values);
    const insertedId = result.insertId;

    // Handle Property Resources (Images/Videos/Documents)
    if (property_resources && property_resources.length > 0) {
      const resourceQueries = [];

      for (const resource of property_resources) {
        if (resource.url && resource.type) {
          // Insert into resources table
          const [resourceResult] = await connection.query(
            'INSERT INTO resources (url, type, uploaded_at) VALUES (?, ?, NOW())',
            [resource.url, resource.type]
          );

          const resourceId = resourceResult.insertId;

          // Insert into property_resources table
          resourceQueries.push(
            connection.query(
              'INSERT INTO property_resources (property_id, resource_id) VALUES (?, ?)',
              [insertedId, resourceId]
            )
          );
        }
      }

      // Execute all resource queries
      await Promise.all(resourceQueries);
    }

    // Handle Amenities
    if (amenities && amenities.length > 0) {
      // Validate that amenities exist in the amenities table
      const placeholders = amenities.map(() => '?').join(',');
      const [existingAmenities] = await connection.query(
        `SELECT id FROM amenities WHERE id IN (${placeholders})`,
        amenities
      );

      const existingAmenityIds = existingAmenities.map((amenity) => amenity.id);

      // Insert valid amenities into property_amenities table
      const amenityQueries = existingAmenityIds.map((amenityId) =>
        connection.query(
          'INSERT INTO property_amenities (property_id, amenity_id) VALUES (?, ?)',
          [insertedId, amenityId]
        )
      );

      await Promise.all(amenityQueries);
    }

    await connection.commit();

    // Fetch complete property data with relationships
    const [propertyRows] = await connection.query(
      `SELECT p.*, 
    GROUP_CONCAT(DISTINCT r.url) as resource_urls,
    GROUP_CONCAT(DISTINCT r.type) as resource_types,
    GROUP_CONCAT(DISTINCT am.id) as amenity_ids,
    GROUP_CONCAT(DISTINCT am.name) as amenity_names
  FROM property p
  LEFT JOIN property_resources pr ON p.id = pr.property_id
  LEFT JOIN resources r ON pr.resource_id = r.id
  LEFT JOIN property_amenities pa ON p.id = pa.property_id
  LEFT JOIN amenities am ON pa.amenity_id = am.id
  WHERE p.id = ?
  GROUP BY p.id`,
      [insertedId]
    );

    const property = propertyRows[0];

    // Format the response
    if (property) {
      property.resources = property.resource_urls
        ? property.resource_urls.split(',').map((url, index) => ({
            url,
            type: property.resource_types
              ? property.resource_types.split(',')[index]
              : 'image',
          }))
        : [];

      property.amenities = property.amenity_ids
        ? property.amenity_ids.split(',').map((id, index) => ({
            id: parseInt(id),
            name: property.amenity_names
              ? property.amenity_names.split(',')[index]
              : '',
          }))
        : [];

      // Remove temporary fields
      delete property.resource_urls;
      delete property.resource_types;
      delete property.amenity_ids;
      delete property.amenity_names;
    }

    return res.status(201).json({
      message: 'Property created successfully',
      data: property,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('createProperty error:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateProperty = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ message: 'Invalid property id' });
    }

    const allowed = [
      'name',
      'address',
      'total_price',
      'price_per_year',
      'agent_fee',
      'service_charge',
      'main_photo',
      'phone',
      'bedrooms',
      'toilets',
      'bathrooms',
      'parking_space',
      'location',
      'owner_id',
      'details',
      'draft',
    ];

    const updates = [];
    const params = [];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates.push(`${key} = ?`);
        const val = key === 'draft' ? (req.body[key] ? 1 : 0) : req.body[key];
        params.push(val);
      }
    }

    if (updates.length === 0) {
      return res
        .status(400)
        .json({ message: 'No valid fields provided to update' });
    }

    connection = await pool.getConnection();

    params.push(parsedId);
    const sql = `UPDATE property SET ${updates.join(', ')} WHERE id = ?`;
    const [result] = await connection.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const [rows] = await connection.query(
      'SELECT * FROM property WHERE id = ?',
      [parsedId]
    );
    return res.status(200).json({ message: 'Property updated', data: rows[0] });
  } catch (error) {
    console.error('updateProperty error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteProperty = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ message: 'Invalid property id' });
    }

    connection = await pool.getConnection();
    const [result] = await connection.query(
      'DELETE FROM property WHERE id = ?',
      [parsedId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }
    return res.status(200).json({ message: 'Property deleted' });
  } catch (error) {
    console.error('deleteProperty error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.addAmenities = async (req, res) => {
  let connection;
  let amenities = [
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
  try {
    connection = await pool.getConnection();
    for (let amenity of amenities) {
      await connection.query(
        `INSERT INTO amenities (name) VALUES (?)`,
        amenity
      );
    }
    return res.status(201).json({ message: `success` });
  } catch (error) {
    console.log(`Error adding amenities: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};
