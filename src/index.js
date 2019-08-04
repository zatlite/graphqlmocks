const { GraphQLServer } = require('graphql-yoga');
const axios = require('axios');
const lo = require('lodash');

const typeDefs = `
type Query {
    data(size: Int = 5): [Data!]!
}

type Data {
    id(from: Int = 1): Int!
    firstName: String!
    middleInitial: String
    lastName: String!
    sample(list: [String]): String
    sampleSize(list: [String], size: Int!): [String]
    sampleInt(list: [Int]): Int
    sampleIntSize(list: [Int], size: Int!): [Int]
    currency(min: Float = 0, max: Float = 9999.99, allowNulls: Boolean = false): Float
    integer(min: Int = 0, max: Int = 9999, allowNulls: Boolean = false): Int
    date(min: String = null, max: String = null): String!
    child(allowNulls: Boolean = false): Data
    children(max: Int!, allowEmpty: Boolean = false): [Data]
    listItem: String!
    allOf(list:[String!]!): [Data]!
    someOf(list:[String!]!, max: Int = 0, allowEmpty: Boolean = false): [Data]!
}
`

const resolvers = {
    Query: {
        data: (_, args) => getObjArray(args.size),
    },
    Data: {
        id: (parent, args) => parent.id + args.from,
        firstName: () => lo.sample(names).name,
        middleInitial: () => randomString(1, 'C'),
        lastName: () => lo.sample(names).surname,
        sample: (_, args) => lo.sample(args.list),
        sampleSize: (_, args) => lo.sampleSize(args.list, args.size),
        sampleInt: (_, args) => lo.sample(args.list),
        sampleIntSize: (_, args) => lo.sampleSize(args.list, args.size),
        currency: (_, args) => args.allowNulls && !randInt(0, 2) ? null: randCurrency(args.min, args.max),
        integer: (_, args) => args.allowNulls && !randInt(0, 2) ? null: randInt(args.min, args.max),
        date: (_, args) => getDateString(args.min, args.max),
        child: (_, args) => args.allowNulls && !randInt(0, 2) ? null: {},
        children: (_, args) => randObjArray(args.max, args.allowEmpty),
        listItem: (parent, args) => parent.listItem,
        allOf: (_, args) => getAllOfObjArray(args.list),
        someOf: (_, args) => getSomeOfObjArray(args.list, args.max, args.allowEmpty),
    }
}

function getDateString(min, max) {
    var minIsDate = Date.parse(min);
    var maxIsDate = Date.parse(max);
    var minDate = new Date(min);
    var maxDate = new Date(max);
    var dayRange = 365*30;
    if (!minIsDate && !maxIsDate) return new Date().toJSON();
    else if (!minIsDate) return maxDate.addDays(- randInt(0, dayRange)).toJSON();
    else if (!maxIsDate) return minDate.addDays(randInt(0, dayRange)).toJSON();
    else return minDate.addDays(randInt(0, datediff(minDate, maxDate))).toJSON();
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

function datediff(first, second) {
    // Take the difference between the dates and divide by milliseconds per day.
    // Round to nearest whole number to deal with DST.
    return Math.round((second-first)/(1000*60*60*24));
}

/**
 * RANDOM STRING GENERATOR
 *
 * Info:      http://stackoverflow.com/a/27872144/383904
 * Use:       randomString(length [,"A"] [,"N"] );
 * Default:   return a random alpha-numeric string
 * Arguments: If you use the optional "A", "N" flags:
 *            "A" (Alpha flag)   return random a-Z string
 *            "C" (A-Z flag)   return random A-Z string
 *            "N" (Numeric flag) return random 0-9 string
 */
function randomString(len, an){
    an = an&&an.toLowerCase();
    var str="", i=0, 
    min=an=="n"?0:10, 
    max=an=="n"?10:an=="c"?36:62;
    
    for(;i++<len;){
      var r = Math.random()*(max-min)+min <<0;
      str += String.fromCharCode(r+=r>9?r<36?55:61:48);
    }
    return str;
}

function getSomeOfObjArray(list, max, allowEmpty) {
    if (allowEmpty && Math.random() > .5)
    {
        return [];
    }
    var size = max <= 0 ? list.length : max;
    return getAllOfObjArray(lo.sampleSize(list, randInt(1, size)));
}

function getAllOfObjArray(list) {
    return list.map((x, i) => { return { id: i, listItem: x } } );
}

function getObjArray(size) {
    return (new Array(size)).fill({}).map((x, i) => { return { id: i } } );
}

function randObjArray(max, allowEmpty) {
  var min = allowEmpty ? 0 : 1
  var size = randInt(min, max)
  return size === 0 ? [] : getObjArray(size)
}

function randInt(min, max) {
  return Math.floor(min + Math.random()*(max + 1 - min))
}

function randCurrency(min, max) {
  return (min + Math.random()*(max + 1 - min)).toFixed(2)
}

const server = new GraphQLServer({
    typeDefs,
    resolvers,
})

var names = [];

axios.all([
    axios.get('https://uinames.com/api/?amount=50&region=australia'),
    axios.get('https://uinames.com/api/?amount=50&region=germany'),
])
.then(axios.spread((aus, ger) => {
    names = [...aus.data, ...ger.data];
    server.start(() => console.log('Server is running on http://localhost:4000'));
}))
.catch(() => {
    names = [{name: 'John', surname: 'Citizen'}, {name: 'Alan', surname: 'Turing'}];
    server.start(() => console.log('Server is running on http://localhost:4000'));
});

