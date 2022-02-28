/**
 * Contains the InventoryController for anything related to the inventory
 */

import { FastifyReply, FastifyRequest } from "fastify"
import { stringify } from "csv-stringify/sync"

import DeletionModel, { ICreateDeletion } from "../models/DeletionModel.js"
import ItemModel, { ICreateItem, ILikeItem, IUpdateItem } from "../models/ItemModel.js"
import { FieldError } from "../errors.js"


export interface IAccessItemParameters {
    item_id: number
}

/**
 * Anything about the Inventory is controlled here
 */
export default class InventoryController {
    invModel: ItemModel
    deletionModel: DeletionModel


    constructor(model: ItemModel = new ItemModel(),
            deletionModel: DeletionModel = new DeletionModel()) {
        this.invModel = model
        this.deletionModel = deletionModel
    }
    

    /**
     * Reads the complete inventory and sends all its fields as a
     * json array.
     *
     * @param req the request from Fastify
     * @param rep the reply from Fastify
     */
    async getInventory(req: FastifyRequest, rep: FastifyReply) {
        req.log.info(`${req.hostname} requested all inventory entries`)

        const results = await this.invModel.getAllItems()
        req.log.info(`${req.hostname} requested all entries`)

        rep.send(results)
    }


    /**
     * Reads one item specified from the id in the request parameters (url)
     * from the inventory and sends it as a json object
     *
     * @param req the request from Fastify
     * @param rep the reply from Fastify
     */
    async getInventoryItem(req: FastifyRequest<{
        Params: IAccessItemParameters
      }>, rep: FastifyReply) {
        req.log.info(`${req.hostname} requested inventory entry with `
            + `id ${req.params.item_id}`)

        const item = await this.invModel.getItem(req.params.item_id)
        if (item) {
            req.log.info(`Retrieved inventory entry id ${req.params.item_id} for `
                + `${req.hostname}`)

            rep.send(item)
        } else {
            req.log.info(`${req.hostname} requested unavailable inventory `
                + `entry id ${req.params.item_id}`)

            throw new FieldError(`The request inventory entry with id ${req.params.item_id} `
                    + `is unavailable`)
        }
    }

    /**
     * Reads all delete entries from the inventory and sends all their fields as a
     * json array
     *
     * @param req the request from Fastify
     * @param rep the reply from Fastify
     */
    async getDeletedInventory(req: FastifyRequest, rep: FastifyReply) {
        req.log.info(`${req.hostname} requested all deleted inventory entries`)

        const results = await this.invModel.getAllDeletedItems()
        req.log.info(`Retrieved all deleted inventory entries for `
            + `${req.hostname}`)

        rep.send(results)
    }

    /**
     * Creates a new inventory item from the fields specified in the
     * request body.
     *
     * @param req the request from Fastify
     * @param res the reply from Fastify
     */
    async postNewInventoryItem(req: FastifyRequest<{Body: ICreateItem}>, res: FastifyReply) {
        req.log.info(`${req.hostname} requested to create entry `
                + `in inventory`)

        const insertId = await this.invModel.createItem(req.body)
        req.log.info(`${req.hostname} created entry with `
            + `id ${insertId} in inventory`)

        res.status(201).send({
            name: req.body.name,
            count: req.body.count,
            id: insertId
        })
    }

    /**
     * Updates an inventory item according to the fields in the request body
     *
     * @param req the request from Fastify
     * @param rep the reply from Fastify
     */
    async updateInventoryItem(req: FastifyRequest<{Params: IAccessItemParameters,
            Body: IUpdateItem}>,
            rep: FastifyReply) {
        req.log.info(`${req.hostname} requested to update entry `
                + `${req.params.item_id} in inventory`)

        const wasUpdated = await this.invModel.updateItem(req.body, req.params.item_id)
        if (wasUpdated) {
            req.log.info(`${req.hostname} updated entry with `
                + `id ${req.params.item_id}`)

            rep.send()
        } else {
            req.log.info(`${req.hostname} tried to update non-existent `
                + `entry with id ${req.params.item_id} in inventory`)

            throw new FieldError("The entry with the specified id is not "
                    + "in the inventory")
        }
    }

    /**
     * Restores a delete inventory item that has the id specified in the request
     * parameters (url)
     *
     * @param req the request from Fastify
     * @param res the reply from Fastify
     */
    async restoreInventoryItem(req: FastifyRequest<{Params: IAccessItemParameters}>,
            rep: FastifyReply) {
        req.log.info(`${req.hostname} requested to restore inventory entry `
            + `id ${req.params.item_id}`)
        
        const deletionId = await this.invModel.getDeletionId(req.params.item_id)
        if (deletionId !== -1) {
            req.log.info(`${req.hostname} started to restore entry `
                + `id ${req.params.item_id} in inventory`)

            const wasDeleted = await this.deletionModel.delete(deletionId)
            if (!wasDeleted) {
                throw new FieldError("The deletion comment with the specified "
                        + "deletion id does not exist")
            }
        } else {
            req.log.info(`${req.hostname} tried to restore entry `
                + `id ${req.params.item_id} in inventory which is not deleted`)

            throw new FieldError("The entry with the specified id is not in "
                    + "the deleted entries")
        }
        req.log.info(`${req.hostname} successfully restored entry `
                + `id ${req.params.item_id} in inventory`)

        rep.send()
    }

    /**
     * Either updates or restores an inventory item depending on the request body
     * Only if it is empty, it is tried to be restored
     * Otherwise it is tried to be updated
     *
     * @param req the request from Fastify
     * @param res the reply from Fastify
     */
    async putExistingInventoryItem(
            req: FastifyRequest<{Params: IAccessItemParameters, Body: IUpdateItem}>,
            rep: FastifyReply) {
        const update = req.body.hasOwnProperty("name")
            || req.body.hasOwnProperty("count")

        if (update) {
            await this.updateInventoryItem(req, rep)
        } else {
            await this.restoreInventoryItem(req, rep)
        }
    }

    /**
     * Deletes an inventory item with a comment set as field in the
     * request body
     *
     * @param req the request from Fastify
     * @param res the reponse from Fastify
     */
    async deleteInventoryItem(
            req: FastifyRequest<{Params: IAccessItemParameters, Body: ICreateDeletion}>,
            rep: FastifyReply) {
        req.log.info(`${req.hostname} requested to delete inventory entry `
            + `id ${req.params.item_id}`)
        
        const deletionId = await this.invModel.getDeletionId(req.params.item_id)
    
        if (deletionId === -1) {
            throw new FieldError(`The specified entry with id ${req.params.item_id} `
                    + `does not exist`)
        } else if (deletionId > 0) {
            throw new FieldError(`The specified entry with id ${req.params.item_id} `
                    +`is already deleted`)
        }

        const insertId = await this.deletionModel.create(req.body)
        req.log.info(`${req.hostname} added a deletion comment for entry `
            + `with id ${req.params.item_id} in inventory`)

        await this.invModel.updateItem(
            { deletion_id: insertId }, req.params.item_id)
        req.log.info(`${req.hostname} marked entry with `
            + `id ${req.params.item_id} in inventory as deleted`)

        rep.send()
    }


    /**
     * Exports the inventory table as csv.
     * 
     * @param req the request from Fastify
     * @param rep the reply from Fastify
     */
    async exportInventoryAsCsv(req: FastifyRequest, rep: FastifyReply) {
        req.log.info(`${req.hostname} requested csv report of the inventory`)

        const items = await this.invModel.getAllItems()
        const file = stringify(items, {
            header: true,
            columns: ["id", "name", "count"]
        })

        rep.header("Content-Type", "text/csv")
        rep.header("Content-Disposition", "attachment; filename=\"inventory_report.csv\"")
        rep.send(file)
    }

    /**
     * Exports the inventory table as csv.
     * 
     * @param req the request from Fastify
     * @param rep the reply from Fastify
     */
    async exportDeletedInventoryAsCsv(req: FastifyRequest, rep: FastifyReply) {
        req.log.info(`${req.hostname} requested csv report of the deleted inventory`)

        const items = await this.invModel.getAllDeletedItems()
        const file = stringify(items, {
            header: true,
            columns: ["id", "name", "count", "comment"]
        })
        rep.header("Content-Type", "text/csv")
        rep.header("Content-Disposition", "attachment; filename=\"deleted_inventory_report.csv\"")
        rep.send(file)
    }

    /** Returns items that have a part of that in their name
    * 
    * @param req the request from Fastify.
    * @param res the reply from Fastify.
    */
    async getItemLike(req: FastifyRequest<{Params: ILikeItem}>, res: FastifyReply) {
        req.log.info(`${req.hostname} requested inventory items like `
            + `${req.params.name}`)

        const items = await this.invModel.getItemLike(req.params)
        res.send(items)
    }
}
