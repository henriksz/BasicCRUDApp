/**
 * Contains the ShipmentController for anything related to shipments
 */

import ShipmentModel, { ClientSideShipment } from "../models/ShipmentModel.js"
import { Request, Response, NextFunction } from "express"
import logger from "../logger.js"
import { ErrorResponse, ErrorType, handleDbError } from "../error_handling.js"
import validator from "validator"

declare global{
    namespace Express {
        interface Request {
            shipment: ClientSideShipment
        }
    }
}

/**
 * Anything about shipments is controlled here
 */
export default class ShipmentController {
    shipmentModel: ShipmentModel

    constructor(shipmentModel: ShipmentModel) {
        this.shipmentModel = shipmentModel
    }

    /**
     * Checks whether the body of the request contains a valid shipment
     * 
     * @param req the request from express.js.
     * @param res the response from express.js
     * @param next function to the next middleware
     */
    createShipmentMiddleware(req: Request, res: Response, next: NextFunction) {
        let body = req.body
        if (body.items
                && body.name
                && validator.isAlphanumeric(body.name)
                && body.destination
                && validator.isAlphanumeric(body.destination)
                && Array.isArray(body.items)
                && body.items.length > 0) {
            let allItemsValid = true
            for (let item of body.items) {
                if (typeof item !== "object"
                    || !validator.isNumeric(item.count)
                    || !validator.isNumeric(item.id)) {
                    allItemsValid = false
                    break
                }
            }

            if (allItemsValid) {
                let shipment: ClientSideShipment = {
                    name: body.name,
                    destination: body.destination,
                    items: body.items
                }

                req.shipment = shipment
                next()
                return
            }
        }

        logger.info(`${req.hostname} tried to add shipment`
        + `without valid parameters`)

        const errorBody: ErrorResponse = {
            name: ErrorType.FIELD,
            message: "Some fields of the new shipment contain invalid values"
        }

        res.status(400).send(errorBody)
    }


    /**
     * Reads all shipments.
     * 
     * @param req the request from express.js
     * @param res the respons from express.js
     */
    getAllShipments(req: Request, res: Response) {
        logger.info(`${req.hostname} requested all shipments`)

        return this.shipmentModel.getAllShipments()
        .then(results => {
            res.send(results)
        }, (error) => {
            handleDbError(error, req, res)
        })
    }


    /**
     * Creates a shipment from parameters in the request body.
     * 
     * @param req the request from express.js. Must containt a valid shipment attribute.
     * @param res the respons from express.js
     */
    createShipment(req: Request, res: Response) {
        logger.info(`${req.hostname} requested to create a shipment`)

        return this.shipmentModel.createShipment(req.shipment)
        .then(() => {
            res.send()
        }, (error) => {
            handleDbError(error, req, res)
        })
    }
}