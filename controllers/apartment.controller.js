const { pool } = require('../config/db');

exports.getAllApartments = async (req, res) => {
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

    let sql = 'SELECT * FROM apartment';
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

    // Pagination
    const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000);
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (pg - 1) * lim;
    sql += ' LIMIT ? OFFSET ?';
    params.push(lim, offset);

    const [allApartments] = await connection.query(sql, params);
    return res.status(200).json({ message: 'Success', data: allApartments });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('getAllApartments error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.getApartmentById = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ message: 'Invalid apartment id' });
    }

    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM apartment WHERE id = ?',
      [parsedId]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    // return single apartment object
    return res.status(200).json({ message: 'success', data: rows[0] });
  } catch (error) {
    console.error(`Error getting apartment by ID: ${error}`);
    return res.status(500).json({ message: `Internal Server Error` });
  } finally {
    if (connection) connection.release();
  }
};

exports.createApartment = async (req, res) => {
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
      parking_space,
      location,
      owner_id,
      details,
      draft = false,
    } = req.body;

    // Basic required validation
    if (!name || !address || !main_photo || !phone || !owner_id) {
      return res
        .status(400)
        .json({
          message:
            'Missing required fields: name, address, main_photo, phone, owner_id',
        });
    }

    connection = await pool.getConnection();
    const [result] = await connection.query(
      `INSERT INTO apartment (name, address, total_price, price_per_year, agent_fee, service_charge, main_photo, phone, bedrooms, toilets, bathrooms, parking_space, location, owner_id, details, draft, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name,
        address,
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
      ]
    );

    const insertedId = result.insertId;
    const [rows] = await connection.query(
      'SELECT * FROM apartment WHERE id = ?',
      [insertedId]
    );
    return res
      .status(201)
      .json({ message: 'Apartment created', data: rows[0] });
  } catch (error) {
    console.error('createApartment error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.updateApartment = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ message: 'Invalid apartment id' });
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
    const sql = `UPDATE apartment SET ${updates.join(', ')} WHERE id = ?`;
    const [result] = await connection.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Apartment not found' });
    }

    const [rows] = await connection.query(
      'SELECT * FROM apartment WHERE id = ?',
      [parsedId]
    );
    return res
      .status(200)
      .json({ message: 'Apartment updated', data: rows[0] });
  } catch (error) {
    console.error('updateApartment error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteApartment = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      return res.status(400).json({ message: 'Invalid apartment id' });
    }

    connection = await pool.getConnection();
    const [result] = await connection.query(
      'DELETE FROM apartment WHERE id = ?',
      [parsedId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Apartment not found' });
    }
    return res.status(200).json({ message: 'Apartment deleted' });
  } catch (error) {
    console.error('deleteApartment error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    if (connection) connection.release();
  }
};
