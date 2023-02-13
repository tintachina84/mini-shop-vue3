const express = require('express')
const app = express()
const session = require('express-session')
const fs = require('fs')

app.use(session({
    secret: 'secret code',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60
    }
}))

app.use(express.json({
    limit: '50mb'
}))

const server = app.listen(3000, () => {
    console.log('Server is running on port 3000')
})

let sql = require('./sql.js')

fs.watchFile(__dirname + '/sql.js', (curr, prev) => {
    console.log('sql 변경시 재시작 없이 반영되도록 함')
    delete require.cache[require.resolve('./sql.js')]
    sql = require('./sql.js')
})

const db = {
    database: 'dev_class',
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'root',
    port: 3306
}

const dbPool = require('mysql').createPool(db)

app.post('/api/login', async (req, res) => {
    try {
        await req.db('signUp', req.body.param)
        if (req.body.param.length > 0) {
            for (let key in req.body.param[0]) req.session[key] = req.body.param[0][key]
            res.send(req.body.param[0])
        } else {
            res.send({
                error: 'Please try again or contact system manager.'
            })
        }
    } catch (e) {
        res.send({
            error: 'DB access error.'
        })
    }
})

app.post('/api/logout', async (req, res) => {
    req.session.destroy()
    res.send('ok')
})

app.post('/upload/:productId/:type/:fileName', async (req, res) => {
    let {
        productId,
        type,
        fileName
    } = req.params

    const dir = `${__dirname}/uploads/${productId}`
    const file = `${dir}/${fileName}`
    if (!req.body.data) return fs.unlink(file, async (err) => res.send({
        err
    }))
    const data = req.body.data.slice(req.body.data.indexOf(';base64,') + 8)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)
    fs.writeFile(file, data, 'base64', async (error) => {
        await req.db('productImageInsert', [{
            product_id: productId,
            type: type,
            path: fileName
        }])

        if (error) {
            res.send({
                error
            })
        } else {
            res.send('ok')
        }
    })
})

app.get('/download/:productId/:fileName', async (req, res) => {
    const {
        productId,
        type,
        fileName
    } = req.params
    const filepath = `${__dirname}/uploads/${productId}/${fileName}`
    console.log(filepath)
    res.header('Content-Type', `image/${fileName.substring(fileName.lastIndexOf('.'))}`)
    if (!fs.existsSync(filepath)) res.status(404).send({
        error: 'Can not found file'
    })
    else fs.createReadStream(filepath).pipe(res)
})

app.post('/apirole/:alias', async (req, res) => {
    try {
        res.send(await req.db(req.params.alias, req.body.param, req.body.where))
    } catch (err) {
        res.status(500).send({
            error: err
        })
    }
})

const req = {
    async db(alias, param = [], where = '') {
        return new Promise((resolve, reject) => dbPool.query(sql[alias].query + where, param, (error, rows) => {
            if (error) {
                if (error.code != 'ER_DUP_ENTRY') {
                    console.log(error)
                    resolve({
                        error
                    })
                } else resolve(rows)
            }
        }))
    }
}
