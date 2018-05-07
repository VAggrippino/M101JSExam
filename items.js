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

  this.getCategories = (callback) => {
    const categories = [];

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
    const query = (category === 'All') ? {} : { category };
    const options = {
      limit: itemsPerPage,
      skip: page * itemsPerPage,
      sort: { _id: 1 },
    };

    this.collection.find(query, options)
      .toArray()
      .then(results => callback(results))
      .catch((error) => {
        console.error(`An error occurred while retrieving page items for ${category}.`);
        console.error(error.message);
      });
  };

  this.getNumItems = async (category, callback) => {
    const match = (category === 'All') ? {} : { category };
    const numItems = await this.collection.find(match).count();
    return callback(numItems);
  };

  this.searchItems = (query, page, itemsPerPage, callback) => {
    const options = {
      limit: itemsPerPage,
      skip: page * itemsPerPage,
      sort: { _id: 1 },
    };

    this.collection.findOne({ $text: { $search: query } }, options)
      .then(results => callback(results))
      .catch((error) => {
        console.error('An error occurred while searching records.');
        console.error(error.message);
      });
  };

  this.getNumSearchItems = async (query, callback) => {
    const numItems = await this.collection.find({ $text: { $search: query } }).count();
    return callback(numItems);
  };

  this.getItem = async (itemId, callback) => {
    this.collection.findOne({ _id: itemId })
      .then(results => callback(results))
      .catch((error) => {
        console.error(`An error occurred when retrieving item ${itemId}`);
        console.error(error);
      });
  };

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
