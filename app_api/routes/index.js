var express = require('express');
var router = express.Router();

var jwt = require('express-jwt');
var auth = jwt({
    secret: process.env.JWT_SECRET,
    userProperty: 'payload'
});

var ctrlAuth = require('../controllers/authentication');
var ctrlExtraction = require('../controllers/extraction');

// Extraction
router.get('/extractions', ctrlExtraction.extractionsSearch);
router.post('/extractions', auth, ctrlExtraction.extractionsCreate);
router.get('/extractions/:extractionid', ctrlExtraction.extractionsReadOne);
router.put('/extractions/:extractionid', auth, ctrlExtraction.extractionsUpdateOne);
router.delete('/extractions/:extractionid', auth, ctrlExtraction.extractionsDeleteOne);
router.post('/extractions/searchexec', ctrlExtraction.extractionsSearchOneAndExecute);
router.get('/extractions/:extractionid/execute', ctrlExtraction.extractionsReadOneAndExecute);
router.post('/extractions/creaexec',  auth, ctrlExtraction.extractionsCreateAndExecute);
router.post('/extractions/execute', ctrlExtraction.extractionsExecute);


module.exports = router;
