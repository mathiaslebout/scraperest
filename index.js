const restify = require('restify')
const mongoose = require('mongoose')
const convert = require('color-convert')
const DeltaE = require('delta-e')

mongoose.connect('mongodb://localhost/scrape')

var productModel = null;

const pageSize = 10

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

var getStore = function(req, res, next) {
    const page = req.params.page ? Number.parseInt(req.params.page) : 0;
    var onFind = function(err, products) {
        // res.send('found ' + products.length + ' products');
        res.send(products);
        next();
    };
    // productModel.find({palette:{$exists: true}}).skip(page * pageSize).limit(pageSize).exec(onFind);
    productModel.find().skip(page * pageSize).limit(pageSize).exec(onFind);
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

getByColor = (req, res, next) => {
    const color = req.params.color

    const labColor = convert.hex.lab(color)

    const onFind = (err, products) => {
        
        const filteredProducts = products.filter((product) => {
            let res = false
            for (swatch in product.palette) {
                const pColor = product.palette[swatch].substring(1)
                const pLabColor = convert.hex.lab(pColor)
                
                const dE = DeltaE.getDeltaE76({L: labColor[0], A: labColor[1], B: labColor[2]}, {L: pLabColor[0], A: pLabColor[1], B: pLabColor[2]})
                console.log(`DeltaE between ${labColor} and ${pLabColor} : ${dE}`)

                if (dE < 10) {
                    res = true
                    break
                }
            }

            return res
        })

        res.send(filteredProducts)
        next()
    }

    productModel.find({palette: {$exists: true}}).exec(onFind)
    // productModel.find({$where: function(color) { 
    //     if (!this.palette) return false
    //     return this.palette.darkMuted == color
    // } }).exec(onFind)
}

const createUser = (req, res, next) => {

    req.on('data', function(data) {

    })

    req.on('end', function() {

    })

    res.send(201)
    next()
}

const getUser = (req, res, next) => {
    const id = req.params.id

    const onFind = (err, user) => {
        res.send(user)
        next()
    }

    userModel.find({id: id}).exec(onFind)
}

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    const productSchema = mongoose.Schema({
        id: String,
        description: String,
        category: String,
        href: String,
        imgHref: String,
        price: Number,
        sizes: Array,
        colors: Array,
        shop: String,
        palette: Object,
    });  

    const userSchema = mongoose.Schema({
        type: String,
        id: String,
        name: String,
        lastAccess: Number,
        likes: Array,
    })  

    productModel = mongoose.model('Product', productSchema);
    userModel = mongoose.model('User', userSchema);

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

    server.get('/store', getStore);
    server.get('/store/:page', getStore);
    server.get('/store/size/:size', getBySize);

    server.post('/user', createUser)
    server.get('/user/:id', getUser)

    server.get('/store/color/:color', getByColor)

    server.listen(8082, function() {
        console.log('%s listening at %s', server.name, server.url);
    });
});


