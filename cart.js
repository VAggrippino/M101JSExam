/*
  Copyright (c) 2008 - 2016 MongoDB, Inc. <http://mongodb.com>

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const assert = require('assert');

function CartDAO(db) {
  this.collection = db.collection('cart');

  this.getCart = (userId, callback) => {
    const options = { projection: { userId: 1, items: 1, _id: 0 } };
    this.collection.findOne({ userId }, options)
      .then(userCart => callback(userCart))
      .catch((error) => {
        console.error("An error occurred while retrieving users's cart data.");
        console.error(error);
      });
  };

  this.itemInCart = (userId, itemId, callback) => {
    this.collection.findOne({ userId, 'items._id': itemId })
      .then((cart) => {
        if (cart === null) {
          callback(null);
        } else {
          // eslint-disable-next-line no-underscore-dangle
          const item = cart.items.filter(cartItem => cartItem._id === itemId)[0];
          callback(item);
        }
      })
      .catch((error) => {
        console.error('An error occurred while checking cart item');
        console.error(error);
      });
  };

  /*
     * This solution is provide as an example to you of several query
     * language features that are valuable in update operations.
     * This method adds the item document passed in the item parameter to the
     * user's cart. Note that this solution works regardless of whether the
     * cart already contains items or is empty. addItem will be called only
     * if the cart does not already contain the item. The route handler:
     * router.post("/user/:userId/cart/items/:itemId"...
     * handles this. Please review how that method works to have a complete
     * understanding of how addItem is used.
     *
     * NOTE: One may use either updateOne() or findOneAndUpdate() to
     * write this method. We did not discuss findOneAndUpdate() in class,
     * but it provides a very straightforward way of solving this problem.
     * See the following for documentation:
     * http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#findOneAndUpdate
     *
     */
  this.addItem = (userId, item, callback) => {
    // Will update the first document found matching the query document.
    this.collection.findOneAndUpdate(
      // query for the cart with the userId passed as a parameter.
      { userId },
      // update the user's cart by pushing an item onto the items array
      { $push: { items: item } },
      // findOneAndUpdate() takes an options document as a parameter.
      // Here we are specifying that the database should insert a cart
      // if one doesn't already exist (i.e. "upsert: true") and that
      // findOneAndUpdate() should pass the updated document to the
      // callback function rather than the original document
      // (i.e., "returnOriginal: false").
      {
        upsert: true,
        returnOriginal: false,
      },
      // Because we specified "returnOriginal: false", this callback
      // will be passed the updated document as the value of result.
      (err, result) => {
        assert.equal(null, err);
        // To get the actual document updated we need to access the
        // value field of the result.
        callback(result.value);
      },
    );

    /*

          Without all the comments this code looks written as follows.

        this.db.collection("cart").findOneAndUpdate(
            {userId: userId},
            {"$push": {items: item}},
            {
                upsert: true,
                returnOriginal: false
            },
            function(err, result) {
                assert.equal(null, err);
                callback(result.value);
            });
        */
  };


  this.updateQuantity = (userId, itemId, quantity, callback) => {
    const filter = { userId, 'items._id': itemId };

    let update;
    if (quantity > 0) {
      update = { $set: { 'items.$.quantity': quantity } };
    } else {
      update = { $pull: { items: { _id: itemId } } };
    }

    const options = { returnOriginal: false };

    this.collection.findOneAndUpdate(filter, update, options)
      .then(cart => callback({ userId, items: cart.value.items }))
      .catch((error) => {
        console.error('An error occurred while updating the cart:');
        console.error(error);
      });
  };

  this.createDummyItem = () => {
    const item = {
      _id: 1,
      title: 'Gray Hooded Sweatshirt',
      description: 'The top hooded sweatshirt we offer',
      slogan: 'Made of 100% cotton',
      stars: 0,
      category: 'Apparel',
      img_url: '/img/products/hoodie.jpg',
      price: 29.99,
      quantity: 1,
      reviews: [],
    };

    return item;
  };
}


module.exports.CartDAO = CartDAO;
