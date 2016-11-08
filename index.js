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
    // productModel.find({}).select({description:1, price:1, sizes:1, colors: 1, category: 1, href: 1}).exec(onFind);
    productModel.find({}).exec(onFind);
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
        category: String,
        href: String,
        imgHref: String,
        price: Number,
        sizes: Array,
        colors: Array,
        shop: String
    });    

    productModel = mongoose.model('Product', productSchema);

    var server = restify.createServer();

    server.use(
        function crossOrigin(req,res,next){
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "X-Requested-With");
            return next();
        }
    );

    server.get('/hello/:name', respond);
    server.head('/hello/:name', respond);

    server.get('/store/', getStore);
    server.get('/store/size/:size', getBySize);

    server.listen(8082, function() {
        console.log('%s listening at %s', server.name, server.url);
    });
});


