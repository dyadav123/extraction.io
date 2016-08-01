// Declare depencencies
var mongoose = require('mongoose');
var ftp = require('ftp');
var mysql = require("mysql");
var config = require('config');
var redis = require('redis');
var kafka = require('kafka-node');
var fs = require('fs');
var lineReader = require('line-reader');
var path = require( 'path' );
var processor = require( "process" );
var request = require('request');
var Client = require('node-rest-client').Client;

// Declare Model (Classes)
var Transaction = mongoose.model('transaction');
var TransactionEnrichment = mongoose.model('transaction');
var TransactionRows = mongoose.model('transactionRows');
var TransactionRowData = mongoose.model('transactionRowData');
var Extraction = mongoose.model('extraction');


// Create JsonResponse
var sendJSONresponse = function(res, status, content) {
  res.status(status);
  res.json(content);
};

/* GET list of extractions */
module.exports.extractionsSearch = function(req, res) {
  var query = {};

  for (var key in req.query) {
    query[key] = req.query[key];
  };

  Extraction
    .find(query)
    .exec(function(err, extractions) {
        sendJSONresponse(res, 200, extractions);
    });
};

/* GET a extraction by the id */
module.exports.extractionsReadOne = function(req, res) {
  console.log('Finding extraction details', req.params);
  if (req.params && req.params.extractionid) {
    Extraction
      .findById(req.params.extractionid)
      .exec(function(err, extraction) {
        if (!extraction) {
          sendJSONresponse(res, 404, {
            "message": "extractionid not found"
          });
          return;
        } else if (err) {
          console.log(err);
          sendJSONresponse(res, 404, err);
          return;
        }
        sendJSONresponse(res, 200, extraction);
      });
  } else {
    console.log('No extractionid specified');
    sendJSONresponse(res, 404, {
      "message": "No extractionid in request"
    });
  }
};

/* POST a new extraction */
/* /api/extractions */
module.exports.extractionsCreate = function(req, res) {
  Extraction.create(
    req.body,
    function(err, extraction) {
      if (err) {
        console.log(err);
        sendJSONresponse(res, 400, err);
      }
      else
      {
        console.log(extraction);
        sendJSONresponse(res, 201, extraction);
      }
    }
  );
};

/* PUT /api/extractions/:extractionid */
module.exports.extractionsUpdateOne = function(req, res) {
  if (!req.params.extractionid) {
    sendJSONresponse(res, 404, {
      "message": "Not found, extractionid is required"
    });
    return;
  }
  Extraction
    .findById(req.params.extractionid)
    .exec(
      function(err, extraction)
      {
        if (!extraction)
        {
          sendJSONresponse(res, 404, {
            "message": "extractionid not found"
          });
          return;
        }
        else if (err)
        {
          sendJSONresponse(res, 400, err);
          return;
        }

        extraction = req.body;

        extraction.save(function(err, extraction) {
          if (err) {
            sendJSONresponse(res, 404, err);
          } else {
            sendJSONresponse(res, 200, extraction);
          }
        });
      }
    );
};

/* DELETE /api/extractions/:extractionid */
module.exports.extractionsDeleteOne = function(req, res) {
  var extractionid = req.params.extractionid;
  if (extractionid) {
    Extraction
      .findByIdAndRemove(extractionid)
      .exec(
        function(err, extraction) {
          if (err) {
            console.log(err);
            sendJSONresponse(res, 404, err);
            return;
          }
          console.log("extraction id " + extractionid + " deleted");
          sendJSONresponse(res, 204, null);
        }
    );
  } else {
    sendJSONresponse(res, 404, {
      "message": "No extractionid"
    });
  }
};

/* POST a new extraction */
/* /api/extractions/searchexec */
module.exports.extractionsSearchOneAndExecute = function(req, res)
{
  var extraction = req.body;

  var query = {};
  query['contractPartner.partner.type'] = extraction.contractPartner.partner.type.toLowerCase();
  query['contractPartner.partner.code'] = extraction.contractPartner.partner.code.toLowerCase();
  query['contractPartner.client.code'] = extraction.contractPartner.client.code.toLowerCase();
  query['contractPartner.client.name'] = extraction.contractPartner.client.name.toLowerCase();
  query['version.major'] = extraction.version.major;
  query['version.minor'] = extraction.version.minor;

  // connectDb(req.query.partner.code);

  Extraction
    .find(query)
    .exec(function(err, extractions)
    {
      var id = extractions.length - 1;
      execute(extractions[id], function (response) {
        extractions[id] = response;
        //console.log(clearing);
        sendJSONresponse(res, 201, extractions[id]);
      });
    });
    //console.log(extraction);
};

/* GET a extraction by the id then execute it and return to client*/
module.exports.extractionsReadOneAndExecute = function(req, res) {
    console.log('Finding extraction details', req.params);
    if (req.params && req.params.extractionid) {
        Extraction
            .findById(req.params.extractionid)
            .exec(function(err, extraction) {
                if (!extraction) {
                    sendJSONresponse(res, 404, {
                        "message": "extractionid not found"
                    });
                    return;
                } else if (err) {
                    console.log(err);
                    sendJSONresponse(res, 404, err);
                    return;
                }

                execute(extraction, function (response) {
                  extraction = response;
                  //console.log(clearing);
                  sendJSONresponse(res, 201, extraction);
                });
            });
    } else {
        console.log('No extractionid specified');
        sendJSONresponse(res, 404, {
            "message": "No extractionid in request"
        });
    }
};

/* POST a new extraction */
/* /api/extractions/creaexec */
module.exports.extractionsCreateAndExecute = function(req, res) {
  Extraction.create(
    req.body,
    function(err, extraction) {
      if (err) {
        console.log(err);
        sendJSONresponse(res, 400, err);
      }
      else
      {
        execute(extraction, function (response) {
          extraction = response;
          //console.log(clearing);
          sendJSONresponse(res, 201, extraction);
        });
      }
    }
  );
};

/* POST a new extraction */
/* /api/extractions/execute */
var response1;
module.exports.extractionsExecute = function(req, res)
{
  var extraction = req.body;
  response1 = res;
  execute(extraction);
  // execute(extraction, function (response) {
  //   extraction = response;
  //   console.log(extraction);
  //   //console.log(clearing);
  //   sendJSONresponse(res, 201, extraction);
  // });
};

var execute = function(extraction)
{
      fs.readdir(extraction.dataSource.host, function(err, files) {
        if(err) {
          console.error("Could not list the directory.", err);
          processor.exit(1);
        }

        files.forEach(function(file, index)
        {
          // declare local variables
          var extractColumnInfo = false;
          var colArray = [];

          // extract partnerType and partnerCode from the file name
          var splits = file.split('_');
          var partnerType = splits[3];
          var partnerCode = splits[4];

          console.log("Processing file " + file + " in folder " + extraction.dataSource.host);

          var transactionNumber = 1;
          lineReader.eachLine(extraction.dataSource.host + '/' + file, extraction.dataSource.csvOptions, function(line, last)
          {

            // for testing only
            if(transactionNumber > 1)
                return;

            // extract column info from the file
            if (!extractColumnInfo)
            {
              var columns = line.split(extraction.dataSource.delimiter);
              columns.forEach(function(column)
              {
                colArray.push(column);
              });

              extractColumnInfo = true;
            }
            else
            {

              var transaction = new Transaction();
              var transactionRow = new TransactionRows();

              transaction.partner_type = partnerType;
              transaction.partner_code = partnerCode;
              transactionRow.rowKey = transactionNumber;
              transactionRow.rowData = [];

              // extract data rows from the file
              var dataInfo = line.split(extraction.dataSource.delimiter);
            //  console.log(dataInfo);
              var index = 0;
              dataInfo.forEach(function(value)
              {
                var transactionRowData = new TransactionRowData();
                transactionRowData.partnerField = colArray[index];
                transactionRowData.value = value;
                transactionRow.rowData.push(transactionRowData);
                index++;
              });

              transaction.rows = transactionRow;
              transaction.createdOn = new Date();
              transaction.client = extraction.contractPartner.client.code;
              transaction.majVer = extraction.contractPartner.version.major;
              transaction.minVer = extraction.contractPartner.version.minor;

              sendJSONresponse(response1, 201, transaction);
              transactionNumber++;
            }
          });
        });
      });
}

var callFilter = function(newTransaction, callback)
{
  var filterConfig = config.get('filterConfig');
  commonPost(filterConfig.uri + '/execute', newTransaction, null, function(res)
  {
    callback(res);
  });
}

var callMapping = function(newTransaction, callback)
{
  var mappingConfig = config.get('mappingConfig');
  commonPost(mappingConfig.uri + '/execute', newTransaction, null, function(res)
  {
    callback(res);
  });
}

var commonPost = function(endpoint, body, token, callback)
{
  var client = new Client();
  var args = {
      data: body,
      headers: { "Content-Type": "application/json" }
  };

  if (token != null)
    args.headers.Authorization = "Bearer " + token;

  client.post(endpoint, args, function (data, response) {
      callback(data);
  });
}

var commonGet = function(endpoint, token, callback)
{
  var client = new Client();

  // set content-type header and data as json in args parameter
  var args = {
      headers: { "Content-Type": "application/json" }
  };

  if (token != null)
    args.headers.Authorization = "Bearer " + token;

  client.get(endpoint, args, function (data, response) {
      callback(data);
  });
}
