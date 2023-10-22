var express = require('express');
var router = express.Router();

var path = require('path');
var fs = require("fs");
var { unlink } = require('fs/promises');
var PDFDocument = require('pdfkit');
const multer = require('multer');

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null,'public/images')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname +'-'+Date.now()+'.'+file.mimetype.split('/')[1])
  }
})

let fileFilter = (req, file, callback) => {
  let ext = path.extname(file.originalname);
  if (ext !== '.png' && ext !== '.jpg') {
    return callback(new Error('only jpg and png files are allowed'))
  }
  else {
    return callback(null,true)
  }
}

router.post('/pdf', function (req, res, next) {
  let body = req.body;
  //create a pdf
  let doc = new PDFDocument({ size: 'A4', autoFirstPage: false });
  let pdfName = 'pdf-' + Date.now() + '.pdf';

  //store the pdf in the public/pdf folder
  doc.pipe(fs.createWriteStream(path.join(__dirname, `../public/pdf/${pdfName}`)))
  
  // create the pdf pages and add the images
  for (let name of body) {
    doc.addPage();
    doc.image(path.join(__dirname, `../public/images/${name}`), 20, 20, { width: 555.28, align: 'center', valign: 'center' })
  }
  doc.end();
  //send the address back to the browser
  res.send(`/pdf/${pdfName}`)
})
var upload = multer({ storage, fileFilter: fileFilter })

router.post('/upload', upload.array('images'), function (req, res) {
  let files = req.files;
  let imgNames = [];
  for (i of files) {
    let index = Object.keys(i).findIndex((e) => { return e === 'filename' })
    imgNames.push(Object.values(i)[index]);
  }
  req.session.imagefiles = imgNames
  res.redirect('/')
})
router.get('/new', (req,res,next) => {
  //delete the files stored in the session
  let filenames = req.session.imagefiles;

  let deleteFiles = async (paths) => {
    let deleting = paths.map((file) => unlink(path.join(__dirname, `../public/images/${file}`)))
    await Promise.all(deleting);
  }
  deleteFiles(filenames);
  req.session.imagefiles = undefined
  
  // redirect to the root url
  res.redirect('/');
})

router.get('/', function (req, res, next) {
  if (req.session.imagefiles === undefined) {
    res.sendFile(path.join(__dirname, '..', '/public/html/index.html'));
  }
  else {
    res.render('index',{images:req.session.imagefiles})
  }
});

module.exports = router;
