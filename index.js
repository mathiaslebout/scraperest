var restify = require('restify');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/scrape');

var productModel = null;


function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}


var getStore = function(req, res, next) {
    var onFind = function(err, products) {
        // res.send('found ' + products.length + ' products');
        res.send(products);
        next();
    };
    productModel.find({}).select({description:1, price:1, sizes:1}).exec(onFind);
}

var getBySize = function(req, res, next) {
    var sizes = req.params.size.split('-');
    var onFind = function(err, products) {
        // res.send('found ' + products.length + ' products');
        res.send(products);
        next();
    };

    productModel.find({sizes: { $in: sizes}}).select({description: 1, price: 1, sizes: 1}).exec(onFind);
};

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    var productSchema = mongoose.Schema({
        id: String,
        description: String,
        price: Number,
        sizes: Array
    });    

    productModel = mongoose.model('Product', productSchema);

    var server = restify.createServer();
    server.get('/hello/:name', respond);
    server.head('/hello/:name', respond);

    server.get('/store/', getStore);
    server.get('/store/size/:size', getBySize);

    server.listen(8081, function() {
        console.log('%s listening at %s', server.name, server.url);
    });
});


