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
  this.collection = db.collection('item');

  this.getCategories = () => new Promise((resolve, reject) => {
    const categories = [];

    // Retrieve the groups and a count of products in each group
    this.collection.aggregate([
      {
        $group: {
          _id: '$category',
          num: { $sum: 1 },
        },
      },
    ])
      .toArray()
      .then((results) => {
        // Count the total number of products
        const total = results.reduce((accumulator, category) => {
          categories.push(category);
          return accumulator + category.num;
        }, 0);

        // Store the total number of products in an "All" category
        categories.push({ _id: 'All', num: total });

        // Sort the categories
        /* eslint-disable no-underscore-dangle */
        categories.sort((a, b) => {
          if (a._id < b._id) {
            return -1;
          } else if (a._id > b._id) {
            return 1;
          }
          return 0;
        });
        /* eslint-enable */

        resolve(categories);
      })
      .catch((error) => {
        console.error('An error occurred:');
        console.error(error.message);
        reject(error);
      });
  });

  this.getItems = (category, page, itemsPerPage) => new Promise((resolve, reject) => {
    const query = (category === 'All') ? {} : { category };
    const options = {
      limit: itemsPerPage,
      skip: page * itemsPerPage,
      sort: { _id: 1 },
    };

    this.collection.find(query, options)
      .toArray()
      .then(results => resolve(results))
      .catch((error) => {
        console.error(`An error occurred while retrieving page items for ${category}.`);
        console.error(error.message);
        reject(error);
      });
  });

  this.getNumItems = category => new Promise((resolve, reject) => {
    const match = (category === 'All') ? {} : { category };
    this.collection.find(match).count()
      .then(numItems => resolve(numItems))
      .catch(error => reject(error));
  });

  this.searchItems = (query, page, itemsPerPage) => new Promise((resolve, reject) => {
    const options = {
      limit: itemsPerPage,
      skip: page * itemsPerPage,
      sort: { _id: 1 },
    };

    this.collection.findOne({ $text: { $search: query } }, options)
      .then(searchItems => resolve(searchItems))
      .catch((error) => {
        console.error('An error occurred while searching records.');
        console.error(error);
        reject(error);
      });
  });

  this.getNumSearchItems = query => new Promise((resolve, reject) => {
    this.collection.find({ $text: { $search: query } })
      .count()
      .then(numItems => resolve(numItems))
      .catch(error => reject(error));
  });

  this.getItem = itemId => new Promise((resolve, reject) => {
    this.collection.findOne({ _id: itemId })
      .then(item => resolve(item))
      .catch((error) => {
        console.error(`An error occurred when retrieving item ${itemId}`);
        console.error(error);
        reject(error);
      });
  });

  this.getRelatedItems = (callback) => {
    this.collection.find({})
      .limit(4)
      .toArray((err, relatedItems) => {
        assert.equal(null, err);
        callback(relatedItems);
      });
  };

  this.addReview = (itemId, comment, name, stars, callback) => {
    const reviewDoc = {
      name,
      comment,
      stars,
      date: Date.now(),
    };

    this.collection.findOneAndUpdate(
      { _id: itemId },
      { $push: { reviews: reviewDoc } },
      { returnOriginal: false },
    )
      .then(doc => callback(doc));
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
