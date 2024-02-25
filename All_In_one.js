// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const pg = require('pg');

// Initialize Express app
const app = express();
const port = 3000;

// PostgreSQL configuration
const pool = new pg.Pool({
  user: 'your_username',
  host: 'localhost',
  database: 'your_database_name',
  password: 'your_password',
  port: 5432,
});

// Middleware
app.use(bodyParser.json());

// API endpoints

// Get all categories
app.get('/api/categories', (req, res) => {
  pool.query('SELECT * FROM categories', (error, results) => {
    if (error) {
      console.error('Error fetching categories', error);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(results.rows);
    }
  });
});

// Get products by category ID
app.get('/api/products/:categoryId', (req, res) => {
  const categoryId = req.params.categoryId;
  pool.query('SELECT * FROM products WHERE category_id = $1', [categoryId], (error, results) => {
    if (error) {
      console.error('Error fetching products', error);
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.json(results.rows);
    }
  });
});
app.get('/api/product/:productId', (req, res) => {
    const productId = req.params.productId;
    pool.query('SELECT * FROM products WHERE id = $1', [productId], (error, results) => {
      if (error) {
        console.error('Error fetching product details', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        if (results.rows.length === 0) {
          res.status(404).json({ error: 'Product not found' });
        } else {
          res.json(results.rows[0]);
        }
      }
    });
  });
  // Add product to cart
app.post('/api/cart/add', (req, res) => {
    const { userId, productId, quantity } = req.body;
    pool.query('INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *', [userId, productId, quantity], (error, results) => {
      if (error) {
        console.error('Error adding product to cart', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(results.rows[0]);
      }
    });
  });
  
  // View cart
  app.get('/api/cart/:userId', (req, res) => {
    const userId = req.params.userId;
    pool.query('SELECT * FROM cart WHERE user_id = $1', [userId], (error, results) => {
      if (error) {
        console.error('Error fetching user cart', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(results.rows);
      }
    });
  });
  
  // Update cart
  app.put('/api/cart/update/:userId/:productId', (req, res) => {
    const userId = req.params.userId;
    const productId = req.params.productId;
    const { quantity } = req.body;
    pool.query('UPDATE cart SET quantity = $1 WHERE user_id = $2 AND product_id = $3 RETURNING *', [quantity, userId, productId], (error, results) => {
      if (error) {
        console.error('Error updating cart', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(results.rows[0]);
      }
    });
  });
  
  // Remove item from cart
  app.delete('/api/cart/remove/:userId/:productId', (req, res) => {
    const userId = req.params.userId;
    const productId = req.params.productId;
    pool.query('DELETE FROM cart WHERE user_id = $1 AND product_id = $2 RETURNING *', [userId, productId], (error, results) => {
      if (error) {
        console.error('Error removing item from cart', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(results.rows[0]);
      }
    });
  });
// Place order
app.post('/api/orders/place', (req, res) => {
    const { userId, products } = req.body;
    
    // Assuming 'products' is an array of objects with 'productId' and 'quantity' properties
    
    // Start a transaction
    pool.query('BEGIN', (error) => {
      if (error) {
        console.error('Error starting transaction', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
  
      // Insert order into orders table
      pool.query('INSERT INTO orders (user_id) VALUES ($1) RETURNING id', [userId], (error, orderResult) => {
        if (error) {
          console.error('Error placing order', error);
          pool.query('ROLLBACK');
          res.status(500).json({ error: 'Internal server error' });
          return;
        }
  
        const orderId = orderResult.rows[0].id;
  
        // Insert order items into order_items table
        const values = products.map(product => `(${orderId}, ${product.productId}, ${product.quantity})`).join(',');
        pool.query(`INSERT INTO order_items (order_id, product_id, quantity) VALUES ${values}`, (error) => {
          if (error) {
            console.error('Error adding order items', error);
            pool.query('ROLLBACK');
            res.status(500).json({ error: 'Internal server error' });
            return;
          }
  
          // Commit transaction
          pool.query('COMMIT', (error) => {
            if (error) {
              console.error('Error committing transaction', error);
              res.status(500).json({ error: 'Internal server error' });
            } else {
              res.json({ message: 'Order placed successfully' });
            }
          });
        });
      });
    });
  });
  // Order history
app.get('/api/orders/history/:userId', (req, res) => {
    const userId = req.params.userId;
    pool.query('SELECT * FROM orders WHERE user_id = $1', [userId], (error, results) => {
      if (error) {
        console.error('Error fetching order history', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(results.rows);
      }
    });
  });
  // Order details
app.get('/api/orders/details/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId], (error, results) => {
      if (error) {
        console.error('Error fetching order details', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(results.rows);
      }
    });
  });
  // User registration
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *', [username, email, password], (error, results) => {
      if (error) {
        console.error('Error registering user', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(results.rows[0]);
      }
    });
  });
  // User login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password], (error, results) => {
      if (error) {
        console.error('Error authenticating user', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        if (results.rows.length === 0) {
          res.status(401).json({ error: 'Invalid credentials' });
        } else {
          // Generate and return JWT token
          const token = generateToken(results.rows[0].id);
          res.json({ token });
        }
      }
    });
  });
  
  // JWT token generation function
  function generateToken(userId) {
  // Generate JWT token
  const token = jwt.sign({ userId }, 'secret_key', { expiresIn: '1h' }); // Change 'your_secret_key' to a secret key for signing tokens
  return token;
  }
  function authenticate(req, res, next) {
    // Get token from request headers
    const token = req.headers.authorization;
  
    // Check if token exists
    if (!token) {
      return res.status(401).json({ error: 'Authorization token is required' });
    }
  
    // Verify token
    jwt.verify(token, 'your_secret_key', (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token' });
      } else {
        // Attach user ID to request object for future use
        req.userId = decoded.userId;
        next(); // Move to the next middleware
      }
    });
  }
  // Fetch order history for a user
app.get('/api/orders/history/:userId', authenticate, (req, res) => {
    const userId = req.params.userId;
    pool.query('SELECT * FROM orders WHERE user_id = $1', [userId], (error, results) => {
      if (error) {
        console.error('Error fetching order history', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(results.rows);
      }
    });
  });
  // Fetch details of a specific order
app.get('/api/orders/details/:orderId', authenticate, (req, res) => {
    const orderId = req.params.orderId;
    pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId], (error, results) => {
      if (error) {
        console.error('Error fetching order details', error);
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.json(results.rows);
      }
    });
  });
// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
