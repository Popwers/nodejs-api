const util = require('util')

module.exports = (db, dbTable) => {
    const query = util.promisify(db.query).bind(db)
    const get = async (fields = "*", callback = false, table = dbTable) => {
        let res = null
        let results = []

        try {
            results = await query(`SELECT ${fields} FROM ${table}`)
        } catch (err) {
            await db.rollback()
            res = { "statut": false, "error": err, "results": null }
        } finally {
            res = { "statut": true, "error": false, "results": results }
        }

        if (callback && typeof callback == "function") {
            callback(res)
        }
        return res
    }

    const post = async (fields, callback = false, table = dbTable) => {
        let res = null
        let results = []

        try {
            results = await query(`INSERT INTO ${table} SET ?`, fields)
        } catch (err) {
            await db.rollback()
            res = { "statut": false, "error": err, "results": null }
        } finally {
            res = { "statut": true, "error": false, "results": results }
        }

        if (callback && typeof callback == "function") {
            callback(res)
        }
        return res
    }

    const searchEntry = async (searchValue, fields = "*", callback = false, searchKey = "id", table = dbTable) => {
        let res = null
        let results = []

        try {
            results = await query(`SELECT ${fields} FROM ${table} WHERE \`${searchKey}\` = "${searchValue}"`)
        } catch (err) {
            await db.rollback()
            res = { "statut": false, "error": err, "results": null }
        } finally {
            res = { "statut": true, "error": false, "results": results }
        }

        if (callback && typeof callback == "function") {
            callback(res)
        }
        return res
    }

    const putEntry = async (searchValue, fields, callback = false, searchKey = "id", table = dbTable) => {
        let res = null
        let results = []

        try {
            results = await query(`UPDATE ${table} SET ? WHERE \`${searchKey}\` = "${searchValue}"`, fields)
        } catch (err) {
            await db.rollback()
            res = { "statut": false, "error": err, "results": null }
        } finally {
            res = { "statut": true, "error": false, "results": results }
        }

        if (callback && typeof callback == "function") {
            callback(res)
        }
        return res
    }

    const deleteEntry = async (searchValue, callback = false, searchKey = "id", table = dbTable) => {
        let res = null
        let results = []

        try {
            results = await query(`DELETE FROM ${table} WHERE \`${searchKey}\` = "${searchValue}"`)
        } catch (err) {
            await db.rollback()
            res = { "statut": false, "error": err, "results": null }
        } finally {
            res = { "statut": true, "error": false, "results": results }
        }

        if (callback && typeof callback == "function") {
            callback(res)
        }
        return res
    }

    return { get, searchEntry, post, putEntry, deleteEntry }
}