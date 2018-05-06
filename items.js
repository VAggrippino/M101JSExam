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

function ItemDAO(db) {
  this.db = db;

  this.getCategories = (callback) => {
    const collection = this.db.collection('item');
    const categories = [];

    collection.aggregate([
      {
        $group: {
          _id: '$category',
          num: { $sum: 1 },
        },
      },
    ])
      .toArray()
      .then((results) => {
        const total = results.reduce((accumulator, category) => {
          categories.push(category);
          return accumulator + category.num;
        }, 0);

        categories.push({ _id: 'All', num: total });

        categories.sort((a, b) => {
          /* eslint-disable no-underscore-dangle */
          if (a._id < b._id) {
            return -1;
          } else if (a._id > b._id) {
            return 1;
          }
          /* eslint-enable */
          return 0;
        });

        callback(categories);
      })
      .catch((error) => {
        console.error('An error occurred:');
        console.error(error.message);
      });
  };

  this.getItems = (category, page, itemsPerPage, callback) => {
    const collection = this.db.collection('item');
    let pageItems = [];
    const query = (category === 'All') ? {} : { category };
    const options = {
      limit: itemsPerPage,
      skip: (page > 0) ? (page - 1) * itemsPerPage : 0,
      sort: { _id: 1 },
    };

    collection.find(query, options)
      .toArray()
      .then((results) => {
        pageItems = results;
        callback(pageItems);
      })
      .catch((error) => {
        console.error(`An error occurred while retrieving page items for ${category}.`);
        console.error(error.message);
      });
  };


  this.getNumItems = (category, callback) => {
    const numItems = 0;

    /*
         * TODO: lab1C:
         *
         * LAB #1C: Implement the getNumItems method()
         *
         * Write a query that determines the number of items in a category
         * and pass the count to the callback function. The count is used in
         * the mongomart application for pagination. The category is passed
         * as a parameter to this method.
         *
         * See the route handler for the root path (i.e. "/") for an example
         * of a call to the getNumItems() method.
         *
         */

    // TODO: Include the following line in the appropriate
    // place within your code to pass the count to the callback.
    callback(numItems);
  };


  this.searchItems = (query, page, itemsPerPage, callback) => {
    /*
         * TODO: lab2A
         *
         * LAB #2A: Implement searchItems()
         *
         * Using the value of the query parameter passed to searchItems(),
         * perform a text search against the "item" collection.
         *
         * Sort the results in ascending order based on the _id field.
         *
         * Select only the items that should be displayed for a particular
         * page. For example, on the first page, only the first itemsPerPage
         * matching the query should be displayed.
         *
         * Use limit() and skip() and the method parameters: page and
         * itemsPerPage to select the appropriate matching products. Pass these
         * items to the callback function.
         *
         * searchItems() depends on a text index. Before implementing
         * this method, create a SINGLE text index on title, slogan, and
         * description. You should simply do this in the mongo shell.
         *
         */

    const item = this.createDummyItem();
    const items = [];
    for (let i = 0; i < 5; i += 1) {
      items.push(item);
    }

    // TODO: lab2A Replace all code above (in this method).

    // TODO: Include the following line in the appropriate
    // place within your code to pass the items for the selected page
    // of search results to the callback.
    callback(items);
  };


  this.getNumSearchItems = (query, callback) => {
    const numItems = 0;

    /*
        * TODO: lab2B
        *
        * LAB #2B: Using the value of the query parameter passed to this
        * method, count the number of items in the "item" collection matching
        * a text search. Pass the count to the callback function.
        *
        * getNumSearchItems() depends on the same text index as searchItems().
        * Before implementing this method, ensure that you've already created
        * a SINGLE text index on title, slogan, and description. You should
        * simply do this in the mongo shell.
        */

    callback(numItems);
  };


  this.getItem = (itemId, callback) => {
    /*
         * TODO: lab3
         *
         * LAB #3: Implement the getItem() method.
         *
         * Using the itemId parameter, query the "item" collection by
         * _id and pass the matching item to the callback function.
         *
         */

    const item = this.createDummyItem();

    // TODO: lab3 Replace all code above (in this method).

    // TODO: Include the following line in the appropriate
    // place within your code to pass the matching item
    // to the callback.
    callback(item);
  };


  this.getRelatedItems = (callback) => {
    this.db.collection('item').find({})
      .limit(4)
      .toArray((err, relatedItems) => {
        assert.equal(null, err);
        callback(relatedItems);
      });
  };


  this.addReview = (itemId, comment, name, stars, callback) => {
    /*
         * TODO: lab4
         *
         * LAB #4: Implement addReview().
         *
         * Using the itemId parameter, update the appropriate document in the
         * "item" collection with a new review. Reviews are stored as an
         * array value for the key "reviews". Each review has the fields:
         * "name", "comment", "stars", and "date".
         *
         */

    const reviewDoc = {
      name,
      comment,
      stars,
      date: Date.now(),
    };

    // TODO: replace the following two lines with your code that will
    // update the document with a new review.
    const doc = this.createDummyItem();
    doc.reviews = [reviewDoc];

    // TODO: Include the following line in the appropriate
    // place within your code to pass the updated doc to the
    // callback.
    callback(doc);
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
      reviews: [],
    };

    return item;
  };
}


module.exports.ItemDAO = ItemDAO;
