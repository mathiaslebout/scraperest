const restify = require('restify')
const mongoose = require('mongoose')
const convert = require('color-convert')
const DeltaE = require('delta-e')
const paper = require('paper')
const fs = require('fs')
const Vibrant = require('node-vibrant')
const ColorThief = require('./color-thief')

mongoose.connect('mongodb://localhost/scrape')

var productModel = null;

const pageSize = 10

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

exportJPEG = function(canvas, filename, callback) {
    const out = fs.createWriteStream(`${filename}.png`)
    const stream = canvas.pngStream()

    stream.on('data', function(chunk) {
        out.write(chunk)
    })

    stream.on('end', function() {
        // logger.debug('end')

        // const colorThief = new ColorThief()
        // const color = colorThief.getColor(`${filename}.png`) 

        callback(null, color)

        // Vibrant.from(`${filename}.png`).getPalette((err, palette) => {
        //     if (err) {
        //         // logger.error(err)
        //         return callback(err)
        //     }
        //     // logger.debug(palette)
        //     callback(null, palette)
        // })        
    })
    // const img = canvas.toDataURL()
    // // strip off the data: url prefix to get just the base64-encoded bytes
    // const data = img.replace(/^data:image\/\w+;base64,/, "")
    // const buf = new Buffer(data, 'base64')
    // fs.writeFile('image.png', buf) 
}

border = (req, res, next) => {
    const id = req.params.id

    onFind = (err, product) => {
        if (err) {
            logger.error(err)
            next()
        }

        const canvas = new paper.Canvas(1000, 1000)
        paper.setup(canvas)

        const raster = new paper.Raster({
            source: product.imgHref,
            // position: paper.view.center
        })
        raster.onLoad = () => {
            canvas.width = raster.width
            canvas.height = raster.height

            paper.view.viewSize = new paper.Size(raster.width, raster.height)

            raster.fitBounds(paper.view.size)

            raster.visible = false

            let w = 0
            let z = 0
            for (let x = 0; x < raster.width; x++) {
                for (let y = 0; y < raster.height; y ++) {
                    if ((x >= 10 && x <= (raster.width - 10))
                        && (y >= 10 && y <= (raster.height - 10))) {
                        
                        // const rect = paper.Path.Rectangle(x, y, 1, 1)
                        // rect.fillColor = new paper.Color(255, 255, 255)                        
                    } else {
                        const color = raster.getPixel(x, y)
                        const rect = paper.Path.Rectangle(w, z, 1, 1)
                        rect.fillColor = color

                        if (w == raster.width) {
                            w = 0
                            z ++
                        } else {
                            w ++
                        }
                    }
                }
            }

            paper.view.viewSize = new paper.Size(w, z)

            paper.view.update()

            const colorThief = new ColorThief()
            const dominantColors = colorThief.getDominantColors(raster)

            // exportJPEG(canvas, id, () => {})

            res.send(dominantColors) 
            next()

            // exportJPEG(canvas, id, (err, palette) => {
            //     res.send(err ? err : palette)
            //     next()

            // })

        }
    }

    productModel.findOne({_id: id}).exec(onFind)
}

getAverageColor = (req, res, next) => {
    const id = req.params.id
    const point = req.params.point
    const dimensions = req.params.dimensions

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
        if (err) {
            res.send([])
            next()
            return
        }

        const filteredProducts = products.filter((product) => {
            let res = false
            for (swatch in product.palette) {
                if (product.palette[swatch]) {
                    const pColor = product.palette[swatch].substring(1)
                    const pLabColor = convert.hex.lab(pColor)
                    
                    const dE = DeltaE.getDeltaE76({L: labColor[0], A: labColor[1], B: labColor[2]}, {L: pLabColor[0], A: pLabColor[1], B: pLabColor[2]})
                    console.log(`DeltaE between ${labColor} and ${pLabColor} : ${dE}`)

                    if (dE < 10) {
                        res = true
                        break
                    }
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
    server.get('/store/size/:size', getBySize);

    server.post('/user', createUser)
    server.get('/user/:id', getUser)

    // get a page of products (page size is 10 products)
    server.get('/store/:page', getStore);

    // get the list of products by prominent color 
    // color: the hexadecimal color identifier (with no # character)
    server.get('/store/color/:color', getByColor)

    // get the average color given a single point
    // id: the database identifier of the product 
    // point: the x,y coordinates of the point in the image coordinates system (format "x-y")
    // dimensions: the width and height of the image (format "width-height")
    server.get('/average/:id/:point/:dimensions', getAverageColor)

    server.get('/border/:id', border)

    server.listen(8082, function() {
        console.log('%s listening at %s', server.name, server.url);
    });
});


