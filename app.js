const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const client = new Client({
    authStrategy: new LocalAuth(),
});
var bodyParser = require('body-parser');
////////////
//DATABASE//
////////////
const mysql = require('mysql2');
var pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'products',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
pool.getConnection((err, connection) => {
    if (err)
        throw err;
    console.log('Database connected successfully');
    connection.release();
});

function getProductHTML(id, res) {
    return pool.query('SELECT * from products WHERE barcode = ?', [id], (err, rows) => {
        if (err) throw err;
        if (rows[0] == undefined) return res.send('<h1 style="font-size:100px;">Sin registros para ' + id + '</h1>');
        //console.log('Data received from Db:', rows);
        var findata = rows[0];

        fs.readFile(`${__dirname}/public/product_show.html`, 'utf8', function(err, data) {
            var result = findata
            var fhtml = data;
            console.log(result)
            fhtml = fhtml.replace('${name}', result.name);
            fhtml = fhtml.replace('${name}', result.name);
            fhtml = fhtml.replace('${name}', result.name);
            fhtml = fhtml.replace('${price}', result.price);
            fhtml = fhtml.replace('${stock}', result.stock);
            fhtml = fhtml.replace('${source_img}', '/img/' + result.path_image);
            res.send(fhtml)
        });

    });
}

function getProductWhatsapp(id, message) {
    id = id.replace('.ver', '');
    id = id.replace(' ', '');
    console.log(id)
    return pool.query('SELECT * from products WHERE barcode = ?', [id], (err, rows) => {
        if (err) throw err;
        if (rows[0] == undefined) return message.reply('Sin registros.');
        console.log('Data received from Db:', rows);
        var findata = rows[0];
        message.reply(`Nombre: ${findata.name}\nPrecio: ${findata.price}\nStock: ${findata.stock}\nBarcode: ${findata.barcode}`)
        //console.dir(message)
        const media = MessageMedia.fromFilePath(`E:/Proyectos/inventory/data/temp/${findata.path_image}`);
        client.sendMessage(message.from, media);
    });
}

function getProductAPI(id, res) {
    pool.query('SELECT * from products WHERE barcode = ?', [id], (err, rows) => {
        if (err) throw err;
        if (rows[0] == undefined) return res.status(404).send('No hay registros.');
        console.log('Data received from Db:', rows);
        res.jsonp(rows);
    });
}

function addProductAPI(req, res) {
    data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
    var tt = Math.floor(Date.now() / 1000)
    tt = tt + '.png';
    fs.writeFileSync(`${__dirname}/data/temp/${tt}`, data, { encoding: 'base64' }, function(err) {
        console.log(err)
    });
    pool.query("INSERT INTO products (id, name, stock, price, type, barcode, path_image) VALUES (NULL, '" + req.body.name + "', '" + req.body.stock + "', '" + req.body.price + "', '" + req.body.type + "', '" + req.body.barcode + "', '" + tt + "');", (err, rows) => {
        if (err) throw err;
        res.jsonp(rows);
    });
}

function updateProductAPI(req, res) {
    pool.query("UPDATE products SET name = '" + req.body.name + "', stock = '" + req.body.stock + "', price = '" + req.body.price + "', type = '" + req.body.type + "' WHERE products.barcode = " + req.body.barcode + ";", (err, rows) => {
        if (err) throw err;
        res.jsonp(rows);
    });
}

function sellProductAPI(req, res) {
    pool.query('SELECT * from products WHERE barcode = ?', [req.body.barcode], (err, rows) => {
        if (err) throw err;
        if (rows[0] == undefined) return res.status(404).send('No hay registros.');
        if (rows[0].stock == 0) return res.status(404).send('Sin stock.');

        var now_stock = rows[0].stock;
        var new_stock = now_stock - 1;
        var now_sell;

        if (rows[0].sell < 1) {
            now_sell = 0
        } else {
            now_sell = rows[0].sell;
        }
        var new_sell = now_sell + 1;
        pool.query("UPDATE products SET stock = '" + new_stock + "' WHERE products.barcode = " + req.body.barcode + ";", (err, rows) => {
            if (err) throw err;
        });
        pool.query("UPDATE products SET sell = '" + new_sell + "' WHERE products.barcode = " + req.body.barcode + ";", (err, rows) => {
            if (err) throw err;
        })
        res.status(200).send('Datos actualizados.');
    });
}

function create_list(req, res) {
    pool.query("INSERT INTO list_shop (id, name, quantity, barcode) VALUES ('"+req.body.id+"', '" + req.body.name + "', '" + req.body.quantity + "', '" + req.body.barcode + "');", (err, rows) => {
        if (err) throw err;
        console.log(rows)
        res.status(200).send('Datos actualizados.');
    });
}
///////////////
//EXPRESS WEB//
///////////////
const port = 80;
const express = require('express')
const app = express()
app.use(bodyParser.urlencoded({ limit: '500mb' }));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/sell_product.html')
})
app.get('/vendor/:file', (req, res) => {
    res.sendFile(__dirname + '/public/vendor/' + req.params.file)
})

app.get('/agregar', (req, res) => {
    res.sendFile(__dirname + '/public/add_product.html')
})
app.get('/api/:id', (req, res) => {
    if (req.params.id != undefined) {
        getProductAPI(req.params.id, res);
    }
});
app.post('/v1/:type/', (req, res) => {
    switch (req.params.type) {
        case 'add':
            addProductAPI(req, res);
            break;
        case 'update':
            updateProductAPI(req, res);
            break;
        case 'sell':
            sellProductAPI(req, res);
            break;
        case 'create-list':
            create_list(req, res);
            break;
        default:
            res.status(404).send('Ruta de api incorrecta, revisa que este bien escrita.');
    }
});
app.get('/img/:namefile', (req, res) => {
    res.sendFile('E:/Proyectos/inventory/data/temp/' + req.params.namefile)
})
app.get('/product/:id', (req, res) => {
    if (req.params.id != undefined) {
        getProductHTML(req.params.id, res);
    }
});
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});

//////////////
// WHATSAPP //
/////////////

client.initialize();

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', (message) => {
    if (message.body.indexOf('.ver') !== -1) {
        var id = message.body.replace('.ver', '');
        getProductWhatsapp(id, message)
    }
});

client.on('message', async msg => {
    if (msg.hasMedia) {
        const media = await msg.downloadMedia();

        var data = '' + media.data;
        //        fs.writeFileSync('2.txt', data, '');
        data = data.replace(/^data:image\/\w+;base64,/, '');
        var tt = Math.floor(Date.now() / 1000)
        /*fs.writeFileSync(`${__dirname}/data/temp/${tt}.png`, data, { encoding: 'base64' }, function(err) {
            console.log(err)
        });*/
    }
});