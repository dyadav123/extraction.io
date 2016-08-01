var mongoose = require('mongoose');

var csvOptionsSchema =  new mongoose.Schema({
  delimiter: String,
  newline: String,
  quote: String,
  empty: String,
  objectMode: Boolean,
  columns: Boolean
});

var dataSourceSchema = new mongoose.Schema({
  name: String,
  adapter: String,
  _type: String,
  host: String,
  user: String,
  password: String,
  database: String,
  port: Number,
  _get: String,
  _set: String,
  key: [String],
  tkey:[[String]],
  csvOptions: csvOptionsSchema
});

var versionSchema = new mongoose.Schema(
  {
    major: {type: Number, required: true},
    minor: {type: Number, required: true}
  },
  { 'strict': false }
);

var partnerSchema = new mongoose.Schema(
  {
    code: {type: String, required: true},
    type: {type: String, required: true}
  },
  { 'strict': false }
);

var clientSchema = new mongoose.Schema(
  {
    code: String,
    name: String
  },
  { 'strict': false }
);

var patternSchema = new mongoose.Schema(
  {
    pattern: String,
    type:
    {
      type: String,
      enum : ['String', 'Number', 'Currency', 'Double', 'Date', 'Boolean'],
      default : 'String'
    }
  },
  { 'strict': false }
);

var contractPartnerSchema = new mongoose.Schema(
  {
    version: versionSchema,
    created_on: {type: Date, 'default': Date.now},
    client: clientSchema,
    partner: [partnerSchema]
  },
  { 'strict': false }
);

var extractionSchema = new mongoose.Schema(
  {
    name: String,
    createdOn: {type: Date, "default": Date.now},
    version: versionSchema,
    dataSource : dataSourceSchema,
    contractPartner: contractPartnerSchema,
    patterns: [patternSchema]
  },
  { 'strict': false }
);

mongoose.model('extraction', extractionSchema);
