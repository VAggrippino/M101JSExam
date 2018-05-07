const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const nunjucks = require('nunjucks');
const { MongoClient } = require('mongodb');
const assert = require('assert');
const { ItemDAO } = require('./items');
const { CartDAO } = require('./cart');

const dbName = 'mongomart';

// Set up express
const app = express();
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '/views'));
app.use('/static', express.static(path.join(__dirname, '/static')));
app.use(bodyParser.urlencoded({ extended: true }));


/*
 Configure nunjucks to work with express Not using consolidate because I'm
 waiting on better support for template inheritance with nunjucks via
 consolidate. See: https://github.com/tj/consolidate.js/pull/224
*/
const env = nunjucks.configure('views', {
  autoescape: true,
  express: app,
});

const nunjucksDate = require('nunjucks-date');

nunjucksDate.setDefaultFormat('MMMM Do YYYY, h:mm:ss a');
env.addFilter('date', nunjucksDate);

const ITEMS_PER_PAGE = 5;

// Hardcoded USERID for use with the shopping cart portion
const USERID = '558098a65133816958968d88';

MongoClient.connect(`mongodb://localhost:27017/${dbName}`, (err, client) => {
  assert.equal(null, err);
  console.log('Successfully connected to MongoDB.');

  const db = client.db(dbName);
  const items = new ItemDAO(db);
  const cart = new CartDAO(db);

  const router = express.Router();

  function cartTotal(userCart) {
    let total = 0;
    for (let i = 0; i < userCart.items.length; i += 1) {
      const item = userCart.items[i];
      total += item.price * item.quantity;
    }

    return total;
  }

  // Homepage
  router.get('/', (req, res) => {
    const page = req.query.page ? parseInt(req.query.page, 10) : 0;
    const category = req.query.category ? req.query.category : 'All';

    // TODO: Fix callback hell here
    items.getCategories((categories) => {
      items.getItems(category, page, ITEMS_PER_PAGE, (pageItems) => {
        items.getNumItems(category, (itemCount) => {
          let numPages = 0;

          if (itemCount > ITEMS_PER_PAGE) {
            numPages = Math.ceil(itemCount / ITEMS_PER_PAGE);
          }

          res.render('home', {
            category_param: category,
            categories,
            useRangeBasedPagination: false,
            itemCount,
            pages: numPages,
            page,
            items: pageItems,
          });
        });
      });
    });
  });


  router.get('/search', (req, res) => {
    const page = req.query.page ? parseInt(req.query.page, 10) : 0;
    const query = req.query.query ? req.query.query : '';

    items.searchItems(query, page, ITEMS_PER_PAGE, (searchItems) => {
      items.getNumSearchItems(query, (itemCount) => {
        let numPages = 0;
        if (itemCount > ITEMS_PER_PAGE) {
          numPages = Math.ceil(itemCount / ITEMS_PER_PAGE);
        }

        res.render('search', {
          queryString: query,
          itemCount,
          pages: numPages,
          page,
          items: searchItems,
        });
      });
    });
  });

  router.get('/item/:itemId', (req, res) => {
    const itemId = parseInt(req.params.itemId, 10);

    items.getItem(itemId, (item) => {
      if (item == null) {
        res.status(404).send('Item not found.');
        return;
      }

      let stars = 0;
      let numReviews = 0;
      let reviews = [];

      if ('reviews' in item) {
        numReviews = item.reviews.length;

        for (let i = 0; i < numReviews; i += 1) {
          const review = item.reviews[i];
          stars += review.stars;
        }

        if (numReviews > 0) {
          stars /= numReviews;
          ({ reviews } = item);
        }
      }

      items.getRelatedItems((relatedItems) => {
        res.render(
          'item',
          {
            userId: USERID,
            item,
            stars,
            reviews,
            numReviews,
            relatedItems,
          },
        );
      });
    });
  });

  router.post('/item/:itemId/reviews', (req, res) => {
    const itemId = parseInt(req.params.itemId, 10);
    const { review, name } = req.body;
    const stars = parseInt(req.body.stars, 10);

    items.addReview(itemId, review, name, stars, () => {
      res.redirect(`/item/${itemId}`);
    });
  });

  /*
     *
     * Since we are not maintaining user sessions in this application, any
     * interactions with the cart will be based on a single cart associated
     * with the the USERID constant we have defined above.
     *
     */
  router.get('/cart', (req, res) => {
    res.redirect(`/user/${USERID}/cart`);
  });


  router.get('/user/:userId/cart', (req, res) => {
    const { userId } = req.params;
    cart.getCart(userId, (userCart) => {
      const total = cartTotal(userCart);
      res.render(
        'cart',
        {
          userId,
          updated: false,
          cart: userCart,
          total,
        },
      );
    });
  });


  router.post('/user/:userId/cart/items/:itemId', (req, res) => {
    const { userId } = req.params;
    const itemId = parseInt(req.params.itemId, 10);

    const renderCart = (userCart) => {
      const total = cartTotal(userCart);
      res.render(
        'cart',
        {
          userId,
          updated: true,
          cart: userCart,
          total,
        },
      );
    };

    cart.itemInCart(userId, itemId, (cartItem) => {
      if (cartItem == null) {
        items.getItem(itemId, (item) => {
          const newItem = Object.assign({ quantity: 1 }, item);
          cart.addItem(userId, newItem, (userCart) => {
            renderCart(userCart);
          });
        });
      } else {
        cart.updateQuantity(userId, itemId, cartItem.quantity + 1, (userCart) => {
          renderCart(userCart);
        });
      }
    });
  });


  router.post('/user/:userId/cart/items/:itemId/quantity', (req, res) => {
    const { userId } = req.params;
    const itemId = parseInt(req.params.itemId, 10);
    const quantity = parseInt(req.body.quantity, 10);

    cart.updateQuantity(userId, itemId, quantity, (userCart) => {
      const total = cartTotal(userCart);
      res.render(
        'cart',
        {
          userId,
          updated: true,
          cart: userCart,
          total,
        },
      );
    });
  });

  // Use the router routes in our application
  app.use('/', router);

  // Start the server listening
  const server = app.listen(3000, () => {
    const { port } = server.address();
    console.log('Mongomart server listening on port %s.', port);
  });
});
