const restify = require('restify')
const mongoose = require('mongoose')
const convert = require('color-convert')
const DeltaE = require('delta-e')
const paper = require('paper')
const fs = require('fs')

mongoose.connect('mongodb://localhost/scrape')

var productModel = null;

const pageSize = 10

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

getAverageColor = (req, res, next) => {
    const id = req.params.id
    const point = req.params.point
    const dimensions = req.params.dimensions

    exportJPEG = function(canvas) {
        const out = fs.createWriteStream('image.png')
        const stream = canvas.pngStream()

        stream.on('data', function(chunk) {
            out.write(chunk)
        })

        stream.on('end', function() {
            console.log('end')
        })
        // const img = canvas.toDataURL()
        // // strip off the data: url prefix to get just the base64-encoded bytes
        // const data = img.replace(/^data:image\/\w+;base64,/, "")
        // const buf = new Buffer(data, 'base64')
        // fs.writeFile('image.png', buf) 
    }
    

    onFind = (err, product) => {
        if (err) {
            logger.error(err)
            next()
        }

        const imgPoint = {
            x: Number.parseInt(point.split('-')[0]),
            y: Number.parseInt(point.split('-')[1])
        }
        const imgDim = {
            width: Number.parseInt(dimensions.split('-')[0]),
            height: Number.parseInt(dimensions.split('-')[1])
        }

        const canvas = new paper.Canvas(imgDim.width, imgDim.height)
        paper.setup(canvas)

        const layer = paper.project.activeLayer

        const raster = new paper.Raster({
            source: product.imgHref,
            position: paper.view.center
        })
        raster.onLoad = () => {
            // paper.view.viewSize = new paper.Size(imgDim.width, imgDim.height)
            raster.fitBounds(paper.view.bounds, true)

            // console.log(`x: ${imgPoint.x}, y: ${imgPoint.y}`)
            const color = raster.getAverageColor(new paper.Point(imgPoint.x, imgPoint.y))

            // var c = new paper.Shape.Circle(new paper.Point(imgPoint.x, imgPoint.y), 10)
            // c.strokeColor = 'white'
            // raster.addChild(c)

            // layer.insertChild(0, raster)

            // paper.view.update()

            // exportJPEG(canvas)

            res.send(color.toCSS(true))
            next()
        }

    }

    productModel.findOne({_id: id}).exec(onFind)
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

    server.get('/average/:id/:point/:dimensions', getAverageColor)

    server.listen(8082, function() {
        console.log('%s listening at %s', server.name, server.url);
    });
});


